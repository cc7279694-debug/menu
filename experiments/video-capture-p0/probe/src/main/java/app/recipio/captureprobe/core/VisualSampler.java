package app.recipio.captureprobe.core;
public final class VisualSampler {
    private final long start;
    private long previous=Long.MIN_VALUE;
    private int count;
    public VisualSampler(long start) { if(start<0)throw new IllegalArgumentException("start");this.start=start; }
    public int take(long now) {
        if(now<start || now-start>=120000 || count>=120 || (count>0 && now-previous<1000))return -1;
        previous=now;return count++;
    }
    public int count() { return count; }
}
