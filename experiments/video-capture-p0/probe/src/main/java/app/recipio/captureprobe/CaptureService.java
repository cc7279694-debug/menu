package app.recipio.captureprobe;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import app.recipio.captureprobe.core.CaptureLifecycle;
import app.recipio.captureprobe.core.AudioReadPolicy;
import app.recipio.captureprobe.core.OwnedResource;
import app.recipio.captureprobe.core.ProbeFiles;
import app.recipio.captureprobe.core.ResourceScope;
import app.recipio.captureprobe.core.SignalChecks;
import app.recipio.captureprobe.core.WavSample;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

/** Resource owner. Only system-approved projection + UID-filtered playback; never microphone. */
public final class CaptureService extends Service {
    static final String START = "app.recipio.captureprobe.START", STOP = "app.recipio.captureprobe.STOP";
    static final String CHANNEL = "capture-session";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final AtomicBoolean closing = new AtomicBoolean();
    private long session;
    private HandlerThread workerThread;
    private Handler worker;
    private MediaProjection projection;
    private MediaProjection.Callback projectionCallback;
    private VirtualDisplay display;
    private final OwnedResource<ImageReader> readers = new OwnedResource<>();
    private int readerEpoch;
    private AudioRecord recorder;
    private WavSample wav;
    private ProbeFiles files;
    private int targetUid;
    private final byte[] audioBuffer = new byte[4096];
    private final Runnable timeout = () -> end("auto_stop_15s");

    static void ensureChannel(NotificationManager manager) {
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "本次屏幕采集（含停止入口）", NotificationManager.IMPORTANCE_LOW));
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        long incoming = intent.getLongExtra("session", -1);
        if (STOP.equals(intent.getAction())) {
            if (session == 0) stopSelf(); else if (session == incoming) end("user_stop");
            return START_NOT_STICKY;
        }
        if (!START.equals(intent.getAction()) || session != 0
                || incoming != ProbeRuntime.lifecycle.id() || ProbeRuntime.lifecycle.state() != CaptureLifecycle.State.STARTING) {
            if (session == 0) stopSelf();
            return START_NOT_STICKY;
        }
        session = incoming;
        NotificationManager manager = getSystemService(NotificationManager.class);
        ensureChannel(manager);
        if (!manager.areNotificationsEnabled() || manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) {
            end("notification_unavailable"); return START_NOT_STICKY;
        }
        Intent stop = new Intent(this, CaptureService.class).setAction(STOP).putExtra("session", session);
        PendingIntent stopAction = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, ProbeActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_menu_camera).setContentTitle("RECIPIO 本次采集")
                .setContentText("仅本机缓存，15 秒自动结束；点击停止可立即结束")
                .setContentIntent(open).setOngoing(true)
                .addAction(new Notification.Action.Builder(null, "停止采集", stopAction).build()).build();
        try {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            Intent grant = Build.VERSION.SDK_INT >= 33
                    ? intent.getParcelableExtra("grant", Intent.class) : intent.getParcelableExtra("grant");
            if (grant == null || checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                end("permission_or_grant_missing"); return START_NOT_STICKY;
            }
            String targetPackage = intent.getStringExtra("target");
            targetUid = getPackageManager().getApplicationInfo(targetPackage, 0).uid;
            if (getPackageManager().getPackageInfo(targetPackage, 0).sharedUserId != null) { end("declared_shared_audio_uid"); return START_NOT_STICKY; }
            String[] packages = getPackageManager().getPackagesForUid(targetUid);
            if (packages == null || packages.length != 1 || !targetPackage.equals(packages[0])) {
                end("ambiguous_audio_uid"); return START_NOT_STICKY;
            }
            projection = getSystemService(MediaProjectionManager.class).getMediaProjection(intent.getIntExtra("result", 0), grant);
            // Do not retain the consent Intent after consuming its one-shot token.
            intent.removeExtra("grant");
            if (projection == null) { end("projection_unavailable"); return START_NOT_STICKY; }
            workerThread = new HandlerThread("capture-p0-samples"); workerThread.start();
            worker = new Handler(workerThread.getLooper());
            projectionCallback = new MediaProjection.Callback() {
                @Override public void onStop() { end("system_projection_stop"); }
                @Override public void onCapturedContentResize(int width, int height) {
                    if (worker != null && !closing.get()) worker.post(() -> resize(width, height));
                }
            };
            projection.registerCallback(projectionCallback, main);
            main.postDelayed(timeout, Math.max(0, ProbeRuntime.lifecycle.deadline() - SystemClock.elapsedRealtime()));
            worker.post(this::beginCapture);
        } catch (Exception error) { end("start_failed_" + error.getClass().getSimpleName()); }
        return START_NOT_STICKY;
    }

    private void beginCapture() {
        try {
            if (closing.get() || SystemClock.elapsedRealtime() >= ProbeRuntime.lifecycle.deadline()) { endAsync("start_deadline"); return; }
            files = new ProbeFiles(getCacheDir());
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int[] size = boundedSize(metrics.widthPixels, metrics.heightPixels);
            // Exactly once per grant. Resize reuses this VirtualDisplay.
            readers.replace(() -> createReader(size[0], size[1]), candidate -> {
                display = projection.createVirtualDisplay("RECIPIO-P0", size[0], size[1], metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, candidate.getSurface(), null, worker);
                if (display == null) throw new IOException("empty display");
            });
            if (display == null || !ProbeRuntime.lifecycle.started(session)) { endAsync("display_start_failed"); return; }
            ProbeRuntime.everCaptured = true; ProbeRuntime.message = "正在采集：15 秒自动结束";
            beginPlaybackAudio();
        } catch (Exception error) { endAsync("capture_init_" + error.getClass().getSimpleName()); }
    }
    private static int[] boundedSize(int width, int height) {
        if (width <= 0 || height <= 0) throw new IllegalArgumentException("empty size");
        double factor = Math.min(1, 960d / Math.max(width, height));
        return new int[]{Math.max(1, (int) (width * factor)), Math.max(1, (int) (height * factor))};
    }
    private ImageReader createReader(int width, int height) {
        ImageReader created = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        int epoch = ++readerEpoch;
        created.setOnImageAvailableListener(source -> captureFrame(source, epoch), worker);
        return created;
    }
    private void resize(int width, int height) {
        if (closing.get() || display == null) return;
        try {
            int[] size = boundedSize(width, height);
            ImageReader previous = readers.get();
            if (previous != null && previous.getWidth() == size[0] && previous.getHeight() == size[1]) return;
            readers.replace(() -> createReader(size[0], size[1]), candidate -> {
                display.resize(size[0], size[1], getResources().getDisplayMetrics().densityDpi);
                display.setSurface(candidate.getSurface());
            });
        } catch (Exception error) { endAsync("resize_failed"); }
    }
    private void captureFrame(ImageReader source, int epoch) {
        Image image = null; Bitmap bitmap = null;
        File partial = null;
        try {
            // A resize can leave an already-queued callback from the closed previous reader.
            if (epoch != readerEpoch || closing.get()) return;
            image = source.acquireLatestImage(); // Drain continuously, even between sample slots.
            if (image == null || epoch != readerEpoch || closing.get()) return;
            int slot = ProbeRuntime.lifecycle.takeFrameSlot(session, SystemClock.elapsedRealtime());
            if (slot < 0) return;
            Image.Plane plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            int width = image.getWidth(), height = image.getHeight(), stride = plane.getRowStride(), pixel = plane.getPixelStride();
            if (pixel < 4 || stride < width * pixel) throw new IOException("unsupported RGBA stride");
            int[] colors = new int[width * height];
            int base = buffer.position(), limit = buffer.limit();
            for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
                long offset = (long) base + (long) y * stride + (long) x * pixel;
                if (offset < base || offset + 3 >= limit) throw new IOException("RGBA bounds");
                int index = (int) offset;
                colors[y * width + x] = ((buffer.get(index + 3) & 255) << 24)
                        | ((buffer.get(index) & 255) << 16) | ((buffer.get(index + 1) & 255) << 8) | (buffer.get(index + 2) & 255);
            }
            bitmap = Bitmap.createBitmap(colors, width, height, Bitmap.Config.ARGB_8888);
            partial = files.file("frame-" + slot + ".part"); File destination = files.file("frame-" + slot + ".png");
            if (!ProbeRuntime.lifecycle.maySample(session, SystemClock.elapsedRealtime())) return;
            try (FileOutputStream output = new FileOutputStream(partial)) {
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) throw new IOException("frame encode");
                output.getFD().sync();
            }
            if (closing.get() || !ProbeRuntime.lifecycle.maySample(session, SystemClock.elapsedRealtime())) return;
            if (destination.exists() || !partial.renameTo(destination)) throw new IOException("frame publish");
            partial = null; ProbeRuntime.frames++;
            if (SignalChecks.mostlyBlack(colors)) ProbeRuntime.blackFrames++;
        } catch (Exception error) { if (!closing.get()) endAsync("frame_failed_" + error.getClass().getSimpleName()); }
        finally {
            if (image != null) image.close(); if (bitmap != null) bitmap.recycle();
            if (partial != null && partial.exists() && !partial.delete()) endAsync("partial_cleanup_failed");
        }
    }
    private void beginPlaybackAudio() {
        try {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) throw new SecurityException("audio permission revoked");
            AudioPlaybackCaptureConfiguration configuration = new AudioPlaybackCaptureConfiguration.Builder(projection)
                    .addMatchingUid(targetUid).addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                    .addMatchingUsage(AudioAttributes.USAGE_GAME).addMatchingUsage(AudioAttributes.USAGE_UNKNOWN).build();
            int minimum = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            if (minimum <= 0) throw new IOException("unsupported audio format");
            recorder = new AudioRecord.Builder().setAudioFormat(new AudioFormat.Builder().setSampleRate(16000)
                            .setChannelMask(AudioFormat.CHANNEL_IN_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
                    .setBufferSizeInBytes(Math.max(minimum, 8192)).setAudioPlaybackCaptureConfig(configuration).build();
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) throw new IOException("audio unavailable");
            wav = new WavSample(files.file("audio.part"), files.file("audio.wav"));
            recorder.startRecording(); ProbeRuntime.audio = "内部播放采样中（不是麦克风）"; worker.post(audioTick);
        } catch (Exception error) {
            releaseAudio(false); ProbeRuntime.audio = "内部播放音频不可用（" + error.getClass().getSimpleName() + "）；仍检查画面";
        }
    }
    private final Runnable audioTick = new Runnable() {
        @Override public void run() {
            if (closing.get()) return;
            if (!ProbeRuntime.lifecycle.maySample(session, SystemClock.elapsedRealtime())) { endAsync("auto_stop_15s"); return; }
            try {
                int count = recorder.read(audioBuffer, 0, audioBuffer.length, AudioRecord.READ_NON_BLOCKING);
                AudioReadPolicy.Decision decision = AudioReadPolicy.decide(count);
                if (decision == AudioReadPolicy.Decision.DISABLE_AUDIO) {
                    releaseAudio(true); ProbeRuntime.audio = "内部播放读取不可用（" + count + "）；仅继续检查画面"; return;
                }
                if (decision == AudioReadPolicy.Decision.DATA && ProbeRuntime.lifecycle.maySample(session, SystemClock.elapsedRealtime())) {
                    int written = wav.append(audioBuffer, count);
                    ProbeRuntime.audioBytes += written;
                    ProbeRuntime.audioPeak = Math.max(ProbeRuntime.audioPeak, SignalChecks.peakPcm16(audioBuffer, written));
                }
                worker.postDelayed(this, 20);
            } catch (IOException error) { endAsync("audio_io_failed"); }
            catch (RuntimeException error) { releaseAudio(true); ProbeRuntime.audio = "内部播放读取已中断；仅继续检查画面"; }
        }
    };
    private void endAsync(String reason) { main.post(() -> end(reason)); }
    private void end(String reason) {
        if (session == 0 || !ProbeRuntime.lifecycle.stop(session, reason) || !closing.compareAndSet(false, true)) return;
        main.removeCallbacks(timeout); ProbeRuntime.message = "采集已停止，正在释放资源（" + reason + "）";
        // Revoke capture promptly on the main thread, independent of file encoding/cleanup.
        if (projection != null) {
            try { projection.stop(); } catch (RuntimeException error) { ProbeRuntime.message = "系统采集已中断；正在清理"; }
        }
        if (worker == null) { finishService(); return; }
        worker.removeCallbacks(audioTick);
        worker.post(() -> {
            // One failing close cannot skip the remaining resources or leave the foreground service alive.
            ResourceScope cleanup = new ResourceScope();
            cleanup.own(() -> { if (projection != null && projectionCallback != null) projection.unregisterCallback(projectionCallback); });
            cleanup.own(() -> { readerEpoch++; readers.close(); });
            cleanup.own(() -> { if (display != null) { display.release(); display = null; } });
            cleanup.own(() -> releaseAudio(true));
            if (!cleanup.release()) ProbeRuntime.cacheError = "资源清理出现异常；请结束并重启实验 App";
            main.post(this::finishService);
        });
    }
    private void releaseAudio(boolean publish) {
        AudioRecord audio = recorder; WavSample sample = wav; recorder = null; wav = null;
        ResourceScope cleanup = new ResourceScope();
        if (sample != null) cleanup.own(() -> {
            try {
                boolean valid = publish && sample.finish();
                ProbeRuntime.audio = valid ? "内部音频样本已保存；必须试听确认内容" : "没有可试听的内部音频样本";
            } catch (IOException error) { ProbeRuntime.audio = "音频文件未完成，不作为可用样本"; }
            finally { sample.close(); }
        });
        if (audio != null) cleanup.own(() -> {
            try { if (audio.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) audio.stop(); }
            finally { audio.release(); }
        });
        if (!cleanup.release()) ProbeRuntime.cacheError = "音频资源/临时文件清理失败，请结束并重启实验 App";
    }
    private void finishService() {
        if (workerThread != null) { workerThread.quitSafely(); workerThread = null; }
        ProbeRuntime.lifecycle.released(session); ProbeRuntime.message = "本次采集结束（" + ProbeRuntime.lifecycle.reason() + "）";
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf();
    }
    @Override public void onDestroy() { end("service_destroyed"); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
