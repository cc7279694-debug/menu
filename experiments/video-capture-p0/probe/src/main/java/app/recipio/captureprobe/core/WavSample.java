package app.recipio.captureprobe.core;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

public final class WavSample implements AutoCloseable {
    public static final int MAX_PCM_BYTES = 16000 * 2 * 15;
    private final File partial, destination;
    private RandomAccessFile output;
    private int written;
    private boolean published;
    public WavSample(File partial, File destination) throws IOException {
        if (partial.equals(destination) || destination.exists()) throw new IOException("destination already exists");
        this.partial = partial; this.destination = destination;
        output = new RandomAccessFile(partial, "rw");
        try { output.setLength(0); output.write(new byte[44]); }
        catch (IOException error) { close(); throw error; }
    }
    public int append(byte[] bytes, int count) throws IOException {
        if (count < 0 || count > bytes.length || count % 2 != 0) throw new IllegalArgumentException("PCM16 bounds");
        if (output == null) throw new IOException("sample closed");
        int accepted = Math.min(count, MAX_PCM_BYTES - written);
        output.write(bytes, 0, accepted); written += accepted; return accepted;
    }
    public boolean finish() throws IOException {
        if (published) return true;
        if (output == null) return false;
        if (written == 0) { close(); return false; }
        ByteBuffer header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN);
        header.put("RIFF".getBytes(StandardCharsets.US_ASCII)).putInt(36 + written);
        header.put("WAVEfmt ".getBytes(StandardCharsets.US_ASCII)).putInt(16).putShort((short) 1).putShort((short) 1);
        header.putInt(16000).putInt(32000).putShort((short) 2).putShort((short) 16);
        header.put("data".getBytes(StandardCharsets.US_ASCII)).putInt(written);
        output.seek(0); output.write(header.array()); output.getFD().sync(); output.close(); output = null;
        if (destination.exists() || !partial.renameTo(destination)) throw new IOException("WAV publish failed");
        published = true; return true;
    }
    @Override public void close() throws IOException {
        try { if (output != null) { output.close(); output = null; } }
        finally { if (!published && partial.exists() && !partial.delete()) throw new IOException("partial cleanup failed"); }
    }
}
