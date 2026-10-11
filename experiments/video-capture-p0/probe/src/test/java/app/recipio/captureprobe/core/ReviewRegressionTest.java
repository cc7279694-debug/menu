package app.recipio.captureprobe.core;

import java.io.IOException;
import org.junit.Test;
import static org.junit.Assert.*;

public class ReviewRegressionTest {
    private static final class Handle implements AutoCloseable {
        int closes;
        @Override public void close() { closes++; }
    }
    @Test public void failedResizeAttachmentClosesNewAndRetainsOld() throws Exception {
        OwnedResource<Handle> slot = new OwnedResource<>(); Handle old = new Handle(), next = new Handle();
        slot.replace(() -> old, handle -> { });
        try { slot.replace(() -> next, handle -> { throw new IOException("fake display failure"); }); fail(); }
        catch (IOException expected) { assertEquals("fake display failure", expected.getMessage()); }
        assertSame(old, slot.get()); assertEquals(1, next.closes); assertEquals(0, old.closes);
        slot.close(); assertEquals(1, old.closes);
    }
    @Test public void successfulResizeClosesOldAndCleanupClosesNewOnlyOnce() throws Exception {
        OwnedResource<Handle> slot = new OwnedResource<>(); Handle old = new Handle(), next = new Handle();
        slot.replace(() -> old, handle -> { }); slot.replace(() -> next, handle -> { });
        assertSame(next, slot.get()); assertEquals(1, old.closes); slot.close(); slot.close(); assertEquals(1, next.closes);
    }
    @Test public void readerFactoryFailureRetainsCurrentOwnership() throws Exception {
        OwnedResource<Handle> slot = new OwnedResource<>(); Handle old = new Handle(); slot.replace(() -> old, h -> { });
        try { slot.replace(() -> { throw new IOException("fake reader failure"); }, h -> { }); fail(); }
        catch (IOException expected) { assertSame(old, slot.get()); } slot.close(); assertEquals(1, old.closes);
    }
    @Test public void finishingConsentOwnerReleasesButRotationDoesNot() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        assertFalse(c.ownerFinished(id, false)); assertEquals(CaptureLifecycle.State.CONSENT, c.state());
        assertTrue(c.ownerFinished(id, true)); assertEquals(CaptureLifecycle.State.DONE, c.state());
        assertFalse(c.grant(id, 100)); assertTrue(c.beginConsent() > id);
    }
    @Test public void finishingStaleOwnerCannotCancelNewConsentOrRunningService() {
        CaptureLifecycle c = new CaptureLifecycle(); long old = c.beginConsent(); c.ownerFinished(old, true); long id = c.beginConsent();
        assertFalse(c.ownerFinished(old, true)); assertTrue(c.grant(id, 100)); assertTrue(c.started(id));
        assertFalse(c.ownerFinished(id, true)); assertTrue(c.maySample(id, 110));
    }
    @Test public void unavailableAudioReadDisablesOnlyAudioNotVideo() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent(); c.grant(id, 100); c.started(id);
        for (int error : new int[]{-1, -2, -3, -6}) assertEquals(AudioReadPolicy.Decision.DISABLE_AUDIO, AudioReadPolicy.decide(error));
        assertEquals(0, c.takeFrameSlot(id, 2100)); assertTrue(c.maySample(id, 7100));
        assertEquals(AudioReadPolicy.Decision.AGAIN, AudioReadPolicy.decide(0));
        assertEquals(AudioReadPolicy.Decision.DATA, AudioReadPolicy.decide(4));
    }
    @Test public void authorizationWithoutConfirmedPlaybackIsNotPlatformEvidence() {
        assertEquals("NOT_TESTED", SignalChecks.classification(false, true, true));
        assertEquals("CAPTURE_BLOCKED", SignalChecks.classification(true, false, false));
    }
    @Test public void priorSessionConfirmationsCannotClassifyCurrentCapture() {
        assertEquals("NOT_TESTED", SignalChecks.classificationForSession(2, 1, true, true, true, true, true));
    }
    @Test public void currentSessionRequiresExplicitPlaybackAndReview() {
        assertEquals("NOT_TESTED", SignalChecks.classificationForSession(2, 2, true, false, true, true, true));
        assertEquals("NOT_TESTED", SignalChecks.classificationForSession(2, 2, true, true, false, true, true));
        assertEquals("FULL_CAPTURE", SignalChecks.classificationForSession(2, 2, true, true, true, true, true));
    }
}
