package app.recipio.captureprobe.core;

public final class AudioReadPolicy {
    public enum Decision { DATA, AGAIN, DISABLE_AUDIO }
    private AudioReadPolicy() { }
    public static Decision decide(int count) {
        if (count < 0) return Decision.DISABLE_AUDIO;
        return count == 0 ? Decision.AGAIN : Decision.DATA;
    }
}
