package app.recipio.captureprobe.core;

public final class ResourceScope {
    private final java.util.ArrayDeque<AutoCloseable> resources = new java.util.ArrayDeque<>();
    private boolean released, success = true;
    public synchronized void own(AutoCloseable resource) {
        if (released) throw new IllegalStateException("scope closed");
        resources.push(resource);
    }
    public synchronized boolean release() {
        if (released) return success;
        released = true;
        while (!resources.isEmpty()) {
            try { resources.pop().close(); } catch (Exception error) { success = false; }
        }
        return success;
    }
}
