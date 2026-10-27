package app.recipio.local;

import static org.junit.Assert.*;

import android.app.Instrumentation;
import android.content.Context;
import android.content.ContextWrapper;
import android.graphics.Bitmap;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Two G7 real MainActivity/WebView/API36 cases, fresh owned cloud AVD only.
 * Native image decoding/cache URI and SQLite are real. HTTP is Fake before entry.
 * The generated image-selection result is injected at the external JS port;
 * this class does not claim a real SAF selection, real AI, or pixel fidelity.
 * Existing G5 actual SAF/IME tests remain separate regression evidence.
 */
@RunWith(AndroidJUnit4.class)
public class G7IntakeReviewInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private AndroidImeProbe ime;
    private String originalIme;
    private boolean changedIme;
    private File ownedRoot;
    private String alias;
    private AiNativeRuntime runtime;
    private ExecutorService worker;
    private AiTemporaryImages.Image selectedImage;
    private int imeProbeCount;
    private String lastImeProbe = "NOT_CAPTURED";
    private final AtomicInteger fakeHttp = new AtomicInteger();
    private final String token = UUID.randomUUID().toString();
    private final String originalTitle = "G7 GENERATED " + token;
    private final String finalTitle = "G7 EDITED " + token;

    private static void field(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name); field.setAccessible(true); field.set(target, value);
    }
    private String js(String expression) throws Exception {
        AtomicReference<String> reply = new AtomicReference<>(); CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, value -> { reply.set(value); done.countDown(); }));
        assertTrue("G7 WebView callback timeout", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + reply.get() + "]").optString(0);
    }
    private void until(String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do { if ("true".equals(js(expression))) return; Thread.sleep(100); }
        while (SystemClock.elapsedRealtime() < deadline);
        fail("G7 UI condition failed: " + expression);
    }
    private String visible(String name) { return name + ".getClientRects().length>0&&!" + name + ".closest('[hidden],[inert],[aria-hidden=\"true\"]')"; }
    private String button(String label) {
        return "[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())==="
            + JSONObject.quote(label) + "&&!b.disabled&&" + visible("b") + ")";
    }
    private void click(String label) throws Exception { until("(()=>{const b=" + button(label) + ";if(!b)return false;b.click();return true})()"); }
    private String editor(String label) {
        return "[...document.querySelectorAll('form label')].find(l=>l.querySelector('span')?.textContent==="
            + JSONObject.quote(label) + ")?.querySelector('input,textarea')";
    }
    private void fillSelector(String selector, String value) throws Exception {
        until("!!(" + selector + ")");
        js("(()=>{const e=" + selector + ";const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;"
            + "Object.getOwnPropertyDescriptor(p,'value').set.call(e," + JSONObject.quote(value)
            + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        until("(" + selector + ").value===" + JSONObject.quote(value));
    }
    private void fill(String label, String value) throws Exception { fillSelector(editor(label), value); }
    private String dialog(String title) {
        return "[...document.querySelectorAll('[role=dialog]')].find(e=>e.textContent.includes(" + JSONObject.quote(title) + ")&&" + visible("e") + ")";
    }
    private void shell(String command) throws Exception {
        try (InputStream stream = new ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand(command))) {
            byte[] bytes = new byte[256]; while (stream.read(bytes) != -1) { /* Fixed scoped platform operation. */ }
        }
    }
    private void awaitIme(boolean shown) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 10000;
        do { if (ime.settled(instrumentation, shown)) return; Thread.sleep(100); }
        while (SystemClock.elapsedRealtime() < deadline);
        fail("Actual G7 editor IME did not settle to " + shown + "; " + imeDiagnostic("await-ime-timeout"));
    }
    private String imeDiagnostic(String phase) {
        String output;
        try {
            AtomicReference<Boolean> shown = new AtomicReference<>();
            boolean[] focus = new boolean[2];
            instrumentation.runOnMainSync(() -> {
                WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());
                if (insets != null) shown.set(insets.isVisible(WindowInsetsCompat.Type.ime()));
                focus[0] = activity.hasWindowFocus(); focus[1] = web.hasFocus();
            });
            JSONObject report = new JSONObject().put("phase", phase).put("imeVisible", shown.get() == null ? JSONObject.NULL : shown.get())
                .put("settledHidden", ime.settled(instrumentation, false)).put("settledShown", ime.settled(instrumentation, true))
                .put("windowFocus", focus[0]).put("webFocus", focus[1]);
            JSONObject page = new JSONObject(js("JSON.stringify((()=>{const source=" + dialog("本轮来源")
                + ";return {pageBacks:window.__g7PageBacks,sourceVisible:!!source,focusedTag:document.activeElement?.tagName||null,sourceOwnsFocus:!!source?.contains(document.activeElement)}})())"));
            report.put("page", page); output = report.toString();
        } catch (Exception ignored) {
            output = "{\"phase\":\"" + phase + "\",\"diagnostic\":\"UNAVAILABLE\"}";
        }
        lastImeProbe = output;
        // A bounded platform-only stream survives an assertion failure. Never
        // include source text, field values, credentials or arbitrary UI content.
        if (imeProbeCount++ < 12) try {
            android.os.Bundle status = new android.os.Bundle();
            status.putString("stream", "\nG7_IME_PROBE=" + output + "\n"); instrumentation.sendStatus(2, status);
        } catch (RuntimeException ignored) { /* Preserve the original test failure. */ }
        return output;
    }
    private boolean awaitSettledImeState(String phase) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 10000;
        do {
            if (ime.settled(instrumentation, true)) { imeDiagnostic(phase + "-settled-shown"); return true; }
            if (ime.settled(instrumentation, false)) { imeDiagnostic(phase + "-settled-hidden"); return false; }
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Platform IME/animation/window focus did not settle; " + imeDiagnostic(phase + "-settle-timeout"));
        return false;
    }
    private void awaitSourceClosedAfterSingleBack() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            if ("false".equals(js("!!(" + dialog("本轮来源") + ")"))) return;
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Source still visible after one Back from a settled hidden IME; " + imeDiagnostic("source-close-timeout"));
    }
    private void awaitDirtyProtectionAfterSingleBack() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            if ("1".equals(js("window.__g7Confirms"))) return;
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Dirty protection did not open after one Back from a settled hidden IME; " + imeDiagnostic("dirty-back-timeout"));
    }
    private void awaitDuplicateClosedAfterSingleBack() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            if ("false".equals(js("!!(" + dialog("已存在同名菜谱") + ")"))) return;
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Duplicate decision still visible after one Back from a settled hidden IME; " + imeDiagnostic("duplicate-close-timeout"));
    }
    private void openIme(String selector) throws Exception {
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=" + selector
            + ";e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth]})())"));
        int[] origin = new int[2]; instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin));
        float scale = web.getWidth() / (float) point.getDouble(2);
        float x = origin[0] + (float) point.getDouble(0) * scale, y = origin[1] + (float) point.getDouble(1) * scale;
        long now = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
        MotionEvent up = MotionEvent.obtain(now, now + 1, MotionEvent.ACTION_UP, x, y, 0);
        try { instrumentation.sendPointerSync(down); instrumentation.sendPointerSync(up); }
        finally { down.recycle(); up.recycle(); }
        awaitIme(true); until("document.activeElement===(" + selector + ")");
    }
    private void back() { instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); }
    private String fakeDraft() throws Exception {
        JSONObject recipe = new JSONObject().put("title", originalTitle).put("totalMinutes", JSONObject.NULL)
            .put("servings", JSONObject.NULL).put("caloriesPerServing", JSONObject.NULL).put("coverPath", JSONObject.NULL).put("notes", "")
            .put("ingredients", new JSONArray().put(new JSONObject().put("name", "酱汁").put("amount", "20 毫升")))
            .put("steps", new JSONArray().put(new JSONObject().put("instruction", "先焯水").put("imagePath", JSONObject.NULL)))
            .put("preparations", new JSONArray()).put("keyTips", new JSONArray());
        JSONArray checks = new JSONArray()
            .put(new JSONObject().put("path", "title").put("label", "菜名").put("status", "explicit").put("message", "原菜名有来源"))
            .put(new JSONObject().put("path", "servings").put("label", "份数").put("status", "missing").put("message", "原文没有人数"))
            .put(new JSONObject().put("path", "ingredients[0].amount").put("label", "酱汁用量").put("status", "inferred").put("message", "原结果用量需检查"));
        return new JSONObject().put("recipe", recipe).put("fieldChecks", checks).put("warnings", new JSONArray()).toString();
    }
    private void fakeExternalHttpOnly() throws Exception {
        Context target = instrumentation.getTargetContext(); ownedRoot = new File(target.getCacheDir(), "g7-generated-" + UUID.randomUUID()); assertTrue(ownedRoot.mkdir());
        for (String name : new String[] { "cache", "files", "no-backup" }) assertTrue(new File(ownedRoot, name).mkdir());
        Context scoped = new ContextWrapper(target) {
            @Override public Context getApplicationContext() { return this; }
            @Override public File getCacheDir() { return new File(ownedRoot, "cache"); }
            @Override public File getFilesDir() { return new File(ownedRoot, "files"); }
            @Override public File getNoBackupFilesDir() { return new File(ownedRoot, "no-backup"); }
        };
        Constructor<AiNativeRuntime> constructor = AiNativeRuntime.class.getDeclaredConstructor(Context.class); constructor.setAccessible(true); runtime = constructor.newInstance(scoped);
        alias = "recipio-g7-generated-" + UUID.randomUUID(); field(runtime, "secrets", AiSecretStore.open(scoped.getNoBackupFilesDir(), alias));
        runtime.secrets.save(("sk-" + UUID.randomUUID()).toCharArray());
        // Preserve the unchanged production URI namespace and real image codec.
        field(runtime, "images", AiTemporaryImages.forContext(target));
        LocalAiIntakePlugin intake = (LocalAiIntakePlugin) activity.getBridge().getPlugin("LocalAiIntake").getInstance(); field(intake, "runtime", runtime);
        try (InputStream contract = target.getAssets().open("recipio-ai-intake-contract.json")) {
            field(intake, "client", new QwenClient(new AiIntakeContract(contract), (request, cancel) -> {
                fakeHttp.incrementAndGet(); cancel.check();
                String body = new JSONObject().put("choices", new JSONArray().put(new JSONObject().put("finish_reason", "stop")
                    .put("message", new JSONObject().put("content", fakeDraft())))).toString();
                return new QwenClient.HttpReply(200, new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)), () -> {});
            }));
        }
        Field field = LocalAiIntakePlugin.class.getDeclaredField("worker"); field.setAccessible(true); worker = (ExecutorService) field.get(intake);
        LocalAiSecretPlugin keys = (LocalAiSecretPlugin) activity.getBridge().getPlugin("LocalAiSecret").getInstance();
        field(keys, "store", runtime.secrets); field(keys, "lifecycle", runtime.lifecycle);
        js("(()=>{const native=window.Capacitor.nativePromise;window.__g7Operation=null;window.__g7GeneratedImage=null;"
            + "window.Capacitor.nativePromise=function(p,m,o){if(p==='LocalAiIntake'&&m==='pickImage'&&window.__g7GeneratedImage)"
            + "return Promise.resolve({cancelled:false,image:window.__g7GeneratedImage});const result=native.call(this,p,m,o);"
            + "if(p==='LocalAiIntake'&&m==='createSession')return result.then(r=>{window.__g7Operation=r.operationId;return r});return result;};return true})()");
    }
    private void generatedImageForCurrentSession() throws Exception {
        until("typeof window.__g7Operation==='string'"); UUID operation = UUID.fromString(js("window.__g7Operation"));
        Bitmap bitmap = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888); bitmap.eraseColor(0xffcc8844);
        byte[] bytes;
        try (ByteArrayOutputStream stream = new ByteArrayOutputStream()) { assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)); bytes = stream.toByteArray(); }
        finally { bitmap.recycle(); }
        selectedImage = runtime.images(instrumentation.getTargetContext()).importStream(operation, new ByteArrayInputStream(bytes), "image/png");
        assertTrue(selectedImage.previewUri.matches("^file:///data/(?:user/\\d+|data)/app\\.recipio\\.local/cache/ai-import/" + operation + "/" + selectedImage.id + "\\.jpg$"));
        JSONObject metadata = new JSONObject().put("id", selectedImage.id).put("mimeType", "image/jpeg").put("byteSize", selectedImage.byteSize)
            .put("width", selectedImage.width).put("height", selectedImage.height).put("previewUri", selectedImage.previewUri);
        js("window.__g7GeneratedImage=" + metadata); click("添加截图"); until("!!document.querySelector('img[alt=\"截图 1\"]')");
    }
    private void preview(boolean image) throws Exception {
        click("新增菜谱"); click("AI 整理"); until("!!document.querySelector('textarea')");
        fillSelector("document.querySelector('textarea')", originalTitle + "。酱汁20毫升。先焯水。");
        if (image) generatedImageForCurrentSession();
        click("开始 AI 整理"); until("document.body.innerText.includes('检查整理结果')");
        until("!!document.querySelector('[role=region][aria-label=\"当前草稿检查\"]')"); assertEquals(1, fakeHttp.get());
    }
    private void watch() throws Exception {
        js("(()=>{window.__g7Writes=[];window.__g7PageBacks=0;window.__g7Confirms=0;window.__g7Online=[];window.__g7Watch=true;"
            + "window.addEventListener('recipio:back',()=>window.__g7PageBacks++);window.confirm=()=>{window.__g7Confirms++;return false};"
            + "for(const [p,methods]of[[Storage.prototype,['setItem','removeItem','clear']],[IDBObjectStore.prototype,['add','put','delete','clear']]])"
            + "for(const m of methods){const original=p[m];p[m]=function(...a){if(window.__g7Watch)window.__g7Writes.push('storage.'+m);return original.apply(this,a)}};"
            + "const native=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(p,m,o){"
            + "if(window.__g7Watch&&((p==='CapacitorSQLite'&&['run','execute','executeSet','beginTransaction','commitTransaction'].includes(m))"
            + "||(p==='Filesystem'&&['writeFile','appendFile','deleteFile','mkdir','rmdir','rename','copy'].includes(m))||p==='Preferences'))window.__g7Writes.push(p+'.'+m);"
            + "if(window.__g7Watch&&['LocalAiIntake','LocalAiSecret','CapacitorHttp'].includes(p))window.__g7Online.push(p+'.'+m);return native.call(this,p,m,o)};return true})()");
    }
    private JSONArray query(String sql, JSONArray values) throws Exception {
        js("window.__g7Rows=null;window.Capacitor.nativePromise('CapacitorSQLite','query'," + new JSONObject()
            .put("database", "recipio").put("statement", sql).put("values", values).put("readonly", false)
            + ").then(r=>window.__g7Rows=JSON.stringify(r.values),()=>window.__g7Rows='ERROR')");
        until("window.__g7Rows!==null"); String rows = js("window.__g7Rows"); assertNotEquals("Own generated-row query failed", "ERROR", rows); return new JSONArray(rows);
    }
    private JSONArray byFinalTitle() throws Exception { return query("SELECT * FROM recipes WHERE title=? AND deleted_at IS NULL ORDER BY created_at,id", new JSONArray().put(finalTitle)); }
    private void zeroWrites() throws Exception {
        assertEquals("[]", js("JSON.stringify(window.__g7Writes)")); assertEquals("[]", js("JSON.stringify(window.__g7Online)")); assertEquals(1, fakeHttp.get());
    }
    private void screenshot(String filename) throws Exception {
        File output = new File(instrumentation.getTargetContext().getCacheDir(), filename);
        assertTrue("Never overwrite evidence", output.createNewFile());
        Bitmap bitmap = instrumentation.getUiAutomation().takeScreenshot(); assertNotNull(bitmap);
        JSONObject metadata = new JSONObject().put("file", filename).put("width", bitmap.getWidth()).put("height", bitmap.getHeight())
            .put("theme", js("document.querySelector('#root .recipio-ui-v2')?.getAttribute('data-v2-theme')"))
            .put("externalCapability", "FAKE_HTTP_GENERATED_NATIVE_IMAGE_SELECTION")
            .put("scope", "Actual Android MainActivity/WebView; no real AI, no real SAF claim, no pixel-fidelity claim");
        try (FileOutputStream stream = new FileOutputStream(output)) { assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)); }
        finally { bitmap.recycle(); }
        File sidecar = new File(instrumentation.getTargetContext().getCacheDir(), filename.replace(".png", ".json"));
        assertTrue("Never overwrite screenshot metadata", sidecar.createNewFile());
        try (FileOutputStream stream = new FileOutputStream(sidecar)) { stream.write(metadata.toString().getBytes(StandardCharsets.UTF_8)); }
    }

    @Before public void setup() throws Exception {
        assertEquals("Requires the guarded fresh-cloud fixture runner", "G7_GENERATED_CLOUD_FIXTURE",
            InstrumentationRegistry.getArguments().getString("g7SyntheticCloudFixture"));
        assertTrue("Dedicated emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish")); assertEquals(36, android.os.Build.VERSION.SDK_INT);
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        assertTrue(originalIme == null || originalIme.matches("[01]")); changedIme = true; shell("settings put secure show_ime_with_hard_keyboard 1");
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(current -> { activity = current; web = current.getBridge().getWebView(); ime = new AndroidImeProbe(current); });
        until("!!(" + button("新增菜谱") + ")"); fakeExternalHttpOnly();
    }
    @After public void cleanup() throws Exception {
        try { if (scenario != null) scenario.close(); }
        finally {
            if (worker != null) assertTrue(worker.awaitTermination(10, TimeUnit.SECONDS));
            if (runtime != null) runtime.secrets.delete();
            if (alias != null) { KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null); if (keys.containsAlias(alias)) keys.deleteEntry(alias); }
            if (ownedRoot != null) LocalBackupArchive.deleteOwnedTree(ownedRoot);
            if (changedIme) shell(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard" : "settings put secure show_ime_with_hard_keyboard " + originalIme);
        }
    }

    @Test public void actualImeThenSourceBackThenDirtyProtection_keepOneEditedDraftWithoutWrites() throws Exception {
        preview(false); watch(); fill("菜名", finalTitle); fill("个人备注", "G7 unsaved generated note");
        openIme(editor("菜名")); back(); awaitIme(false);
        imeDiagnostic("editor-keyboard-back-settled");
        assertEquals("0", js("window.__g7PageBacks")); assertEquals(finalTitle, js("(" + editor("菜名") + ").value"));
        click("查看本轮来源"); until("!!(" + dialog("本轮来源") + ")"); screenshot("g7-ime-source.png");
        if (awaitSettledImeState("source-open")) {
            // A real visible keyboard owns exactly this Back. It must not close
            // the source Sheet or emit a page Back while the IME is dismissed.
            imeDiagnostic("source-before-keyboard-back"); back(); awaitIme(false);
            imeDiagnostic("source-after-keyboard-back");
            assertEquals("Visible IME Back must not reach the page; " + lastImeProbe, "0", js("window.__g7PageBacks"));
            assertEquals("Visible IME Back must retain the source Sheet; " + lastImeProbe, "true", js("!!(" + dialog("本轮来源") + ")"));
            assertEquals("0", js("window.__g7Confirms"));
        }
        awaitIme(false); imeDiagnostic("source-before-page-back");
        assertEquals("0", js("window.__g7PageBacks"));
        back(); awaitSourceClosedAfterSingleBack(); imeDiagnostic("source-after-page-back");
        assertEquals("1", js("window.__g7PageBacks")); assertEquals("0", js("window.__g7Confirms"));
        assertEquals("true", js("document.body.innerText.includes('检查整理结果')"));
        assertEquals(finalTitle, js("(" + editor("菜名") + ").value"));
        if (awaitSettledImeState("source-closed-before-dirty")) {
            // Closing the modal may restore the original text editor and reopen
            // the real IME. Only an observed visible keyboard earns this Back.
            imeDiagnostic("editor-restored-before-keyboard-back"); back(); awaitIme(false);
            imeDiagnostic("editor-restored-after-keyboard-back");
            assertEquals("Restored IME Back must not reach the page; " + lastImeProbe, "1", js("window.__g7PageBacks"));
            assertEquals("Restored IME Back must not reopen the source; " + lastImeProbe, "false", js("!!(" + dialog("本轮来源") + ")"));
            assertEquals("0", js("window.__g7Confirms"));
        }
        awaitIme(false); imeDiagnostic("editor-before-dirty-back"); back(); awaitDirtyProtectionAfterSingleBack(); imeDiagnostic("editor-after-dirty-back");
        assertEquals("2", js("window.__g7PageBacks")); assertEquals("G7 unsaved generated note", js("(" + editor("个人备注") + ").value"));
        zeroWrites(); assertEquals(0, byFinalTitle().length());
    }

    @Test public void controlledNativeSourceAndDuplicateReturn_saveExactlyOneOrdinaryRecipeWithOriginalServings() throws Exception {
        click("新增菜谱"); click("手动录入"); fill("菜名", finalTitle); fill("个人备注", "G7 existing generated recipe"); click("保存菜谱");
        until("!!document.querySelector('.v2-detail-title')"); JSONArray existing = byFinalTitle(); assertEquals(1, existing.length());
        String originalRow = existing.getJSONObject(0).toString(), existingId = existing.getJSONObject(0).getString("id"); click("返回菜谱库");
        preview(true); watch(); fill("菜名", finalTitle); fill("约几人份", "3"); fill("个人备注", "G7 edited generated note");
        until("!!document.querySelector('input[type=checkbox]')"); js("document.querySelector('input[type=checkbox]').click()");
        until("document.querySelector('input[type=checkbox]').checked===true"); click("查看本轮来源");
        until("!!(" + dialog("本轮来源") + ")");
        js("document.querySelector('img[alt=\"本轮截图 1\"]')?.scrollIntoView({block:'center'})");
        until("(()=>{const i=document.querySelector('img[alt=\"本轮截图 1\"]');return !!i&&i.complete&&i.naturalWidth===64&&i.naturalHeight===64})()");
        screenshot("g7-native-image-source.png"); click("关闭本轮来源"); until("!(" + dialog("本轮来源") + ")");
        assertEquals("true", js("document.querySelector('input[type=checkbox]').checked")); fill("用量 1", "15 毫升");
        until("document.querySelector('input[type=checkbox]').checked===false");
        assertEquals("true", js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='确认保存菜谱').disabled"));
        js("document.querySelector('input[type=checkbox]').click()"); click("确认保存菜谱"); until("!!(" + dialog("已存在同名菜谱") + ")");
        if (awaitSettledImeState("duplicate-open")) {
            imeDiagnostic("duplicate-before-keyboard-back"); back(); awaitIme(false); imeDiagnostic("duplicate-after-keyboard-back");
            assertEquals("Visible IME Back must not reach the duplicate page; " + lastImeProbe, "0", js("window.__g7PageBacks"));
            assertEquals("Visible IME Back must retain the duplicate decision; " + lastImeProbe, "true", js("!!(" + dialog("已存在同名菜谱") + ")"));
            assertEquals("0", js("window.__g7Confirms"));
        }
        awaitIme(false); imeDiagnostic("duplicate-before-page-back");
        assertEquals("0", js("window.__g7PageBacks")); back(); awaitDuplicateClosedAfterSingleBack(); imeDiagnostic("duplicate-after-page-back");
        assertEquals("1", js("window.__g7PageBacks")); assertEquals("0", js("window.__g7Confirms"));
        assertEquals(finalTitle, js("(" + editor("菜名") + ").value"));
        assertEquals("3", js("(" + editor("约几人份") + ").value"));
        assertEquals("G7 edited generated note", js("(" + editor("个人备注") + ").value"));
        assertEquals("15 毫升", js("(" + editor("用量 1") + ").value"));
        assertEquals("true", js("document.querySelector('input[type=checkbox]').checked")); zeroWrites();
        assertEquals(1, byFinalTitle().length()); assertEquals(originalRow, byFinalTitle().getJSONObject(0).toString());
        click("确认保存菜谱"); until("!!(" + dialog("已存在同名菜谱") + ")");
        screenshot("g7-native-duplicate.png"); click("返回检查"); until("!(" + dialog("已存在同名菜谱") + ")");
        assertEquals("15 毫升", js("(" + editor("用量 1") + ").value")); zeroWrites();
        assertEquals(1, byFinalTitle().length()); assertEquals(originalRow, byFinalTitle().getJSONObject(0).toString());
        js("window.__g7Watch=false"); click("确认保存菜谱"); until("!!(" + dialog("已存在同名菜谱") + ")");
        js("(()=>{const b=" + button("仍然新建菜谱") + ";b.click();b.click();return true})()");
        until("document.querySelector('.v2-detail-title')?.textContent===" + JSONObject.quote(finalTitle));
        JSONArray rows = byFinalTitle(); assertEquals(2, rows.length()); JSONObject saved = null;
        for (int index = 0; index < rows.length(); index++) {
            JSONObject row = rows.getJSONObject(index);
            if (row.getString("id").equals(existingId)) assertEquals(originalRow, row.toString()); else saved = row;
        }
        assertNotNull(saved); String id = saved.getString("id"); assertEquals(3.0, saved.getDouble("servings"), 0.0);
        assertTrue(saved.isNull("cover_path")); assertEquals("G7 edited generated note", saved.getString("notes"));
        assertEquals("15 毫升", query("SELECT amount FROM recipe_ingredients WHERE recipe_id=? AND position=0", new JSONArray().put(id)).getJSONObject(0).getString("amount"));
        assertTrue(query("SELECT image_path FROM recipe_steps WHERE recipe_id=?", new JSONArray().put(id)).getJSONObject(0).isNull("image_path"));
        assertEquals(0, query("SELECT id FROM recipe_changes WHERE recipe_id=?", new JSONArray().put(id)).length());
        assertEquals(0, query("SELECT id FROM cooking_records WHERE recipe_id=?", new JSONArray().put(id)).length());
        until("document.querySelector('input[aria-label=\"本次做几人份\"]')?.value==='3'");
        assertEquals("false", js("!!(" + button("查看本轮来源") + ")")); assertEquals(1, fakeHttp.get());
        assertFalse("Only the generated native temporary image must be released after save", new File(android.net.Uri.parse(selectedImage.previewUri).getPath()).exists());
    }
}
