package app.recipio.captureprobe;

import app.recipio.captureprobe.core.CaptureLifecycle;

/** Process-local observation; no projection token, URI or user content persisted. */
final class ProbeRuntime {
    static final CaptureLifecycle lifecycle = new CaptureLifecycle(android.os.SystemClock.elapsedRealtimeNanos());
    static volatile String target = "", message = "尚未采集", audio = "未开始", cacheError = "";
    static volatile int frames, blackFrames, audioBytes, audioPeak;
    static volatile boolean everCaptured, reviewed, playbackConfirmed, videoConfirmed, audioConfirmed;
    private ProbeRuntime() { }
    static void reset(String selected) {
        target = selected; message = "等待本次系统授权"; audio = "未开始";
        frames = blackFrames = audioBytes = audioPeak = 0;
        everCaptured = reviewed = playbackConfirmed = videoConfirmed = audioConfirmed = false;
    }
}
