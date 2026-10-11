package app.recipio.captureprobesource;

import android.app.Activity;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;

/** Self-generated, cross-UID control. No media, network or user content. */
public final class SourceActivity extends Activity {
    private final Handler ui = new Handler(Looper.getMainLooper());
    private AudioTrack track;
    private View pattern;
    private boolean allowed = true;
    private String toneError = "";
    private long sceneStart;
    private final Runnable animate = new Runnable() {
        @Override public void run() { pattern.invalidate(); ui.postDelayed(this, 100); }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        sceneStart=state==null?SystemClock.elapsedRealtime():state.getLong("sceneStart",SystemClock.elapsedRealtime());
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                root.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        Button policy = new Button(this);
        policy.setText("允许采集：动态画面 + 交替高低音（点击切换为禁止音频）");
        policy.setOnClickListener(v -> {
            allowed = !allowed;
            policy.setText(allowed ? "允许采集：动态画面 + 交替高低音" : "禁止音频采集：画面仍正常（负向对照）");
            stopTone(); startTone();
        });
        root.addView(policy);
        Button restart=new Button(this);restart.setText("重新开始六步骤画面（每场景 20 秒）");
        restart.setOnClickListener(v->{sceneStart=SystemClock.elapsedRealtime();pattern.invalidate();});root.addView(restart);
        pattern = new View(this) {
            private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            @Override protected void onDraw(Canvas canvas) {
                long t = SystemClock.elapsedRealtime();
                canvas.drawColor(Color.HSVToColor(new float[]{(t / 20f) % 360, .65f, .8f}));
                paint.setColor(Color.WHITE); paint.setTextSize(30 * getResources().getDisplayMetrics().scaledDensity);
                canvas.drawText("RECIPIO 自生成测试画面", 24, 100, paint);
                int scene=RecipeScenes.index(t-sceneStart);String[] lines=RecipeScenes.lines(scene);
                paint.setTextSize(Math.min(30 * getResources().getDisplayMetrics().scaledDensity, getWidth()/13f));
                for(int i=0;i<lines.length;i++)canvas.drawText(lines[i],24,190+i*80,paint);
                paint.setTextSize(18 * getResources().getDisplayMetrics().scaledDensity);
                canvas.drawText("P1 只采集画面 / "+Math.max(0,(t-sceneStart)/1000)+" 秒",24,450,paint);
                if (!toneError.isEmpty()) canvas.drawText(toneError,24,500,paint);
                float x = 35 + (t % 4000) / 4000f * Math.max(1, getWidth() - 70);
                canvas.drawCircle(x, getHeight() * .6f, 32, paint);
            }
        };
        root.addView(pattern, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
    }

    private void startTone() {
        try { startGeneratedTone(); toneError = ""; }
        catch (RuntimeException error) { toneError = "受控声音不可用：" + error.getClass().getSimpleName(); stopTone(); }
    }
    private void startGeneratedTone() {
        // One generated two-second loop: 440 Hz followed by 880 Hz.
        int rate = 16000;
        short[] pcm = new short[rate * 2];
        for (int i = 0; i < pcm.length; i++) {
            int frequency = i < rate ? 440 : 880;
            pcm[i] = (short) (Math.sin(2 * Math.PI * frequency * i / rate) * 5000);
        }
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setAllowedCapturePolicy(allowed ? AudioAttributes.ALLOW_CAPTURE_BY_ALL : AudioAttributes.ALLOW_CAPTURE_BY_NONE)
                .build();
        track = new AudioTrack.Builder().setAudioAttributes(attributes)
                .setAudioFormat(new AudioFormat.Builder().setSampleRate(rate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
                .setBufferSizeInBytes(pcm.length * 2).setTransferMode(AudioTrack.MODE_STATIC).build();
        if (track.getState() != AudioTrack.STATE_INITIALIZED || track.write(pcm, 0, pcm.length) != pcm.length) {
            throw new IllegalStateException("generated audio not initialized");
        }
        track.setLoopPoints(0, pcm.length, -1); track.play();
    }

    private void stopTone() {
        AudioTrack previous = track; track = null;
        if (previous == null) return;
        try { if (previous.getState() == AudioTrack.STATE_INITIALIZED && previous.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) previous.stop(); }
        catch (RuntimeException error) { toneError = "受控声音已中断"; }
        finally { previous.release(); }
    }
    @Override protected void onResume() { super.onResume(); startTone(); ui.post(animate); }
    @Override protected void onPause() { ui.removeCallbacks(animate); stopTone(); super.onPause(); }
    @Override protected void onSaveInstanceState(Bundle saved){saved.putLong("sceneStart",sceneStart);super.onSaveInstanceState(saved);}
}
