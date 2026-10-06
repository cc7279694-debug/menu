package app.recipio.local;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Rect;
import android.net.Uri;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.net.InetAddress;
import java.util.concurrent.atomic.AtomicInteger;
import okhttp3.*;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.*;
import org.junit.runner.RunWith;

/** Installed WebView + real Android Intent/Share Sheet/IME. Only the Fake HTTP case clicks Read. */
@RunWith(AndroidJUnit4.class)
public class ShareTargetInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private String originalIme;
    private AndroidImeProbe ime;
    private static final String URL = "https://generated.example/recipe?portion=2&token=generated#step";
    private Intent share(String text) { return new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text).setClass(instrumentation.getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); }
    private void launch(Intent intent) throws Exception {
        scenario = ActivityScenario.launch(intent);
        scenario.onActivity(a -> { activity = a; web = a.getBridge().getWebView(); ime = new AndroidImeProbe(a); });
        until("document.body.innerText.includes('自己的做法，随时翻开')");
    }
    private String js(String expression) throws Exception {
        AtomicReference<String> value = new AtomicReference<>(); CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, reply -> { value.set(reply); done.countDown(); }));
        assertTrue("WebView callback", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + value.get() + "]").optString(0);
    }
    private void until(String expression) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 15000;
        do { if ("true".equals(js(expression))) return; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Generated Share UI condition: " + expression + "\nUI: " + js("document.body.innerText.slice(0,1500)"));
    }
    private void click(String label) throws Exception {
        until("(()=>{const e=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||e.textContent.trim())===" + JSONObject.quote(label) + ");if(!e||e.disabled)return false;e.click();return true})()");
    }
    private void send(Intent intent) { instrumentation.getTargetContext().startActivity(intent); }
    private void input(String selector, String value) throws Exception {
        js("(()=>{const e=" + selector + ";Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e," + JSONObject.quote(value) + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
    }
    private String titleInput() { return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==='菜名').querySelector('input')"; }
    private void assertPrefill(String url) throws Exception {
        until("document.querySelector('input[type=url]')?.value===" + JSONObject.quote(url));
        assertEquals("false", js("document.body.innerText.includes('正在安全读取网页')||document.body.innerText.includes('检查网页菜谱')||document.body.innerText.includes('检查 AI 整理结果')"));
        assertEquals("true", js("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='读取网页'&&b.disabled===" + (url.isEmpty() ? "true" : "false") + ")"));
    }
    @Before public void setup() throws Exception {
        assertTrue("Owned emulator tests only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        ShareTargetInbox.PROCESS.consume();
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        instrumentation.getUiAutomation().executeShellCommand("settings put secure show_ime_with_hard_keyboard 1").close();
    }
    @After public void cleanup() throws Exception {
        if (scenario != null) scenario.close(); ShareTargetInbox.PROCESS.consume();
        instrumentation.getUiAutomation().executeShellCommand(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard" : "settings put secure show_ime_with_hard_keyboard " + originalIme).close();
    }
    @Test public void coldStart_realIntent_lateListener_prefillsWithoutRead() throws Exception {
        launch(share("生成测试菜\n" + URL)); assertPrefill(URL);
        assertEquals(Intent.ACTION_SEND, activity.getIntent().getAction());
        assertFalse(activity.getIntent().hasExtra(Intent.EXTRA_TEXT));
        scenario.recreate(); scenario.onActivity(a -> { activity = a; web = a.getBridge().getWebView(); });
        until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");
        assertEquals("false", js("!!document.querySelector('input[type=url]')"));
    }
    @Test public void warmStart_realOnNewIntent_exactDedupe_preservesQueryAndFragment() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        send(share(URL + "\n" + URL)); assertPrefill(URL);
        send(share("https://second.example/r")); until("!!document.querySelector('[aria-label=\"待处理分享\"]')");
        assertEquals(URL, js("document.querySelector('input[type=url]').value"));
        assertEquals("false", js("document.querySelector('[aria-label=\"待处理分享\"]').innerText.includes('token=')"));
    }
    @Test public void dirtyEditor_survivesShare_thenExplicitOpen() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); click("新增菜谱"); click("手动录入");
        input(titleInput(), "APK5B GENERATED 草稿"); send(share(URL)); until("!!document.querySelector('[aria-label=\"待处理分享\"]')");
        assertEquals("APK5B GENERATED 草稿", js("(" + titleInput() + ").value")); assertEquals("false", js("!!document.querySelector('input[type=url]')"));
        // Test-owned unsaved draft only. User confirmation stays explicit in normal UI.
        js("window.confirm=()=>true"); click("取消"); until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");
        assertEquals("false", js("!!document.querySelector('input[type=url]')")); click("打开分享的链接"); assertPrefill(URL);
    }
    @Test public void aiTextSurvivesShare_withoutStartingProvider() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class)); click("新增菜谱"); click("AI 整理");
        until("!!document.querySelector('textarea')"); input("document.querySelector('textarea')", "APK5B GENERATED AI文字");
        send(share(URL)); until("!!document.querySelector('[aria-label=\"待处理分享\"]')");
        assertEquals("APK5B GENERATED AI文字", js("document.querySelector('textarea').value")); assertEquals("false", js("!!document.querySelector('input[type=url]')"));
        assertEquals("false", js("document.body.innerText.includes('正在整理')"));
    }
    @Test public void unsupportedAttachmentsAndHtml_areNotConsumed() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        LocalShareTargetPlugin plugin = (LocalShareTargetPlugin) activity.getBridge().getPlugin("LocalShareTarget").getInstance();
        for (Intent intent : new Intent[] {
            new Intent(Intent.ACTION_SEND_MULTIPLE).setType("text/plain").putExtra(Intent.EXTRA_TEXT, URL),
            new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_TEXT, URL),
            new Intent(Intent.ACTION_VIEW).setData(Uri.parse(URL)),
            new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_STREAM, Uri.parse("content://generated/not-opened")),
            new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_HTML_TEXT, "<a>" + URL + "</a>")
        }) {
            instrumentation.runOnMainSync(() -> plugin.handleOnNewIntent(intent)); assertNull(ShareTargetInbox.PROCESS.consume());
        }
        assertEquals("false", js("!!document.querySelector('[aria-label=\"待处理分享\"]')||!!document.querySelector('input[type=url]')"));
    }
    @Test public void invalidMultipleLinks_showReason_withoutAI() throws Exception {
        launch(share(URL + " https://other.example/r")); until("document.body.innerText.includes('多个不同链接')");
        assertEquals("false", js("!!document.querySelector('textarea')||!!document.querySelector('input[type=url]')"));
        click("手动输入网页链接"); assertPrefill("");
    }
    @Test public void plainTextWithoutUrl_showsReason_withoutEnteringAI() throws Exception {
        launch(share("APK5B GENERATED 这是普通文字，没有链接"));
        until("document.body.innerText.includes('分享内容里没有网页链接')");
        assertEquals("false", js("!!document.querySelector('textarea')||!!document.querySelector('input[type=url]')"));
    }
    @Test public void destroyedBridgeQueuedConsume_cannotStealNextColdShare() throws Exception {
        // Capacitor quitSafely still runs queued plugin calls after onDestroy.
        // Reproduce that ordering directly, without timing guesses or a second Activity.
        LocalShareTargetPlugin retired = new LocalShareTargetPlugin();
        java.lang.reflect.Method destroy = com.getcapacitor.Plugin.class.getDeclaredMethod("handleOnDestroy");
        destroy.setAccessible(true); destroy.invoke(retired);
        ShareTargetInbox.PROCESS.offer(ShareTextParser.parse(Intent.ACTION_SEND, "text/plain", URL));
        AtomicReference<JSObject> reply = new AtomicReference<>();
        retired.consume(new PluginCall(null, "LocalShareTarget", "generated-stale-call", "consume", new JSObject()) {
            @Override public void resolve(JSObject value) { reply.set(value); }
        });
        assertEquals("empty", reply.get().getString("status"));
        ShareTargetInbox.Item retained = ShareTargetInbox.PROCESS.consume();
        assertNotNull("New Bridge must still own the cold receipt", retained);
        assertEquals(URL, retained.url);
    }
    @Test public void explicitRead_afterShare_usesExistingParser_onlyOnce() throws Exception {
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        AtomicInteger reads = new AtomicInteger(), aiPosts = new AtomicInteger();
        LocalWebImportPlugin plugin = (LocalWebImportPlugin) activity.getBridge().getPlugin("LocalWebImport").getInstance();
        Field fetcher = LocalWebImportPlugin.class.getDeclaredField("fetcher"); fetcher.setAccessible(true);
        String page = "<script type=\"application/ld+json\">{\"@type\":\"Recipe\",\"name\":\"APK5B GENERATED Parser\",\"recipeIngredient\":[\"米饭100克\"],\"recipeInstructions\":[\"煮熟\"]}</script>";
        fetcher.set(plugin, new SafeWebFetcher(host -> List.of(InetAddress.getByName("93.184.216.34")), new OkHttpClient.Builder().addInterceptor(chain -> {
            reads.incrementAndGet();
            return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK").header("Content-Type", "text/html; charset=utf-8").body(ResponseBody.create(page, MediaType.get("text/html; charset=utf-8"))).build();
        }).build()));
        LocalAiIntakePlugin ai = (LocalAiIntakePlugin) activity.getBridge().getPlugin("LocalAiIntake").getInstance();
        Field client = LocalAiIntakePlugin.class.getDeclaredField("client"); client.setAccessible(true);
        try (InputStream contract = instrumentation.getTargetContext().getAssets().open("recipio-ai-intake-contract.json")) {
            client.set(ai, new QwenClient(new AiIntakeContract(contract), (request, cancel) -> { aiPosts.incrementAndGet(); throw new java.io.IOException("Generated test rejects any AI call"); }));
        }
        send(share(URL)); assertPrefill(URL); assertEquals(0, reads.get()); assertEquals(0, aiPosts.get());
        click("读取网页"); until("document.body.innerText.includes('检查网页菜谱')");
        assertEquals("APK5B GENERATED Parser", js("(" + titleInput() + ").value"));
        assertEquals(1, reads.get()); assertEquals(0, aiPosts.get());
    }
    private boolean nativeClick(AccessibilityNodeInfo node, String label) {
        if (node == null) return false;
        if (label.contentEquals(node.getText() == null ? "" : node.getText()) || label.contentEquals(node.getContentDescription() == null ? "" : node.getContentDescription())) {
            AccessibilityNodeInfo target = node; while (target != null && !target.isClickable()) target = target.getParent();
            return target != null && target.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        for (int i = 0; i < node.getChildCount(); i++) if (nativeClick(node.getChild(i), label)) return true;
        return false;
    }
    @Test public void actualAndroidChooser_listsRecipio_forTextOnly() throws Exception {
        PackageManager manager = instrumentation.getTargetContext().getPackageManager();
        for (String type : new String[] { "text/plain", "image/png", "video/mp4", "audio/mpeg", "text/html", "application/octet-stream" }) {
            List<ResolveInfo> results = manager.queryIntentActivities(new Intent(Intent.ACTION_SEND).setType(type), PackageManager.MATCH_DEFAULT_ONLY);
            long owned = results.stream().filter(r -> r.activityInfo.packageName.equals("app.recipio.local")).count();
            assertEquals(type, type.equals("text/plain") ? 1 : 0, owned);
        }
        launch(new Intent(instrumentation.getTargetContext(), MainActivity.class));
        Intent payload = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, URL);
        instrumentation.getTargetContext().startActivity(Intent.createChooser(payload, "APK5B GENERATED SHARE").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        long deadline = android.os.SystemClock.elapsedRealtime() + 30000; boolean clicked = false;
        do { clicked = nativeClick(instrumentation.getUiAutomation().getRootInActiveWindow(), "谱序 RECIPIO"); if (clicked) break; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        assertTrue("RECIPIO actual Share Sheet item", clicked); assertPrefill(URL);
    }
    @Test public void sharedUrl_realImeBack_hidesKeyboard_beforePageNavigation() throws Exception {
        launch(share(URL)); assertPrefill(URL);
        awaitIme(false);
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=document.querySelector('input[type=url]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth]})())"));
        int[] origin = new int[2]; instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin));
        float scale = web.getWidth() / (float) point.getDouble(2); int x = origin[0] + Math.round((float) point.getDouble(0) * scale), y = origin[1] + Math.round((float) point.getDouble(1) * scale);
        try (InputStream command = new android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand("input tap " + x + " " + y))) { while (command.read() != -1) {} }
        awaitIme(true); instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); awaitIme(false);
        assertEquals(URL, js("document.querySelector('input[type=url]').value")); assertEquals("false", js("!!document.querySelector('[role=dialog]')"));
        instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); until("!!document.querySelector('[role=dialog]')");
    }
    private void awaitIme(boolean expected) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000;
        do { if (ime.settled(instrumentation, expected)) return; Thread.sleep(100); } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Actual IME visible=" + expected);
    }
}
