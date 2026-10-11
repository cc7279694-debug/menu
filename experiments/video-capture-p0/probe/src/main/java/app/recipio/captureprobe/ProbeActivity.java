package app.recipio.captureprobe;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaPlayer;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import app.recipio.captureprobe.core.CaptureLifecycle;
import app.recipio.captureprobe.core.ProbeFiles;
import app.recipio.captureprobe.core.SignalChecks;
import java.io.File;
import java.io.IOException;

public final class ProbeActivity extends Activity {
    private static final int PERMISSIONS = 40, PROJECTION = 41;
    private static final String[] LABELS = {"受控测试源（请先测这个）", "抖音", "小红书", "哔哩哔哩"};
    private static final String[] PACKAGES = {"app.recipio.captureprobesource", "com.ss.android.ugc.aweme", "com.xingin.xhs", "tv.danmaku.bili"};
    private final Handler ui = new Handler(Looper.getMainLooper());
    private long pendingSession = -1;
    private long reviewedSession;
    private String pendingTarget;
    private Spinner target;
    private TextView status, result;
    private Button start, stop, view, listen, delete, classify;
    private CheckBox reviewed, playbackConfirmed, videoConfirmed, audioConfirmed;
    private LinearLayout frames;
    private final java.util.ArrayList<Bitmap> displayed = new java.util.ArrayList<>();
    private MediaPlayer player;
    private final Runnable update = new Runnable() {
        @Override public void run() { render(); ui.postDelayed(this, 250); }
    };

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        reviewedSession = ProbeRuntime.lifecycle.id();
        if (saved != null) { pendingSession = saved.getLong("pendingSession", -1); pendingTarget = saved.getString("pendingTarget"); }
        ScrollView scroll = new ScrollView(this); LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL); int pad = (int) (16 * getResources().getDisplayMetrics().density); root.setPadding(pad, pad, pad, pad);
        scroll.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                root.setPadding(pad + bars.left, pad + bars.top, pad + bars.right, pad + bars.bottom);
            } else {
                root.setPadding(pad + insets.getSystemWindowInsetLeft(), pad + insets.getSystemWindowInsetTop(),
                        pad + insets.getSystemWindowInsetRight(), pad + insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        TextView heading = text(root, "RECIPIO Video Capture Probe"); heading.setTextSize(24);
        text(root, "仅采集本次授权的画面与所选 App 内部声音，不录麦克风、不联网、不上传。15 秒自动结束。\n"
                + "Android 14+ 请在系统授权页选【单个应用】，且必须选与下方一致的 App。旧系统会采集整个屏幕，请避开私人通知。\n"
                + "屏幕选项不等于声音授权；目标 App 可以禁止采集。先验证受控测试源，再测第三方平台。");
        target = new Spinner(this); target.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, LABELS));
        if (saved != null) target.setSelection(saved.getInt("selected", 0)); root.addView(target);
        start = button(root, "开始本次采集（请求系统授权）", v -> requestSession());
        stop = button(root, "取消授权 / 结束采集", v -> {
            if (ProbeRuntime.lifecycle.state() == CaptureLifecycle.State.CONSENT) {
                long id = ProbeRuntime.lifecycle.id();
                if (ProbeRuntime.lifecycle.stop(id, "user_cancel_consent")) ProbeRuntime.lifecycle.released(id);
                ProbeRuntime.message = "本次授权已取消；不会采集"; render();
            } else startService(new Intent(this, CaptureService.class).setAction(CaptureService.STOP).putExtra("session", ProbeRuntime.lifecycle.id()));
        });
        status = text(root, "尚未采集");
        view = button(root, "查看画面样本", v -> showFrames());
        listen = button(root, "试听内部声音样本", v -> playAudio());
        frames = new LinearLayout(this); frames.setOrientation(LinearLayout.VERTICAL); root.addView(frames);
        reviewed = check(root, "我已实际查看样本并试听（或确认无可试听样本）", ProbeRuntime.reviewed);
        playbackConfirmed = check(root, "我确认授权范围与所选目标一致，目标视频/受控源确实在采集期间播放", ProbeRuntime.playbackConfirmed);
        videoConfirmed = check(root, "画面确实是所选目标的动态内容，不是黑屏或错误应用", ProbeRuntime.videoConfirmed);
        audioConfirmed = check(root, "声音确实是目标视频口播；受控源则应听到交替高低音", ProbeRuntime.audioConfirmed);
        classify = button(root, "记录本次人工判断（不自动认定平台支持）", v -> {
            if (reviewedSession != ProbeRuntime.lifecycle.id()) { syncReviewSession(); result.setText("采集轮次已变化，请重新检查本次样本"); return; }
            ProbeRuntime.reviewed = reviewed.isChecked(); ProbeRuntime.playbackConfirmed = playbackConfirmed.isChecked();
            ProbeRuntime.videoConfirmed = videoConfirmed.isChecked(); ProbeRuntime.audioConfirmed = audioConfirmed.isChecked();
            result.setText(ProbeRuntime.reviewed ? ProbeRuntime.target + "：" + SignalChecks.classificationForSession(ProbeRuntime.lifecycle.id(), reviewedSession,
                    ProbeRuntime.everCaptured, ProbeRuntime.playbackConfirmed, ProbeRuntime.reviewed, ProbeRuntime.videoConfirmed, ProbeRuntime.audioConfirmed)
                    : "请先实际检查样本，再勾选审核确认。未经采集/检查仍为 NOT_TESTED。");
        });
        result = text(root, "结果：NOT_TESTED（每个目标需单独测试并记录）");
        delete = button(root, "删除本次全部结果", v -> clearResults());
        text(root, "样本仅存在实验 App 私有缓存，退出后再次冷启动会清理。先记录结果再退出；不向开发者发送私人图片或声音。\n"
                + "受控测试源是另一个独立 App；请手动切换到它。若来电或系统中断，请结束本次并重新授权，不复用授权。");
        scroll.addView(root); setContentView(scroll); render();
    }
    private TextView text(LinearLayout root, String value) {
        TextView text = new TextView(this); text.setText(value); text.setTextSize(16); text.setPadding(0, 12, 0, 12); root.addView(text); return text;
    }
    private Button button(LinearLayout root, String label, android.view.View.OnClickListener listener) {
        Button button = new Button(this); button.setText(label); button.setOnClickListener(listener); root.addView(button); return button;
    }
    private CheckBox check(LinearLayout root, String label, boolean checked) {
        CheckBox box = new CheckBox(this); box.setText(label); box.setChecked(checked); root.addView(box); return box;
    }
    private boolean busy() {
        CaptureLifecycle.State state = ProbeRuntime.lifecycle.state();
        return state != CaptureLifecycle.State.IDLE && state != CaptureLifecycle.State.DONE;
    }
    private void requestSession() {
        if (busy()) return;
        if (!ProbeRuntime.cacheError.isEmpty()) { result.setText(ProbeRuntime.cacheError); return; }
        releasePlayer(); clearFrames();
        try { new ProbeFiles(getCacheDir()).clear(); } catch (IOException error) { result.setText("无法清理上次缓存；不会开始新采集"); return; }
        pendingTarget = PACKAGES[target.getSelectedItemPosition()];
        try {
            int uid = getPackageManager().getApplicationInfo(pendingTarget, 0).uid;
            if (getPackageManager().getPackageInfo(pendingTarget, 0).sharedUserId != null) { result.setText("目标声明共用 UID，无法安全隔离，本轮不开始"); return; }
            String[] siblings = getPackageManager().getPackagesForUid(uid);
            if (siblings == null || siblings.length != 1 || !pendingTarget.equals(siblings[0])) { result.setText("目标共用声音 UID，无法安全隔离，本轮不开始"); return; }
        } catch (PackageManager.NameNotFoundException error) { result.setText("请先安装所选测试 App；不支持用其他 App 的声音替代"); return; }
        pendingSession = ProbeRuntime.lifecycle.beginConsent();
        if (pendingSession < 0) return;
        reviewedSession = pendingSession;
        ProbeRuntime.reset(LABELS[target.getSelectedItemPosition()]);
        reviewed.setChecked(false); playbackConfirmed.setChecked(false); videoConfirmed.setChecked(false); audioConfirmed.setChecked(false); result.setText("结果：NOT_TESTED");
        java.util.ArrayList<String> needed = new java.util.ArrayList<>();
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.POST_NOTIFICATIONS);
        if (!needed.isEmpty()) requestPermissions(needed.toArray(new String[0]), PERMISSIONS); else requestProjection();
    }
    private void requestProjection() {
        if (pendingSession != ProbeRuntime.lifecycle.id() || ProbeRuntime.lifecycle.state() != CaptureLifecycle.State.CONSENT) return;
        NotificationManager manager = getSystemService(NotificationManager.class); CaptureService.ensureChannel(manager);
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED || !manager.areNotificationsEnabled()
                || manager.getNotificationChannel(CaptureService.CHANNEL).getImportance() == 0) { cancelConsent("permission_denied"); return; }
        try { startActivityForResult(getSystemService(MediaProjectionManager.class).createScreenCaptureIntent(), PROJECTION); }
        catch (RuntimeException error) { cancelConsent("consent_unavailable"); }
    }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(request, permissions, results); if (request == PERMISSIONS) requestProjection();
    }
    @Override public void onActivityResult(int request, int code, Intent data) {
        super.onActivityResult(request, code, data);
        if (request != PROJECTION) return;
        if (code != RESULT_OK || data == null) { cancelConsent("consent_denied"); return; }
        if (!ProbeRuntime.lifecycle.grant(pendingSession, android.os.SystemClock.elapsedRealtime())) return;
        try {
            startForegroundService(new Intent(this, CaptureService.class).setAction(CaptureService.START)
                    .putExtra("session", pendingSession).putExtra("target", pendingTarget).putExtra("result", code).putExtra("grant", data));
        } catch (RuntimeException error) { cancelConsent("foreground_start_failed"); }
        render();
    }
    private void cancelConsent(String reason) {
        if (ProbeRuntime.lifecycle.stop(pendingSession, reason)) ProbeRuntime.lifecycle.released(pendingSession);
        ProbeRuntime.message = "本次未采集（" + reason + "），重新开始须重新授权"; render();
    }
    private void render() {
        syncReviewSession();
        boolean active = busy(); start.setEnabled(!active); target.setEnabled(!active);
        stop.setEnabled(active && ProbeRuntime.lifecycle.state() != CaptureLifecycle.State.STOPPING);
        view.setEnabled(!active && ProbeRuntime.frames > 0); listen.setEnabled(!active && ProbeRuntime.audioBytes > 0);
        delete.setEnabled(!active); classify.setEnabled(!active && ProbeRuntime.everCaptured);
        reviewed.setEnabled(!active); playbackConfirmed.setEnabled(!active); videoConfirmed.setEnabled(!active && ProbeRuntime.frames > 0); audioConfirmed.setEnabled(!active && ProbeRuntime.audioBytes > 0);
        status.setText(ProbeRuntime.target + "\n" + ProbeRuntime.message + "\n" + ProbeRuntime.audio
                + "\n画面 " + ProbeRuntime.frames + " 张；疑似黑屏 " + ProbeRuntime.blackFrames + " 张"
                + "\n音频字节 " + ProbeRuntime.audioBytes + "；峰值 " + ProbeRuntime.audioPeak
                + (ProbeRuntime.audioBytes > 0 && ProbeRuntime.audioPeak < 100 ? "（疑似静音）" : "")
                + "\n信号非零不代表正确口播，必须人工试听。" + ProbeRuntime.cacheError);
    }
    private void syncReviewSession() {
        long current = ProbeRuntime.lifecycle.id();
        if (reviewedSession == current) return;
        reviewedSession = current;
        reviewed.setChecked(false); playbackConfirmed.setChecked(false); videoConfirmed.setChecked(false); audioConfirmed.setChecked(false);
        ProbeRuntime.reviewed = ProbeRuntime.playbackConfirmed = ProbeRuntime.videoConfirmed = ProbeRuntime.audioConfirmed = false;
        releasePlayer(); clearFrames(); result.setText("结果：NOT_TESTED（新轮次必须重新检查）");
    }
    private void clearFrames() { frames.removeAllViews(); for (Bitmap bitmap : displayed) bitmap.recycle(); displayed.clear(); }
    private void showFrames() {
        clearFrames();
        try {
            ProbeFiles files = new ProbeFiles(getCacheDir());
            for (int i = 0; i < 3; i++) {
                File file = files.file("frame-" + i + ".png"); if (!file.exists()) continue;
                Bitmap image = BitmapFactory.decodeFile(file.getAbsolutePath());
                if (image == null) { result.setText("画面文件不可读"); continue; }
                displayed.add(image); ImageView view = new ImageView(this); view.setAdjustViewBounds(true); view.setImageBitmap(image); frames.addView(view);
            }
        } catch (IOException error) { result.setText("画面读取失败"); }
    }
    private void playAudio() {
        releasePlayer();
        try {
            File audio = new ProbeFiles(getCacheDir()).file("audio.wav");
            if (!audio.isFile()) { result.setText("没有已完成的声音样本"); return; }
            player = new MediaPlayer(); player.setDataSource(audio.getAbsolutePath()); player.prepare();
            player.setOnCompletionListener(p -> releasePlayer()); player.start();
        } catch (IOException | RuntimeException error) { releasePlayer(); result.setText("声音样本无法试听"); }
    }
    private void releasePlayer() { if (player != null) { player.release(); player = null; } }
    private void clearResults() {
        releasePlayer(); clearFrames();
        try { new ProbeFiles(getCacheDir()).clear(); ProbeRuntime.cacheError = ""; ProbeRuntime.reset(""); result.setText("本次结果已删除；NOT_TESTED"); }
        catch (IOException error) { result.setText("清理失败；请重试，采集已停止"); }
        render();
    }
    @Override protected void onSaveInstanceState(Bundle saved) {
        saved.putLong("pendingSession", pendingSession); saved.putString("pendingTarget", pendingTarget); saved.putInt("selected", target.getSelectedItemPosition());
        if (reviewedSession == ProbeRuntime.lifecycle.id()) {
            ProbeRuntime.reviewed = reviewed.isChecked(); ProbeRuntime.playbackConfirmed = playbackConfirmed.isChecked();
            ProbeRuntime.videoConfirmed = videoConfirmed.isChecked(); ProbeRuntime.audioConfirmed = audioConfirmed.isChecked();
        }
        super.onSaveInstanceState(saved);
    }
    @Override protected void onResume() { super.onResume(); ui.post(update); }
    @Override protected void onPause() { ui.removeCallbacks(update); releasePlayer(); super.onPause(); }
    @Override protected void onDestroy() {
        if (ProbeRuntime.lifecycle.ownerFinished(pendingSession, isFinishing())) ProbeRuntime.message = "授权页面已退出；本次未采集";
        clearFrames(); super.onDestroy();
    }
}
