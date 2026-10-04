package app.recipio.local;
import static org.junit.Assert.*;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;

public class AiRequestLifecycleTest {
    private String id(){return UUID.randomUUID().toString();}
    @Test public void requestAndActualSecretMutationAreMutuallyExclusive()throws Exception {
        AiRequestLifecycle life=new AiRequestLifecycle();String first=id();life.tryBeginRequest(first);
        assertEquals("busy",assertThrows(AiFailure.class,()->life.tryBeginRequest(id())).code);
        AtomicBoolean changed=new AtomicBoolean();assertThrows(AiFailure.class,()->life.withSecretMutation(()->{changed.set(true);return null;}));assertFalse(changed.get());
        life.finishRequest(first);assertEquals(42,(int)life.withSecretMutation(()->42));
    }
    @Test public void oldFinallyCannotUnlockNewRequest()throws Exception {
        AiRequestLifecycle life=new AiRequestLifecycle();String a=id(),b=id();life.tryBeginRequest(a);life.finishRequest(a);life.tryBeginRequest(b);life.finishRequest(a);
        assertThrows(AiFailure.class,()->life.tryBeginRequest(id()));life.finishRequest(b);life.tryBeginRequest(id());
    }
    @Test public void cancellationDisconnectsButDoesNotReleaseBeforeWorkerFinishes()throws Exception {
        AiRequestLifecycle life=new AiRequestLifecycle();String a=id();AiRequestLifecycle.Token token=life.tryBeginRequest(a);AtomicBoolean disconnected=new AtomicBoolean();token.onCancel(()->disconnected.set(true));life.cancel(a);
        assertTrue(disconnected.get());assertEquals("cancelled",assertThrows(AiFailure.class,token::check).code);
        assertThrows(AiFailure.class,()->life.tryBeginRequest(id()));life.finishRequest(a);life.tryBeginRequest(id());
    }
    @Test public void finishCallbacksObserveReleasedBusyBeforeReply()throws Exception {
        AiRequestLifecycle life=new AiRequestLifecycle();String a=id(),b=id();AiRequestLifecycle.Token token=life.tryBeginRequest(a);AtomicBoolean started=new AtomicBoolean();
        token.whenFinished(()->{try{life.tryBeginRequest(b);started.set(true);}catch(Exception e){throw new AssertionError(e);}});life.finishRequest(a);assertTrue(started.get());life.finishRequest(b);
    }
    @Test public void monotonicOverallDeadlineAndLateCancelHooksAreEnforced()throws Exception {
        long[] now={100};AiRequestLifecycle life=new AiRequestLifecycle(()->now[0],90);AiRequestLifecycle.Token token=life.tryBeginRequest(id());now[0]=190;
        assertEquals("timeout",assertThrows(AiFailure.class,token::check).code);AtomicBoolean late=new AtomicBoolean();token.onCancel(()->late.set(true));assertTrue(late.get());
    }
    @Test public void invalidRequestIdentityIsRejectedBeforeWork() {assertThrows(AiFailure.class,()->new AiRequestLifecycle().tryBeginRequest("../key"));}
    @Test public void resultSealingReportsCancellationOrDeadlineButFinishedTokenCannotBeCancelled()throws Exception {
        long[] now={0};AiRequestLifecycle life=new AiRequestLifecycle(()->now[0],90);String a=id();AiRequestLifecycle.Token token=life.tryBeginRequest(a);life.cancel(a);assertEquals("cancelled",life.finishRequest(a));
        String b=id();life.tryBeginRequest(b);now[0]=90;assertEquals("timeout",life.finishRequest(b));
        String c=id();AiRequestLifecycle.Token completed=life.tryBeginRequest(c);assertNull(life.finishRequest(c));AtomicBoolean changed=new AtomicBoolean();completed.onCancel(()->changed.set(true));completed.cancel("cancelled");assertFalse(changed.get());
    }
}
