package app.recipio.local;

import static org.junit.Assert.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Actual native callback boundary; no application database or personal files are touched. */
@RunWith(AndroidJUnit4.class)
public class LocalBackupReplyOrderingTest {
    private void checkReply(boolean fail) throws Exception {
        File root = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),
            "reply-order-" + UUID.randomUUID());
        assertTrue(root.mkdir());
        LocalBackupSession session = LocalBackupSession.create(root, "export");
        LocalBackupPlugin plugin = new LocalBackupPlugin();
        Field active = LocalBackupPlugin.class.getDeclaredField("active");
        active.setAccessible(true);
        active.set(plugin, session);
        Field busy = LocalBackupPlugin.class.getDeclaredField("busy");
        busy.setAccessible(true);
        Field worker = LocalBackupPlugin.class.getDeclaredField("worker");
        worker.setAccessible(true);
        ExecutorService executor = (ExecutorService) worker.get(plugin);
        CountDownLatch replied = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        PluginCall call = new PluginCall(null, "LocalBackup", "test", "work",
            new JSObject().put("token", session.token)) {
            private void published(boolean rejected) {
                try {
                    assertEquals(fail, rejected);
                    assertFalse("Native busy must be released before publishing any reply", busy.getBoolean(plugin));
                } catch (Throwable error) {
                    failure.set(error);
                } finally {
                    replied.countDown();
                }
            }
            @Override public void resolve(JSObject value) { published(false); }
            @Override public void reject(String message) { published(true); }
        };
        Class<?> work = Class.forName("app.recipio.local.LocalBackupPlugin$Work");
        Object action = Proxy.newProxyInstance(work.getClassLoader(), new Class<?>[]{work}, (proxy, method, args) -> {
            assertTrue("Busy must still protect the actual work", busy.getBoolean(plugin));
            if (fail) throw new IOException("generated native failure");
            return new JSObject();
        });
        Method run = LocalBackupPlugin.class.getDeclaredMethod("run", PluginCall.class, String.class, work);
        run.setAccessible(true);
        try {
            run.invoke(plugin, call, "writing", action);
            assertTrue("Native callback missing", replied.await(10, TimeUnit.SECONDS));
            if (failure.get() != null) throw new AssertionError(failure.get());
        } finally {
            executor.shutdown();
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
            LocalBackupArchive.deleteOwnedTree(root);
        }
    }
    @Test public void successfulReplyReleasesBusyBeforeNextBridgeCall() throws Exception { checkReply(false); }
    @Test public void failedReplyReleasesBusyBeforeCleanupCanRetry() throws Exception { checkReply(true); }
}
