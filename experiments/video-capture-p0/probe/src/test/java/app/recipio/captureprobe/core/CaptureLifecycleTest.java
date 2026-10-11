package app.recipio.captureprobe.core;

import org.junit.Test;
import static org.junit.Assert.*;

public class CaptureLifecycleTest {
    @Test public void consentDoesNotStartCapture() {
        CaptureLifecycle c = new CaptureLifecycle();
        long id = c.beginConsent();
        assertTrue(id > 0); assertEquals(CaptureLifecycle.State.CONSENT, c.state());
        assertFalse(c.maySample(id, 0));
    }
    @Test public void duplicateConsentCannotCreateAnotherSession() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        assertEquals(-1, c.beginConsent()); assertEquals(id, c.id());
    }
    @Test public void denialTerminatesWithoutSamples() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        assertTrue(c.stop(id, "consent_denied")); c.released(id);
        assertEquals(CaptureLifecycle.State.DONE, c.state());
        assertFalse(c.maySample(id, 1)); assertEquals("consent_denied", c.reason());
    }
    @Test public void eachGrantIsConsumedOnlyOnce() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        assertTrue(c.grant(id, 500)); assertFalse(c.grant(id, 501));
        assertTrue(c.started(id)); assertFalse(c.started(id));
    }
    @Test public void deadlineStopsNewSamplesAtFifteenSeconds() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        assertTrue(c.grant(id, 100)); assertTrue(c.started(id));
        assertEquals(15100, c.deadline());
        assertTrue(c.maySample(id, 15099)); assertFalse(c.maySample(id, 15100));
        assertFalse(c.maySample(id, 99));
    }
    @Test public void callbackStopIsIdempotentAndRequiresReleaseBeforeRestart() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        c.grant(id, 0); c.started(id);
        assertTrue(c.stop(id, "system_stop")); assertFalse(c.stop(id, "again"));
        assertEquals(-1, c.beginConsent()); c.released(id);
        assertTrue(c.beginConsent() > id);
    }
    @Test public void staleCallbackCannotStopNextSession() {
        CaptureLifecycle c = new CaptureLifecycle(); long old = c.beginConsent();
        c.stop(old, "cancel"); c.released(old); long current = c.beginConsent();
        assertFalse(c.stop(old, "stale")); assertFalse(c.grant(old, 10));
        assertEquals(current, c.id()); assertEquals(CaptureLifecycle.State.CONSENT, c.state());
    }
    @Test public void samplesOccurOnceAtTwoSevenAndTwelveSeconds() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        c.grant(id, 100); c.started(id);
        assertEquals(-1, c.takeFrameSlot(id, 2099)); assertEquals(0, c.takeFrameSlot(id, 2100));
        assertEquals(-1, c.takeFrameSlot(id, 2101)); assertEquals(1, c.takeFrameSlot(id, 7100));
        assertEquals(2, c.takeFrameSlot(id, 12100)); assertEquals(-1, c.takeFrameSlot(id, 12101));
    }
    @Test public void timeoutOrFailurePreventsAllFurtherSamples() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        c.grant(id, 100); c.started(id); assertTrue(c.stop(id, "init_failure"));
        assertFalse(c.maySample(id, 2200)); assertEquals(-1, c.takeFrameSlot(id, 2200));
    }
    @Test public void restartAfterReleaseNeedsNewConsent() {
        CaptureLifecycle c = new CaptureLifecycle(); long id = c.beginConsent();
        c.stop(id, "cancel"); c.released(id); long next = c.beginConsent();
        assertFalse(c.started(next)); assertFalse(c.maySample(next, 20));
        assertTrue(c.grant(next, 20)); assertTrue(c.started(next));
    }
}
