package app.recipio.local;

import static org.junit.Assert.*;
import android.app.AlertDialog;
import android.app.Instrumentation;
import android.view.WindowManager;
import android.widget.EditText;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.File;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.junit.*;
import org.junit.runner.RunWith;

/** Actual native password dialog with an isolated generated credential. No HTTP or business writes. */
@RunWith(AndroidJUnit4.class)
public class AiKeyInputDialogInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private LocalAiSecretPlugin plugin;
    private AiSecretStore store;
    private Object originalStore, originalLifecycle;
    private File root;
    private String alias;

    private static final class Reply extends PluginCall {
        final CountDownLatch done = new CountDownLatch(1);
        volatile JSObject value;
        volatile String error;
        Reply() { super(null, "LocalAiSecret", "generated-input-test", "saveAiKey", new JSObject()); }
        @Override public void resolve(JSObject value) { this.value = value; done.countDown(); }
        @Override public void reject(String message, String code, JSObject data) { error = code; done.countDown(); }
        void await() throws Exception { assertTrue("Native save callback timeout", done.await(10, TimeUnit.SECONDS)); }
    }

    private Object field(String name) {
        try { Field field = LocalAiSecretPlugin.class.getDeclaredField(name); field.setAccessible(true); return field.get(plugin); }
        catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
    }
    private void field(String name, Object value) {
        try { Field field = LocalAiSecretPlugin.class.getDeclaredField(name); field.setAccessible(true); field.set(plugin, value); }
        catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
    }

    @Before public void setup() throws Exception {
        assertTrue("Generated-data emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        root = new File(instrumentation.getTargetContext().getNoBackupFilesDir(), "key-input-test-" + UUID.randomUUID());
        alias = "recipio-key-input-test-" + UUID.randomUUID();
        store = AiSecretStore.open(root, alias);
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(activity -> {
            plugin = (LocalAiSecretPlugin) activity.getBridge().getPlugin("LocalAiSecret").getInstance();
            originalStore = field("store"); originalLifecycle = field("lifecycle");
            field("store", store); field("lifecycle", new AiRequestLifecycle());
        });
        awaitLocalLibraryReady();
    }

    private void awaitLocalLibraryReady() throws Exception {
        // The native-only dialog can finish before React's SQLite bootstrap.
        // Do not destroy its Activity between beginTransaction and commit.
        AtomicReference<WebView> view = new AtomicReference<>();
        scenario.onActivity(activity -> view.set(activity.getBridge().getWebView()));
        long deadline = android.os.SystemClock.elapsedRealtime() + 15000;
        String body = "";
        do {
            AtomicReference<String> reply = new AtomicReference<>(); CountDownLatch done = new CountDownLatch(1);
            instrumentation.runOnMainSync(() -> view.get().evaluateJavascript(
                "JSON.stringify({ready:!!document.querySelector('nav[aria-label=\"主要导航\"]'),body:(document.body?.innerText??'').slice(0,1500)})",
                value -> { reply.set(value); done.countDown(); }));
            assertTrue("Local library bootstrap callback", done.await(15, TimeUnit.SECONDS));
            org.json.JSONObject state = new org.json.JSONObject(new JSONArray("[" + reply.get() + "]").getString(0));
            if (state.getBoolean("ready")) return;
            body = state.getString("body");
            Thread.sleep(100);
        } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Native dialog fixture must await SQLite/Backup readiness before teardown: " + body);
    }

    @After public void cleanup() throws Exception {
        if (scenario != null) {
            scenario.onActivity(activity -> {
                if (plugin != null) {
                    plugin.handleOnDestroy();
                    field("store", originalStore); field("lifecycle", originalLifecycle);
                }
            });
            scenario.close();
        }
        if (store != null) store.delete();
        if (alias != null) {
            KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
            if (keys.containsAlias(alias)) keys.deleteEntry(alias);
        }
        if (root != null) LocalBackupArchive.deleteOwnedTree(root);
    }

    private Reply open() {
        Reply reply = new Reply();
        scenario.onActivity(activity -> {
            plugin.saveAiKey(reply);
            AlertDialog dialog = (AlertDialog) field("dialog");
            assertTrue(dialog.isShowing());
            assertNotEquals(0, dialog.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE);
            assertFalse(((EditText) field("input")).isSaveEnabled());
        });
        return reply;
    }
    private void pasteAndSave(String generated) {
        scenario.onActivity(activity -> {
            ((EditText) field("input")).setText(generated);
            ((AlertDialog) field("dialog")).getButton(AlertDialog.BUTTON_POSITIVE).performClick();
        });
    }
    private void assertLocalError(String explanation) {
        scenario.onActivity(activity -> {
            EditText input = (EditText) field("input");
            assertEquals(0, input.length());
            assertTrue(input.getError().toString().contains(explanation));
            assertTrue(input.getError().toString().contains("尚未连接 AI 服务"));
            assertTrue(((AlertDialog) field("dialog")).isShowing());
        });
    }
    private void assertStored(String generated) throws Exception {
        char[] stored = store.readForRequest();
        try { assertArrayEquals(generated.toCharArray(), stored); }
        finally { Arrays.fill(stored, '\0'); }
    }

    @Test public void unicodeBoundaryPasteSavesThroughRealNativeDialogWithoutPlaintextReply() throws Exception {
        String generated = "sk-" + UUID.randomUUID();
        Reply reply = open(); pasteAndSave("\ufeff\u00a0 " + generated + "\u200b\u3000"); reply.await();
        assertNull(reply.error); assertTrue(reply.value.getBoolean("configured"));
        assertFalse(reply.value.getBoolean("cancelled")); assertEquals(2, reply.value.length());
        assertFalse(reply.value.toString().contains(generated)); assertStored(generated);
    }

    @Test public void invalidPasteClearsInputAndCancelPreservesPreviousCiphertext() throws Exception {
        String old = "sk-" + UUID.randomUUID(); store.save(old.toCharArray());
        byte[] ciphertext = Files.readAllBytes(new File(root, "ai-secret/key-v1.json").toPath());
        Reply reply = open(); pasteAndSave("sk-******"); assertLocalError("打码");
        pasteAndSave("sk-" + UUID.randomUUID() + "\u200b" + UUID.randomUUID()); assertLocalError("中间");
        assertEquals(1, reply.done.getCount());
        assertArrayEquals(ciphertext, Files.readAllBytes(new File(root, "ai-secret/key-v1.json").toPath()));
        scenario.onActivity(activity -> ((AlertDialog) field("dialog")).getButton(AlertDialog.BUTTON_NEGATIVE).performClick());
        reply.await(); assertNull(reply.error); assertTrue(reply.value.getBoolean("cancelled")); assertStored(old);
    }

    @Test public void correctedPasteCanBeSavedAfterLocalRejection() throws Exception {
        Reply reply = open(); pasteAndSave("sk-short"); assertLocalError("太短");
        String generated = "sk-" + UUID.randomUUID(); pasteAndSave("\u00a0" + generated + "\ufeff"); reply.await();
        assertNull(reply.error); assertTrue(reply.value.getBoolean("configured")); assertStored(generated);
    }

    @Test public void workspaceDotSegmentsSaveInProtectedNativeDialogWithoutLeakingReply() throws Exception {
        String generated = "sk-ws-TEST." + UUID.randomUUID() + "." + UUID.randomUUID() + "_fake";
        Reply reply = open(); pasteAndSave("\ufeff" + generated + "\u00a0"); reply.await();
        assertNull(reply.error); assertTrue(reply.value.getBoolean("configured"));
        assertEquals(2, reply.value.length()); assertFalse(reply.value.toString().contains(generated));
        assertStored(generated);
    }
}
