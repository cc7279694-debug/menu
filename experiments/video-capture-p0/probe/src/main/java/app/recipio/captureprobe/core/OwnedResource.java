package app.recipio.captureprobe.core;

/** Replaces a resource only after successful attachment, retaining ownership on failure. */
public final class OwnedResource<T extends AutoCloseable> implements AutoCloseable {
    public interface Factory<T> { T create() throws Exception; }
    public interface Attacher<T> { void attach(T resource) throws Exception; }
    private T current;
    public T get() { return current; }
    public void replace(Factory<T> factory, Attacher<T> attach) throws Exception {
        T next = factory.create();
        if (next == null) throw new IllegalStateException("empty resource");
        try { attach.attach(next); }
        catch (Exception error) {
            try { next.close(); } catch (Exception cleanup) { error.addSuppressed(cleanup); }
            throw error;
        }
        T previous = current; current = next;
        if (previous != null) previous.close();
    }
    @Override public void close() throws Exception {
        T previous = current; current = null;
        if (previous != null) previous.close();
    }
}
