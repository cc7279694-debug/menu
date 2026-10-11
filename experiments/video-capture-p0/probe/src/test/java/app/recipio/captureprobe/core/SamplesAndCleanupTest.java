package app.recipio.captureprobe.core;

import org.junit.Test;
import org.junit.Rule;
import org.junit.rules.TemporaryFolder;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import static org.junit.Assert.*;

public class SamplesAndCleanupTest {
    @Rule public TemporaryFolder temp = new TemporaryFolder();
    @Test public void cacheCleanupPreservesSiblingData() throws Exception {
        File cache = temp.newFolder(); File unrelated = new File(cache, "other-data"); Files.write(unrelated.toPath(), new byte[]{1});
        ProbeFiles files = new ProbeFiles(cache); Files.write(files.file("frame-0.png").toPath(), new byte[]{2});
        files.clear(); assertTrue(unrelated.exists()); assertFalse(files.file("frame-0.png").exists());
    }
    @Test public void pathTraversalIsRefused() throws Exception {
        ProbeFiles files = new ProbeFiles(temp.newFolder());
        for (String name : new String[]{"../escape", "a/b", "a\\b", "/abs", "..", ""}) {
            try { files.file(name); fail(name); } catch (IOException expected) { assertNotNull(expected); }
        }
    }
    @Test public void coldRestartCleansStalePartialAndFinalSamples() throws Exception {
        File cache = temp.newFolder(); ProbeFiles first = new ProbeFiles(cache);
        Files.write(first.file("audio.part").toPath(), new byte[]{1});
        Files.write(first.file("frame-2.png").toPath(), new byte[]{2});
        new ProbeFiles(cache).clear(); assertFalse(first.file("audio.part").exists()); assertFalse(first.file("frame-2.png").exists());
    }
    @Test public void wavIsPrivateUntilFinalizedAndHeaderMatchesBytes() throws Exception {
        File part = temp.newFile("audio.part"), wav = new File(temp.getRoot(), "audio.wav");
        try (WavSample sample = new WavSample(part, wav)) {
            assertEquals(4, sample.append(new byte[]{1, 2, 3, 4}, 4)); assertFalse(wav.exists()); assertTrue(sample.finish());
        }
        byte[] data = Files.readAllBytes(wav.toPath()); assertEquals(48, data.length);
        assertEquals("RIFF", new String(Arrays.copyOfRange(data, 0, 4), java.nio.charset.StandardCharsets.US_ASCII));
        assertEquals(4, data[40]); assertEquals(1, data[44]); assertFalse(part.exists());
    }
    @Test public void wavPcmIsHardBoundedEvenIfTimerDelayed() throws Exception {
        File part = temp.newFile(), wav = new File(temp.getRoot(), "bounded.wav");
        try (WavSample sample = new WavSample(part, wav)) {
            byte[] bytes = new byte[WavSample.MAX_PCM_BYTES + 100];
            assertEquals(WavSample.MAX_PCM_BYTES, sample.append(bytes, bytes.length)); assertEquals(0, sample.append(bytes, 100));
            assertTrue(sample.finish());
        }
        assertEquals(WavSample.MAX_PCM_BYTES + 44, wav.length());
    }
    @Test public void abortedWavDoesNotLeavePlayableFileOrPartial() throws Exception {
        File part = temp.newFile(), wav = new File(temp.getRoot(), "cancel.wav");
        try (WavSample sample = new WavSample(part, wav)) { sample.append(new byte[]{1, 2}, 2); }
        assertFalse(part.exists()); assertFalse(wav.exists());
    }
    @Test public void emptyAudioIsNotPublished() throws Exception {
        File part = temp.newFile(), wav = new File(temp.getRoot(), "empty.wav");
        try (WavSample sample = new WavSample(part, wav)) { assertFalse(sample.finish()); }
        assertFalse(part.exists()); assertFalse(wav.exists());
    }
    @Test public void oddOrOutOfBoundsPcmIsRejected() throws Exception {
        try (WavSample sample = new WavSample(temp.newFile(), new File(temp.getRoot(), "odd.wav"))) {
            try { sample.append(new byte[]{1, 2, 3}, 3); fail(); } catch (IllegalArgumentException expected) { }
        }
    }
    @Test public void blackAndEmptyFramesAreFlaggedOnlyAsHints() {
        assertTrue(SignalChecks.mostlyBlack(new int[0])); assertTrue(SignalChecks.mostlyBlack(new int[]{0xff000000, 0xff020202}));
        assertFalse(SignalChecks.mostlyBlack(new int[]{0xffffffff, 0xffff0000}));
    }
    @Test public void silenceAndNegativeFullScaleAreDetected() {
        assertEquals(0, SignalChecks.peakPcm16(new byte[10], 10));
        assertEquals(32768, SignalChecks.peakPcm16(new byte[]{0, (byte) 128}, 2));
    }
    @Test public void nonzeroPcmDoesNotAutomaticallyImplyCaptureSuccess() {
        assertEquals("NOT_TESTED", SignalChecks.classification(false, false, false));
        assertEquals("CAPTURE_BLOCKED", SignalChecks.classification(true, false, false));
        assertEquals("VIDEO_ONLY", SignalChecks.classification(true, true, false));
        assertEquals("AUDIO_ONLY", SignalChecks.classification(true, false, true));
        assertEquals("FULL_CAPTURE", SignalChecks.classification(true, true, true));
    }
    @Test public void resourcesReleasedInReverseOrderOnce() {
        ResourceScope scope = new ResourceScope(); List<Integer> closed = new ArrayList<>();
        scope.own(() -> closed.add(1)); scope.own(() -> closed.add(2));
        assertTrue(scope.release()); assertTrue(scope.release()); assertEquals(Arrays.asList(2, 1), closed);
    }
    @Test public void failingResourceDoesNotSkipOthers() {
        ResourceScope scope = new ResourceScope(); List<Integer> closed = new ArrayList<>();
        scope.own(() -> closed.add(1)); scope.own(() -> { throw new IOException("generated failure"); });
        assertFalse(scope.release()); assertEquals(Arrays.asList(1), closed);
    }
}
