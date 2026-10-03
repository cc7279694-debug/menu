package app.recipio.local;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/** Copies only a newly selected image; never replaces an existing recipe file. */
final class LocalImageCopy {
    private static final long STORAGE_RESERVE = 32L * 1024 * 1024;

    static String copy(File dataDirectory, InputStream source, String mime) throws IOException {
        // No fixed image-size limit. Leave room for the database and other app writes.
        return copy(dataDirectory, source, mime, Math.max(0, dataDirectory.getUsableSpace() - STORAGE_RESERVE));
    }

    static String copy(File dataDirectory, InputStream source, String mime, long budget) throws IOException {
        String extension;
        if ("image/jpeg".equals(mime)) extension = "jpg";
        else if ("image/png".equals(mime)) extension = "png";
        else if ("image/webp".equals(mime)) extension = "webp";
        else if ("image/avif".equals(mime)) extension = "avif";
        else {
            source.close();
            throw new IOException("Unsupported image format");
        }
        String path = "images/" + UUID.randomUUID() + "." + extension;
        File target = new File(dataDirectory, path);
        File directory = target.getParentFile();
        File partial = new File(directory, target.getName() + ".part");
        boolean created = false;
        boolean committed = false;
        try (InputStream input = source) {
            if ((!directory.isDirectory() && !directory.mkdirs()) || !partial.createNewFile())
                throw new IOException("Cannot create image file");
            created = true;
            long total = 0;
            try (FileOutputStream output = new FileOutputStream(partial)) {
                byte[] buffer = new byte[65536];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (count == 0) throw new IOException("Image source stalled");
                    if (total > budget - count) throw new IOException("Insufficient device space");
                    output.write(buffer, 0, count);
                    total += count;
                }
                if (total == 0) throw new IOException("Empty image");
                output.getFD().sync();
            }
        } catch (IOException | RuntimeException error) {
            if (created && partial.exists() && !partial.delete())
                error.addSuppressed(new IOException("Cannot remove incomplete image"));
            throw error;
        }
        try {
            if (!partial.renameTo(target)) throw new IOException("Cannot commit image file");
            committed = true;
            return path;
        } finally {
            if (!committed && partial.exists() && !partial.delete())
                throw new IOException("Cannot remove incomplete image");
        }
    }
}
