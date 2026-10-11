package app.recipio.captureprobe;

import app.recipio.captureprobe.core.CaptureLifecycle;

/** Process-local observation; no projection token, URI or user content persisted. */
final class ProbeRuntime {
    static final CaptureLifecycle lifecycle = new CaptureLifecycle(android.os.SystemClock.elapsedRealtimeNanos(),120000);
    static final app.recipio.captureprobe.core.FrameSelection selection=new app.recipio.captureprobe.core.FrameSelection();
    private static final java.util.List<app.recipio.captureprobe.core.VisualFrame> candidates=new java.util.ArrayList<>();
    static synchronized java.util.List<app.recipio.captureprobe.core.VisualFrame> candidates(){return new java.util.ArrayList<>(candidates);}
    static synchronized void add(app.recipio.captureprobe.core.VisualFrame frame){candidates.add(frame);}
    static synchronized void suggest(){selection.clear();for(var f:app.recipio.captureprobe.core.FrameSuggestions.choose(candidates))selection.add(f.id);}
    static volatile String target = "", message = "尚未采集", audio = "未开始", cacheError = "";
    static volatile int frames, blackFrames, audioBytes, audioPeak;
    static volatile boolean everCaptured, reviewed, playbackConfirmed, videoConfirmed, audioConfirmed;
    private ProbeRuntime() { }
    static void reset(String selected) {
        target = selected; message = "等待本次系统授权"; audio = "未开始";
        frames = blackFrames = audioBytes = audioPeak = 0;
        everCaptured = reviewed = playbackConfirmed = videoConfirmed = audioConfirmed = false;
        synchronized(ProbeRuntime.class){candidates.clear();selection.clear();}
    }
}
