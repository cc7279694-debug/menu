package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.Files;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class LocalImageCopyTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    @Test public void copiesToPrivateUuidPathAndKeepsExactBytes() throws Exception {
        File root = folder.newFolder();
        byte[] bytes = {1, 2, 3, 4};
        String path = LocalImageCopy.copy(root, new ByteArrayInputStream(bytes), "image/png");
        assertTrue(path.matches("images/[a-f0-9-]+\\.png"));
        assertArrayEquals(bytes, Files.readAllBytes(new File(root, path).toPath()));
        assertEquals(1, new File(root, "images").list().length);
    }
    @Test public void supportsOnlyCurrentRecipeImageFormats() throws Exception {
        String[] mimes = {"image/jpeg", "image/png", "image/webp", "image/avif"};
        String[] extensions = {"jpg", "png", "webp", "avif"};
        for (int i = 0; i < mimes.length; i++) {
            String path = LocalImageCopy.copy(folder.newFolder(), new ByteArrayInputStream(new byte[] {1}), mimes[i]);
            assertTrue(path.endsWith("." + extensions[i]));
        }
    }
    @Test public void rejectsUnsupportedMimeBeforeCreatingFiles() throws Exception {
        File root = folder.newFolder();
        assertThrows(IOException.class, () -> LocalImageCopy.copy(root, new ByteArrayInputStream(new byte[] {1}), "image/svg+xml"));
        assertEquals(0, root.list().length);
    }
    @Test public void rejectsEmptyContentAndRemovesItsPartialFile() throws Exception {
        File root = folder.newFolder();
        assertThrows(IOException.class, () -> LocalImageCopy.copy(root, new ByteArrayInputStream(new byte[0]), "image/png"));
        assertEquals(0, new File(root, "images").list().length);
    }
    @Test public void interruptedReadCleansPartialAndPreservesExistingImages() throws Exception {
        File root = folder.newFolder();
        File images = new File(root, "images");
        assertTrue(images.mkdir());
        File old = new File(images, "old.png");
        Files.write(old.toPath(), new byte[] {9});
        InputStream broken = new InputStream() {
            int reads;
            @Override public int read() throws IOException {
                if (reads++ > 0) throw new IOException("source lost");
                return 1;
            }
            @Override public int read(byte[] bytes, int off, int length) throws IOException {
                bytes[off] = (byte) read();
                return 1;
            }
        };
        assertThrows(IOException.class, () -> LocalImageCopy.copy(root, broken, "image/png"));
        assertArrayEquals(new String[] {"old.png"}, images.list());
        assertArrayEquals(new byte[] {9}, Files.readAllBytes(old.toPath()));
    }
    @Test public void enforcesActualRemainingSpaceRatherThanProviderSizeMetadata() throws Exception {
        File root = folder.newFolder();
        assertThrows(IOException.class, () -> LocalImageCopy.copy(root, new ByteArrayInputStream(new byte[] {1,2,3,4,5}), "image/png", 4));
        assertEquals(0, new File(root, "images").list().length);
    }
}
