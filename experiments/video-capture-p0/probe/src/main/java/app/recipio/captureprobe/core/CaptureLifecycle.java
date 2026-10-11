package app.recipio.captureprobe.core;

/** Sole session authority, using monotonic time; never stores projection tokens. */
public final class CaptureLifecycle {
    public enum State { IDLE, CONSENT, STARTING, CAPTURING, STOPPING, DONE }
    public static final long DURATION_MILLIS = 15000;
    private State state = State.IDLE;
    private long id, start, deadline;
    private String reason = "";
    private int nextFrame;
    public CaptureLifecycle() { this(0); }
    public CaptureLifecycle(long seed) {
        if (seed < 0 || seed == Long.MAX_VALUE) throw new IllegalArgumentException("session seed");
        id = seed;
    }
    public synchronized long beginConsent() {
        if (state != State.IDLE && state != State.DONE) return -1;
        id++; state = State.CONSENT; reason = ""; nextFrame = 0; deadline = 0; return id;
    }
    public synchronized boolean ownerFinished(long session, boolean finishing) {
        if (!finishing || session != id || state != State.CONSENT) return false;
        stop(session, "consent_owner_finished"); released(session); return true;
    }
    public synchronized boolean grant(long session, long elapsed) {
        if (session != id || state != State.CONSENT || elapsed < 0 || elapsed > Long.MAX_VALUE - DURATION_MILLIS) return false;
        start = elapsed; deadline = elapsed + DURATION_MILLIS; state = State.STARTING; return true;
    }
    public synchronized boolean started(long session) {
        if (session != id || state != State.STARTING) return false;
        state = State.CAPTURING; return true;
    }
    public synchronized boolean maySample(long session, long elapsed) {
        return session == id && state == State.CAPTURING && elapsed >= start && elapsed < deadline;
    }
    public synchronized boolean stop(long session, String why) {
        if (session != id || id == 0 || state == State.IDLE || state == State.DONE || state == State.STOPPING) return false;
        state = State.STOPPING; reason = why; return true;
    }
    public synchronized void released(long session) { if (session == id && state == State.STOPPING) state = State.DONE; }
    public synchronized State state() { return state; }
    public synchronized long id() { return id; }
    public synchronized long deadline() { return deadline; }
    public synchronized String reason() { return reason; }
    public synchronized int takeFrameSlot(long session, long elapsed) {
        if (!maySample(session, elapsed) || nextFrame >= 3) return -1;
        long due = start + new long[]{2000, 7000, 12000}[nextFrame];
        return elapsed >= due ? nextFrame++ : -1;
    }
}
