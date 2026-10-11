package app.recipio.captureprobe.core;

/** Small immutable descriptor, never holds pixels or Android Bitmap objects. */
public final class VisualFrame {
    public final int id;
    public final long millis, hash;
    public final double clarity;
    public final boolean useful;
    public VisualFrame(int id,long millis,long hash,double clarity,boolean useful) {
        this.id=id;this.millis=millis;this.hash=hash;this.clarity=clarity;this.useful=useful;
    }
}
