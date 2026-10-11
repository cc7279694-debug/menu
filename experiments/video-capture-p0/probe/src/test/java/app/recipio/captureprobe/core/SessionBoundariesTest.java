package app.recipio.captureprobe.core;

import org.junit.Test;
import static org.junit.Assert.*;

/** Fake Android ports exercise the same lifecycle/cleanup authorities used by the Service. */
public class SessionBoundariesTest {
    private static final class FakeSession {
        final CaptureLifecycle lifecycle = new CaptureLifecycle();
        final ResourceScope resources = new ResourceScope();
        int projectionStops, audioReleases, readerReleases;
        long id;
        void start(boolean audioAvailable) {
            id = lifecycle.beginConsent(); assertTrue(lifecycle.grant(id, 100));
            resources.own(() -> readerReleases++);
            if (audioAvailable) resources.own(() -> audioReleases++);
            resources.own(() -> projectionStops++);
            assertTrue(lifecycle.started(id));
        }
        void stop(String reason) {
            if (lifecycle.stop(id, reason)) { resources.release(); lifecycle.released(id); }
        }
    }
    @Test public void audioUnavailableStillAllowsFrameAndThenReleasesProjection() {
        FakeSession s = new FakeSession(); s.start(false);
        assertEquals(0, s.lifecycle.takeFrameSlot(s.id, 2100)); s.stop("timeout");
        assertEquals(0, s.audioReleases); assertEquals(1, s.readerReleases); assertEquals(1, s.projectionStops);
    }
    @Test public void systemCallbackAndUserStopDoNotDoubleRelease() {
        FakeSession s = new FakeSession(); s.start(true); s.stop("callback_onStop"); s.stop("user_stop");
        assertEquals(1, s.audioReleases); assertEquals(1, s.projectionStops); assertEquals(1, s.readerReleases);
        assertEquals(CaptureLifecycle.State.DONE, s.lifecycle.state());
    }
    @Test public void repeatedStartAndStopUseNewGrantAndIgnoreOldCallback() {
        CaptureLifecycle c = new CaptureLifecycle();
        for (int i = 0; i < 25; i++) {
            long id = c.beginConsent(); assertTrue(c.grant(id, i * 20000L)); assertTrue(c.started(id));
            assertFalse(c.stop(id - 1, "stale")); assertTrue(c.stop(id, "user_stop")); c.released(id);
            assertFalse(c.maySample(id, i * 20000L + 1));
        }
    }
    @Test public void forwardDeadlineAndBackwardClockCannotWrite() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent(); c.grant(id, 100); c.started(id);
        assertFalse(c.maySample(id, Long.MAX_VALUE)); assertFalse(c.maySample(id, 99));
    }
    @Test public void processGenerationRejectsPreviousPendingIntentSession() {
        CaptureLifecycle processOne = new CaptureLifecycle(100), processTwo = new CaptureLifecycle(200);
        long old = processOne.beginConsent(), current = processTwo.beginConsent();
        assertFalse(processTwo.grant(old, 0)); assertFalse(processTwo.stop(old, "stale_notification"));
        assertTrue(processTwo.grant(current, 0));
    }
    @Test public void consentCancellationDoesNotAcquireFakeResources() {
        FakeSession s = new FakeSession(); s.id = s.lifecycle.beginConsent(); s.stop("permission_denied");
        assertEquals(0, s.projectionStops); assertEquals(0, s.audioReleases); assertEquals(0, s.readerReleases);
    }
}
