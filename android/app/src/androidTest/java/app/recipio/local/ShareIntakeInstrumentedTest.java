package app.recipio.local;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.*;
import android.net.Uri;
import android.provider.Settings;
import android.view.KeyEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.lang.reflect.*;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import okhttp3.*;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;

/** Installed WebView + real SEND intents, generated external content and actual IME.
 * Only explicit Start/Read use scoped fake transports. No personal media or paid AI.
 */
@RunWith(AndroidJUnit4.class)
public class ShareIntakeInstrumentedTest {
    private static final String AUTH = "app.recipio.local.test.share-fixture";
    private static final String TEXT = "APK5C GENERATED 红烧鸡翅 🍚\n鸡翅500克\n先焯水，再小火煮熟。";
    private static final String URL = "https://recipes.example/generated?portion=2#steps";
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private final AtomicInteger posts = new AtomicInteger(), reads = new AtomicInteger();
    private final CountDownLatch aiEntered = new CountDownLatch(1), aiRelease = new CountDownLatch(1);
    private final CountDownLatch readEntered = new CountDownLatch(1), readRelease = new CountDownLatch(1);
    private final List<Uri> grants = new ArrayList<>();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private AndroidImeProbe ime;
    private String originalIme, alias, dataBefore;
    private File root;
    private AiNativeRuntime runtime;
    private ExecutorService aiWorker;
    private LocalBackupSession backupSession;
    private volatile boolean holdAi, holdRead;

    private static void field(Object target, String name, Object value) throws Exception {
        Field member = target.getClass().getDeclaredField(name); member.setAccessible(true); member.set(target, value);
    }
    private String js(String expression) throws Exception {
        AtomicReference<String> reply = new AtomicReference<>(); CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, value -> { reply.set(value); done.countDown(); }));
        assertTrue("WebView callback timeout", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + reply.get() + "]").optString(0);
    }
    private void until(String expression) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 35000;
        do { if ("true".equals(js(expression))) return; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Share intake UI condition: " + expression + "\n" + js("document.body.innerText.slice(0,1600)"));
    }
    private void click(String label) throws Exception {
        until("(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||e.textContent.trim())===" + JSONObject.quote(label) + ");if(!b||b.disabled)return false;b.click();return true})()");
    }
    private void input(String selector, String value) throws Exception {
        js("(()=>{const e=" + selector + ";Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e," + JSONObject.quote(value) + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
    }
    private String titleInput() { return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==='菜名').querySelector('input')"; }
    private Intent text(String value) {
        return new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, value)
            .setClass(instrumentation.getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }
    private Uri fixture(String mode) {
        Uri uri = Uri.parse("content://" + AUTH + "/" + mode);
        ShareMediaInboxInstrumentedTest.fixtureGrant(instrumentation.getTargetContext(),uri,true);
        grants.add(uri); return uri;
    }
    private Intent images(String companion, Uri... uris) {
        Intent intent = new Intent(uris.length == 1 ? Intent.ACTION_SEND : Intent.ACTION_SEND_MULTIPLE)
            .setType("image/png").setClass(instrumentation.getTargetContext(), MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (uris.length == 1) intent.putExtra(Intent.EXTRA_STREAM, uris[0]);
        else intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, new ArrayList<>(Arrays.asList(uris)));
        ClipData clips = ClipData.newUri(instrumentation.getContext().getContentResolver(), "Generated screenshots", uris[0]);
        for (int i = 1; i < uris.length; i++) clips.addItem(new ClipData.Item(uris[i]));
        intent.setClipData(clips); if (companion != null) intent.putExtra(Intent.EXTRA_TEXT, companion); return intent;
    }
    private void send(Intent intent) { instrumentation.getTargetContext().startActivity(intent); }
    private void launch(Intent intent) throws Exception {
        launch(intent,false);
    }
    private void launch(Intent intent,boolean expectsAiInput) throws Exception {
        scenario = ActivityScenario.launch(intent);
        scenario.onActivity(a -> { activity = a; web = a.getBridge().getWebView(); ime = new AndroidImeProbe(a); });
        // Install fake native transports before deliberately clicking either paid/online action.
        nativeFakes();
        // Cold Share may route before the observer sees the transient home header.
        // Wait for its stable destination; ordinary launches still require home.
        until(expectsAiInput?"document.body.innerText.includes('AI 整理菜谱')&&!!document.querySelector('textarea')":"!!document.querySelector('button[aria-label=\"新增菜谱\"]')");
        dataBefore = databaseSnapshot();
    }
    private String fakeDraft() throws Exception {
        JSONObject recipe = new JSONObject().put("title", "APK5C GENERATED AI REVIEW").put("totalMinutes", JSONObject.NULL)
            .put("servings", JSONObject.NULL).put("caloriesPerServing", JSONObject.NULL).put("coverPath", JSONObject.NULL).put("notes", "")
            .put("ingredients", new JSONArray().put(new JSONObject().put("name", "鸡翅").put("amount", "500克")))
            .put("steps", new JSONArray().put(new JSONObject().put("instruction", "先焯水，再煮熟").put("imagePath", JSONObject.NULL)))
            .put("preparations", new JSONArray()).put("keyTips", new JSONArray());
        return new JSONObject().put("recipe", recipe).put("fieldChecks", new JSONArray()).put("warnings", new JSONArray()).toString();
    }
    private void nativeFakes() throws Exception {
        Context target = instrumentation.getTargetContext(); root = new File(target.getCacheDir(), "share-ui-generated-" + UUID.randomUUID()); assertTrue(root.mkdir());
        for (String name : new String[] { "cache", "files", "no-backup" }) assertTrue(new File(root, name).mkdir());
        Context scoped = new ContextWrapper(target) {
            @Override public Context getApplicationContext() { return this; }
            @Override public File getCacheDir() { return new File(root, "cache"); }
            @Override public File getFilesDir() { return new File(root, "files"); }
            @Override public File getNoBackupFilesDir() { return new File(root, "no-backup"); }
        };
        Constructor<AiNativeRuntime> constructor = AiNativeRuntime.class.getDeclaredConstructor(Context.class); constructor.setAccessible(true); runtime = constructor.newInstance(scoped);
        alias = "recipio-share-generated-" + UUID.randomUUID(); field(runtime, "secrets", AiSecretStore.open(scoped.getNoBackupFilesDir(), alias));
        runtime.secrets.save(("sk-" + UUID.randomUUID()).toCharArray());
        LocalAiIntakePlugin ai = (LocalAiIntakePlugin) activity.getBridge().getPlugin("LocalAiIntake").getInstance();
        Field previousRuntime = LocalAiIntakePlugin.class.getDeclaredField("runtime"); previousRuntime.setAccessible(true);
        // Cold sharing may already have created its session before onActivity runs.
        // Keep that real image owner/map when replacing only the test credential/transport.
        field(runtime, "images", ((AiNativeRuntime) previousRuntime.get(ai)).images(target)); field(ai, "runtime", runtime);
        Field worker = LocalAiIntakePlugin.class.getDeclaredField("worker"); worker.setAccessible(true); aiWorker = (ExecutorService) worker.get(ai);
        try (InputStream contract = target.getAssets().open("recipio-ai-intake-contract.json")) {
            field(ai, "client", new QwenClient(new AiIntakeContract(contract), (request, cancel) -> {
                posts.incrementAndGet(); aiEntered.countDown(); while (holdAi && !aiRelease.await(100, TimeUnit.MILLISECONDS)) cancel.check(); cancel.check();
                String body = new JSONObject().put("choices", new JSONArray().put(new JSONObject().put("finish_reason", "stop")
                    .put("message", new JSONObject().put("content", fakeDraft())))).toString();
                return new QwenClient.HttpReply(200, new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)), () -> {});
            }));
        }
        LocalAiSecretPlugin secret = (LocalAiSecretPlugin) activity.getBridge().getPlugin("LocalAiSecret").getInstance();
        field(secret, "store", runtime.secrets); field(secret, "lifecycle", runtime.lifecycle);
        LocalWebImportPlugin link = (LocalWebImportPlugin) activity.getBridge().getPlugin("LocalWebImport").getInstance();
        field(link, "fetcher", new SafeWebFetcher(host -> {
            if (!host.equals("recipes.example")) throw new java.net.UnknownHostException("Only generated fixture host is permitted");
            return List.of(InetAddress.getByName("93.184.216.34"));
        }, new OkHttpClient.Builder().addInterceptor(chain -> {
            reads.incrementAndGet(); readEntered.countDown();
            try { while (holdRead && !readRelease.await(100, TimeUnit.MILLISECONDS)) if (chain.call().isCanceled()) throw new IOException("cancelled"); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IOException("cancelled"); }
            if (chain.call().isCanceled()) throw new IOException("cancelled");
            String html = "<script type=\"application/ld+json\">{\"@type\":\"Recipe\",\"name\":\"APK5C GENERATED PARSER\",\"recipeIngredient\":[\"鸡翅500克\"],\"recipeInstructions\":[\"焯水后煮熟\"]}</script>";
            return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                .header("Content-Type", "text/html; charset=utf-8").body(ResponseBody.create(html, MediaType.get("text/html; charset=utf-8"))).build();
        }).build()));
    }
    private String databaseSnapshot() throws Exception {
        js("window.__shareData=null;Promise.all(['recipes','recipe_ingredients','recipe_steps','recipe_preparations','recipe_key_tips','recipe_changes','cooking_records','backup_restore_state'].map(table=>window.Capacitor.nativePromise('CapacitorSQLite','query',{database:'recipio',statement:'SELECT * FROM '+table+' ORDER BY rowid',values:[],readonly:false}).then(r=>r.values))).then(r=>window.__shareData=JSON.stringify(r),()=>window.__shareData='ERROR')");
        until("window.__shareData!==null"); String value = js("window.__shareData"); assertNotEquals("Recipe data must be readable", "ERROR", value); return value;
    }
    private void noAutomaticWork() throws Exception {
        assertEquals("Receiving a share must not POST", 0, posts.get()); assertEquals("Receiving a share must not read a page", 0, reads.get());
        assertEquals("Receiving a share must not write business data", dataBefore, databaseSnapshot());
        assertEquals("false", js("document.body.innerText.includes('检查 AI 整理结果')||document.body.innerText.includes('检查网页菜谱')"));
    }
    private void aiInput(String value, int count) throws Exception {
        until("document.querySelector('textarea')?.value===" + JSONObject.quote(value) + "&&document.querySelectorAll('img[alt^=\"截图 \"]').length===" + count);
        if (count > 0) until("[...document.querySelectorAll('img[alt^=\"截图 \"]')].every(i=>i.complete&&i.naturalWidth>0&&!i.hidden)");
        assertEquals("false", js("!!document.querySelector('input[type=url]')"));
    }
    private void pending() throws Exception { until("!!document.querySelector('[aria-label=\"待处理分享\"]')"); }
    private String previews() throws Exception { return js("JSON.stringify([...document.querySelectorAll('img[alt^=\"截图 \"]')].map(i=>i.src))"); }
    private File previewFile(String source) throws Exception {
        Uri uri = Uri.parse(source); String path = uri.getPath(); int start = path.indexOf("/ai-import/");
        assertTrue("Only own AI temporary preview namespace", start >= 0);
        File file = new File(instrumentation.getTargetContext().getCacheDir(), path.substring(start + 1));
        assertTrue(file.getCanonicalPath().startsWith(new File(instrumentation.getTargetContext().getCacheDir(), "ai-import").getCanonicalPath() + File.separator));
        return file;
    }
    private void waitAbsent(File file) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 10000;
        while (file.exists() && android.os.SystemClock.elapsedRealtime() < deadline) Thread.sleep(50);
        assertFalse("Owned temporary file is released", file.exists());
    }
    private void discardAi() throws Exception { click("返回"); click("放弃本轮整理"); until("!document.body.innerText.includes('AI 整理菜谱')"); }
    @Before public void setup() throws Exception {
        assertTrue("Dedicated emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        ShareTargetInbox.PROCESS.consume();
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        instrumentation.getUiAutomation().executeShellCommand("settings put secure show_ime_with_hard_keyboard 1").close();
    }
    @After public void cleanup() throws Exception {
        aiRelease.countDown(); readRelease.countDown();
        try {
            if (scenario != null) scenario.close();
            if (aiWorker != null) assertTrue("Fake AI worker terminates", aiWorker.awaitTermination(10, TimeUnit.SECONDS));
            ShareTargetInbox.PROCESS.consume();
            for (Uri uri : grants) ShareMediaInboxInstrumentedTest.fixtureGrant(instrumentation.getTargetContext(),uri,false);
            if (backupSession != null) backupSession.cleanup(Collections.emptySet(), null, false);
            if (runtime != null) runtime.secrets.delete();
            if (alias != null) { KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null); if (keys.containsAlias(alias)) keys.deleteEntry(alias); }
            if (root != null) LocalBackupArchive.deleteOwnedTree(root);
        } finally {
            instrumentation.getUiAutomation().executeShellCommand(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard" : "settings put secure show_ime_with_hard_keyboard " + originalIme).close();
        }
    }

    @Test public void coldText_preservesChineseMultilineEmoji_withoutAutomaticWork() throws Exception {
        launch(text(TEXT),true); aiInput(TEXT, 0); noAutomaticWork();
        assertFalse(activity.getIntent().hasExtra(Intent.EXTRA_TEXT));
        scenario.recreate(); scenario.onActivity(a -> { activity = a; web = a.getBridge().getWebView(); });
        until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");
        assertEquals("false", js("!!document.querySelector('textarea')||!!document.querySelector('[aria-label=\"待处理分享\"]')"));
    }
    @Test public void coldPng_transfersToAi_withoutAutomaticWork() throws Exception {
        launch(images(null, fixture("png")),true); aiInput("", 1); noAutomaticWork();
        assertFalse(activity.getIntent().hasExtra(Intent.EXTRA_STREAM)); assertNull(activity.getIntent().getClipData());
    }
    @Test public void warmTextAndEmptyAi_preserveExactInput_withoutAutomaticWork() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); send(text(TEXT)); aiInput(TEXT, 0); noAutomaticWork();
        discardAi(); click("新增菜谱"); click("AI 整理"); aiInput("", 0);
        String second = "APK5C GENERATED 第二段 🍲\n保留换行"; send(text(second)); aiInput(second, 0); noAutomaticWork();
    }
    @Test public void warmEmptyAi_acceptsImageAndUrlDescription_asAiInput() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); click("新增菜谱"); click("AI 整理"); aiInput("", 0);
        String description = "APK5C GENERATED 截图的做法\n" + URL;
        send(images(description, fixture("png"))); aiInput(description, 1); noAutomaticWork();
    }
    @Test public void warmMultiple_deduplicatesInOrder_movesRemovesAndCancelsOwnedFiles() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        Uri png = fixture("png"), jpeg = fixture("jpeg"), webp = fixture("webp"); send(images(TEXT, png, jpeg, png, webp)); aiInput(TEXT, 3);
        assertEquals("true", js("[...document.querySelectorAll('ol li')].filter(i=>i.querySelector('img[alt^=\"截图 \"]')).map(i=>i.innerText).every((t,n)=>t.includes(n===1?'100 × 100':'200 × 100'))"));
        JSONArray before = new JSONArray(previews()); File removed = previewFile(before.getString(1));
        click("前移截图 2"); until("document.querySelector('img[alt=\"截图 1\"]').src===" + JSONObject.quote(before.getString(1)));
        click("移除截图 1"); aiInput(TEXT, 2); waitAbsent(removed);
        assertEquals(before.getString(0), js("document.querySelector('img[alt=\"截图 1\"]').src"));
        File first = previewFile(before.getString(0)), third = previewFile(before.getString(2)); noAutomaticWork(); discardAi(); waitAbsent(first); waitAbsent(third);
        assertEquals(dataBefore, databaseSnapshot());
    }
    @Test public void dirtyEditor_defersTextAndMedia_ignorePreservesDraft() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); click("新增菜谱"); click("手动录入"); input(titleInput(), "APK5C GENERATED 手动草稿");
        send(text(TEXT)); pending(); assertEquals("APK5C GENERATED 手动草稿", js("(" + titleInput() + ").value"));
        send(images(TEXT, fixture("png"))); pending(); until("document.querySelector('[aria-label=\"待处理分享\"]').innerText.includes('1 张')");
        assertEquals("APK5C GENERATED 手动草稿", js("(" + titleInput() + ").value"));
        click("忽略这次分享"); until("!document.querySelector('[aria-label=\"待处理分享\"]')");
        assertEquals("APK5C GENERATED 手动草稿", js("(" + titleInput() + ").value")); noAutomaticWork();
    }
    @Test public void dirtyAiTextAndImages_surviveReplacementAndIgnore() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); send(images(TEXT, fixture("png"))); aiInput(TEXT, 1); String before = previews();
        send(text("APK5C GENERATED 后来文字")); pending(); aiInput(TEXT, 1);
        send(images("APK5C GENERATED 后来图片", fixture("jpeg"))); pending();
        until("document.querySelector('[aria-label=\"待处理分享\"]').innerText.includes('替换')");
        assertEquals(before, previews()); click("忽略这次分享"); until("!document.querySelector('[aria-label=\"待处理分享\"]')");
        aiInput(TEXT, 1); assertEquals(before, previews()); noAutomaticWork();
    }
    @Test public void explicitFakeAi_inflightAndPreviewProtected_reviewGatePreventsSave() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); send(images(TEXT, fixture("png"))); aiInput(TEXT, 1); noAutomaticWork();
        holdAi = true; click("开始 AI 整理"); assertTrue(aiEntered.await(8, TimeUnit.SECONDS)); send(text("APK5C GENERATED 在途分享")); pending();
        assertEquals(TEXT, js("document.querySelector('textarea').value")); assertEquals(1, posts.get());
        assertEquals("true", js("document.body.innerText.includes('正在整理')")); click("忽略这次分享"); aiRelease.countDown();
        until("document.body.innerText.includes('检查 AI 整理结果')"); input(titleInput(), "APK5C GENERATED 用户修改");
        send(images(null, fixture("jpeg"))); pending(); assertEquals("APK5C GENERATED 用户修改", js("(" + titleInput() + ").value"));
        click("忽略这次分享"); click("快速保存菜谱"); until("document.activeElement?.getAttribute('aria-label')==='AI 整理审核'");
        assertEquals("false", js("document.querySelector('input[type=checkbox]').checked")); assertEquals(dataBefore, databaseSnapshot()); assertEquals(1, posts.get()); assertEquals(0, reads.get());
    }
    @Test public void linkUrlFetchAndParserPreview_surviveSharedMedia() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); send(text(URL)); until("document.querySelector('input[type=url]')?.value===" + JSONObject.quote(URL)); noAutomaticWork();
        send(images(TEXT, fixture("png"))); pending(); assertEquals(URL, js("document.querySelector('input[type=url]').value")); click("忽略这次分享");
        holdRead = true; click("读取网页"); assertTrue(readEntered.await(8, TimeUnit.SECONDS)); send(text(TEXT)); pending();
        assertEquals("true", js("document.body.innerText.includes('正在安全读取网页')")); assertEquals(1, reads.get()); click("忽略这次分享"); readRelease.countDown();
        until("document.body.innerText.includes('检查网页菜谱')"); input(titleInput(), "APK5C GENERATED 网页修改"); send(images(null, fixture("jpeg"))); pending();
        assertEquals("APK5C GENERATED 网页修改", js("(" + titleInput() + ").value")); click("忽略这次分享");
        assertEquals(1, reads.get()); assertEquals(0, posts.get()); assertEquals(dataBefore, databaseSnapshot());
    }
    @Test public void multipleLinks_requireExplicitTextChoice_withoutFetching() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); String source = TEXT + "\n" + URL + "\nhttps://second.example/recipe";
        send(text(source)); pending(); assertEquals("false", js("!!document.querySelector('textarea')||!!document.querySelector('input[type=url]')"));
        click("整理这段分享文字"); aiInput(source, 0); noAutomaticWork();
    }
    @Test public void backupPreview_defersShare_andCancelPreservesDatabase() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        // Only the chooser result is injected. Archive validation, native staging,
        // service preview/cancel and unchanged SQLite are the real installed code.
        File archive = new File(root, "generated-empty.recipio");
        JSONObject empty = new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"cookingRecords\":[],\"settings\":{}}");
        LocalBackupArchive.write(archive, empty, Collections.emptyList(), "test", 15, 4);
        LocalBackupArchive.Validated validated = LocalBackupArchive.validate(archive);
        backupSession = LocalBackupSession.create(instrumentation.getTargetContext().getFilesDir(), "restore");
        LocalBackupPlugin backup = (LocalBackupPlugin) activity.getBridge().getPlugin("LocalBackup").getInstance(); field(backup, "active", backupSession); field(backup, "restore", validated);
        JSONObject choice = new JSONObject().put("token", backupSession.token).put("manifest", validated.manifest).put("data", validated.data);
        js("window.__shareOriginalPromise=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(p,m,o){if(p==='LocalBackup'&&m==='chooseRestore')return Promise.resolve(" + choice + ");return window.__shareOriginalPromise.call(this,p,m,o)}");
        click("设置"); click("导入并恢复"); until("document.body.innerText.includes('恢复并替换当前数据')");
        send(images(TEXT, fixture("png"))); pending(); assertEquals("true", js("document.body.innerText.includes('恢复并替换当前数据')"));
        until("document.querySelector('[aria-label=\"待处理分享\"]').innerText.includes('1 张')");
        until("!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='打开这次分享')");
        assertEquals("true", js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='打开这次分享').disabled"));
        click("忽略这次分享"); click("取消恢复"); until("document.body.innerText.includes('操作已取消')"); backupSession = null;
        noAutomaticWork();
    }
    private void awaitIme(boolean expected) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000;
        do { if (ime.settled(instrumentation, expected)) return; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Actual platform IME visible=" + expected);
    }
    private void openIme() throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000; AtomicBoolean focused = new AtomicBoolean();
        do { instrumentation.runOnMainSync(() -> focused.set(activity.hasWindowFocus())); if (focused.get()) break; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        assertTrue("Owned Activity input focus", focused.get());
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=document.querySelector('textarea');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth,innerHeight]})())"));
        assertTrue(point.getDouble(1) > 0 && point.getDouble(1) < point.getDouble(3));
        int[] origin = new int[2]; instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin)); float scale = web.getWidth() / (float) point.getDouble(2);
        int x = origin[0] + Math.round((float) point.getDouble(0) * scale), y = origin[1] + Math.round((float) point.getDouble(1) * scale);
        try (InputStream command = new android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand("input tap " + x + " " + y))) { while (command.read() != -1) {} }
        awaitIme(true); until("document.activeElement===document.querySelector('textarea')");
    }
    @Test public void sharedTextAndMedia_firstBackOnlyHidesActualIme_secondBackConfirmsDiscard() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); send(images(TEXT, fixture("png"))); aiInput(TEXT, 1); String before = previews();
        js("window.__shareBacks=0;window.addEventListener('recipio:back',()=>window.__shareBacks++)"); openIme();
        instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); awaitIme(false); aiInput(TEXT, 1); assertEquals(before, previews());
        assertEquals("0", js("window.__shareBacks")); assertEquals("false", js("!!document.querySelector('[role=dialog]')"));
        instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); until("!!document.querySelector('[role=dialog]')"); click("继续整理");
        aiInput(TEXT, 1); assertEquals(before, previews()); noAutomaticWork();
    }
}
