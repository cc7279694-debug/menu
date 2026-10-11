package app.recipio.captureprobe.core;

import java.io.File;
import java.io.IOException;

public final class ProbeFiles {
    private final File root;
    public ProbeFiles(File cache) throws IOException {
        File parent = cache.getCanonicalFile();
        root = new File(parent, "video-capture-p0");
        if (!root.getCanonicalFile().equals(root) || !root.getCanonicalFile().getParentFile().equals(parent)) throw new IOException("cache containment");
        if ((!root.exists() && !root.mkdir()) || !root.isDirectory()) throw new IOException("cache unavailable");
    }
    public File file(String name) throws IOException {
        if (name == null || !name.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,79}") || name.contains("..")) throw new IOException("invalid sample name");
        File file = new File(root, name);
        if (!file.getCanonicalFile().equals(file) || !file.getCanonicalFile().getParentFile().equals(root)) throw new IOException("sample containment");
        return file;
    }
    public void clear() throws IOException {
        File[] entries = root.listFiles();
        if (entries == null) throw new IOException("cache list failed");
        for (File entry : entries) {
            File safe = file(entry.getName());
            if (!safe.isFile() || !safe.delete()) throw new IOException("sample cleanup failed");
        }
    }
}
