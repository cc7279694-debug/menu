package app.recipio.local;

import static org.junit.Assert.*;

import android.app.Instrumentation;
import android.provider.Settings;
import android.view.KeyEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Installed WebView/Capacitor/SQLite and real IME; generated fake Responses only, no Internet. */
@RunWith(AndroidJUnit4.class)
public class RecipeFinderUiInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private final Set<String> ownedTitles = new LinkedHashSet<>();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private AndroidImeProbe ime;
    private RecipeFinderTestProvider.Fixture fixture;
    private ExecutorService finderWorker, intakeWorker;
    private String originalIme;
    private boolean changedIme;

    private String input(String label, String tag) {
        return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==="
            + JSONObject.quote(label) + ")?.querySelector(" + JSONObject.quote(tag) + ")";
    }
    private String dishInput() { return input("想做什么菜", "input"); }
    private String preferenceInput() { return input("偏好（可选）", "textarea"); }
    private String titleInput() { return input("菜名", "input"); }
    private String js(String expression) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, value -> {
            result.set(value); done.countDown();
        }));
        assertTrue("WebView evaluation completed", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + result.get() + "]").optString(0);
    }
    private void until(String expression) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 15000;
        do {
            if ("true".equals(js(expression))) return;
            Thread.sleep(100);
        } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("UI condition: " + expression);
    }
    private void click(String label) throws Exception { clickIn("document", label); }
    private void clickIn(String scope, String label) throws Exception {
        until("(()=>{const b=[...(" + scope + ").querySelectorAll('button')].find(e=>"
            + "(e.getAttribute('aria-label')||e.textContent.trim())===" + JSONObject.quote(label)
            + ");if(!b||b.disabled)return false;b.click();return true})()");
    }
    private void setInput(String selector, String value) throws Exception {
        until("!!(" + selector + ")");
        js("(()=>{const e=" + selector + ";const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;"
            + "Object.getOwnPropertyDescriptor(p,'value').set.call(e," + JSONObject.quote(value)
            + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        until("(" + selector + ").value===" + JSONObject.quote(value));
    }
    private void finder() throws Exception {
        click("新增菜谱"); click("帮我找做法"); until("!!(" + dishInput() + ")");
    }
    private void search(String dish, String preference) throws Exception {
        setInput(dishInput(), dish); setInput(preferenceInput(), preference); click("开始寻找");
    }
    private void results(int count) throws Exception {
        until("document.querySelector('[aria-label=\"找到的做法\"]')?.querySelectorAll('article').length===" + count);
        until("document.body.innerText.includes(" + JSONObject.quote("找到 " + count + " 个做法，请选择") + ")");
    }
    private void select(int index) throws Exception {
        until("(()=>{const b=document.querySelector('[aria-label=\"找到的做法\"]')?.querySelectorAll('article')["
            + index + "]?.querySelector('button');if(!b||b.disabled)return false;b.click();return true})()");
    }
    private void counts(int search, int extract) {
        assertEquals(search, fixture.searchPosts.get());
        assertEquals(extract, fixture.extractPosts.get());
        assertEquals(search + extract, fixture.posts.get());
    }
    private JSONArray query(String sql, JSONArray values) throws Exception {
        js("window.__apk6Rows=null;window.Capacitor.nativePromise('CapacitorSQLite','query',"
            + new JSONObject().put("database", "recipio").put("statement", sql).put("values", values).put("readonly", false)
            + ").then(r=>window.__apk6Rows=JSON.stringify(r.values),()=>window.__apk6Rows='ERROR')");
        until("window.__apk6Rows!==null");
        String rows = js("window.__apk6Rows");
        assertNotEquals("Generated-record SQLite query failed", "ERROR", rows);
        return new JSONArray(rows);
    }
    private JSONArray recipes(String title) throws Exception {
        return query("SELECT * FROM recipes WHERE title=?", new JSONArray().put(title));
    }
    private void ownTitle(String title) throws Exception {
        assertTrue(title.startsWith(fixture.title));
        assertEquals("Generated UUID title must not preexist", 0, recipes(title).length());
        ownedTitles.add(title);
    }
    private void noGeneratedSave() throws Exception { assertEquals(0, recipes(fixture.title).length()); }
    private void removeOwnedRows() throws Exception {
        for (String title : ownedTitles) {
            JSONArray rows = recipes(title);
            for (int i = 0; i < rows.length(); i++) {
                JSONObject row = rows.getJSONObject(i);
                String id = row.getString("id");
                assertEquals(id, UUID.fromString(id).toString());
                assertEquals(title, row.getString("title"));
                assertTrue(title.startsWith(fixture.title));
                JSONObject statement = new JSONObject().put("statement", "DELETE FROM recipes WHERE id=? AND title=?")
                    .put("values", new JSONArray().put(id).put(title));
                js("window.__apk6Delete=null;window.Capacitor.nativePromise('CapacitorSQLite','executeSet',"
                    + new JSONObject().put("database", "recipio").put("set", new JSONArray().put(statement)).put("transaction", true)
                    + ").then(()=>window.__apk6Delete='OK',()=>window.__apk6Delete='ERROR')");
                until("window.__apk6Delete!==null");
                assertEquals("OK", js("window.__apk6Delete"));
            }
            assertEquals(0, recipes(title).length());
        }
    }
    private void shell(String command) throws Exception {
        try (InputStream stream = new android.os.ParcelFileDescriptor.AutoCloseInputStream(
            instrumentation.getUiAutomation().executeShellCommand(command))) {
            byte[] buffer = new byte[256]; while (stream.read(buffer) != -1) { }
        }
    }
    private void awaitWindow() throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000;
        AtomicBoolean focused = new AtomicBoolean();
        do {
            instrumentation.runOnMainSync(() -> focused.set(activity.hasWindowFocus()));
            if (focused.get()) return;
            Thread.sleep(100);
        } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Owned RECIPIO Activity must have input focus");
    }
    private void awaitIme(boolean visible) throws Exception {
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000;
        do {
            if (ime.settled(instrumentation, visible)) return;
            Thread.sleep(100);
        } while (android.os.SystemClock.elapsedRealtime() < deadline);
        fail("Actual IME visible=" + visible);
    }
    private void openIme(String selector) throws Exception {
        awaitWindow();
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=" + selector
            + ";e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();"
            + "return [r.x+r.width/2,r.y+r.height/2,innerWidth,innerHeight]})())"));
        assertTrue("Actual input inside viewport", point.getDouble(1) > 0 && point.getDouble(1) < point.getDouble(3));
        int[] origin = new int[2];
        instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin));
        float scale = web.getWidth() / (float) point.getDouble(2);
        shell("input tap " + Math.round(origin[0] + point.getDouble(0) * scale)
            + " " + Math.round(origin[1] + point.getDouble(1) * scale));
        awaitIme(true); until("document.activeElement===(" + selector + ")");
    }
    private void back() { instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); }
    private ExecutorService worker(Object plugin) throws Exception {
        Field field = plugin.getClass().getDeclaredField("worker"); field.setAccessible(true);
        return (ExecutorService) field.get(plugin);
    }
    private void flushFinder() throws Exception {
        finderWorker.submit(() -> { }).get(8, TimeUnit.SECONDS);
        instrumentation.waitForIdleSync();
    }
    private CountDownLatch observeNativeCancellation() throws Exception {
        Object plugin = activity.getBridge().getPlugin("LocalRecipeFinder").getInstance();
        Field field = plugin.getClass().getDeclaredField("activeToken"); field.setAccessible(true);
        CountDownLatch cancelled = new CountDownLatch(1);
        synchronized (plugin) {
            AiRequestLifecycle.Token token = (AiRequestLifecycle.Token) field.get(plugin);
            assertNotNull("Held fake request owns a native token", token);
            token.onCancel(cancelled::countDown);
        }
        return cancelled;
    }

    @Before public void setup() throws Exception {
        assertTrue("Dedicated emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        assertTrue("Known emulator IME preference", originalIme == null || originalIme.equals("0") || originalIme.equals("1"));
        changedIme = true; shell("settings put secure show_ime_with_hard_keyboard 1");
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(a -> { activity = a; web = a.getBridge().getWebView(); ime = new AndroidImeProbe(a); });
        until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')"); awaitWindow();
        fixture = RecipeFinderTestProvider.install(activity);
        finderWorker = worker(activity.getBridge().getPlugin("LocalRecipeFinder").getInstance());
        intakeWorker = worker(activity.getBridge().getPlugin("LocalAiIntake").getInstance());
        ownTitle(fixture.title);
    }
    @After public void cleanup() throws Exception {
        try {
            if (fixture != null) fixture.release.countDown();
            if (finderWorker != null) flushFinder();
            if (fixture != null && web != null) removeOwnedRows();
        } finally {
            try {
                if (scenario != null) scenario.close();
                if (finderWorker != null) assertTrue("Finder worker stopped", finderWorker.awaitTermination(8, TimeUnit.SECONDS));
                if (intakeWorker != null) assertTrue("Intake worker stopped", intakeWorker.awaitTermination(8, TimeUnit.SECONDS));
            } finally {
                try { if (fixture != null) fixture.close(); }
                finally {
                    if (changedIme) shell(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard"
                        : "settings put secure show_ime_with_hard_keyboard " + originalIme);
                }
            }
        }
    }

    @Test public void homeTypingAndEntry_zeroPosts_explicitStartExactlyOne() throws Exception {
        String dish = "APK6 搜索 " + UUID.randomUUID();
        setInput("document.querySelector('input[placeholder=\"搜索菜名或食材\"]')", dish);
        until("document.body.innerText.includes(" + JSONObject.quote("帮我找『" + dish + "』的做法") + ")");
        counts(0, 0);
        click("帮我找『" + dish + "』的做法"); until("!!(" + dishInput() + ")");
        assertEquals(dish, js("(" + dishInput() + ").value")); counts(0, 0);
        click("开始寻找"); results(3); counts(1, 0); noGeneratedSave();
    }

    @Test public void secondSource_reviewGate_editSave_realSqliteWithoutSourceMetadata() throws Exception {
        String dish = "APK6 请求 " + UUID.randomUUID(), preference = "APK6 偏好 " + UUID.randomUUID();
        String edited = fixture.title + " EDITED"; ownTitle(edited);
        finder(); search(dish, preference); results(3); counts(1, 0);
        assertEquals(fixture.title + " 2", js("document.querySelector('[aria-label=\"找到的做法\"]').querySelectorAll('article')[1].querySelector('h4').textContent"));
        select(1); until("document.body.innerText.includes('检查 AI 整理结果')"); counts(1, 1);
        assertEquals("false", js("document.querySelector('input[type=checkbox]').checked"));
        setInput(titleInput(), edited); click("快速保存菜谱");
        until("document.activeElement?.getAttribute('aria-label')==='AI 整理审核'");
        assertEquals(0, recipes(edited).length()); noGeneratedSave();
        js("document.querySelector('input[type=checkbox]').click()");
        until("document.querySelector('input[type=checkbox]').checked"); click("快速保存菜谱");
        until("document.body.innerText.includes('编辑菜谱')");
        JSONArray rows = recipes(edited); assertEquals(1, rows.length());
        JSONObject row = rows.getJSONObject(0); String id = row.getString("id");
        assertEquals(id, UUID.fromString(id).toString()); assertTrue(row.isNull("cover_path")); assertEquals("", row.getString("notes"));
        JSONArray steps = query("SELECT instruction,image_path FROM recipe_steps WHERE recipe_id=? ORDER BY position", new JSONArray().put(id));
        assertEquals(1, steps.length()); assertEquals("小火煮20分钟", steps.getJSONObject(0).getString("instruction"));
        assertTrue(steps.getJSONObject(0).isNull("image_path"));
        JSONArray ingredients = query("SELECT name,amount FROM recipe_ingredients WHERE recipe_id=? ORDER BY position", new JSONArray().put(id));
        assertEquals(1, ingredients.length()); assertEquals("鸭肉", ingredients.getJSONObject(0).getString("name")); assertEquals("500克", ingredients.getJSONObject(0).getString("amount"));
        JSONArray changes = query("SELECT before_json,after_json FROM recipe_changes WHERE recipe_id=?", new JSONArray().put(id));
        String saved = rows.toString() + steps + ingredients + changes;
        assertFalse(saved.contains("recipes.example")); assertFalse(saved.contains(dish)); assertFalse(saved.contains(preference));
        assertEquals(4, query("PRAGMA user_version", new JSONArray()).getJSONObject(0).getInt("user_version"));
        counts(1, 1);
    }

    @Test public void unmatchedSearchSource_notRenderedOrSelectable() throws Exception {
        fixture.mode = RecipeFinderTestProvider.Mode.UNVERIFIED_CANDIDATE;
        finder(); search("生成鸭肉做法", ""); results(2);
        assertEquals("false", js("document.body.innerText.includes(" + JSONObject.quote(fixture.title + " 2") + ")"));
        assertEquals("false", js("document.body.innerText.includes('invented')"));
        assertEquals("2", js("document.querySelector('[aria-label=\"找到的做法\"]').querySelectorAll('article button').length"));
        counts(1, 0); noGeneratedSave();
    }

    @Test public void extractorWrongUrl_keepsCandidates_withoutPreviewOrSave() throws Exception {
        fixture.mode = RecipeFinderTestProvider.Mode.WRONG_EXTRACT_URL;
        finder(); search("生成鸭肉做法", ""); results(3); select(1);
        until("document.querySelector('[role=alert]')?.textContent.includes('这个来源暂时无法读取')");
        results(3); assertEquals("false", js("document.body.innerText.includes('检查 AI 整理结果')"));
        assertEquals("false", js("!!document.querySelector('input[type=checkbox]')"));
        counts(1, 1); noGeneratedSave();
    }

    @Test public void actualImeBack_retainsInputs_thenResultsBackReturnsToInput() throws Exception {
        String dish = "生成啤酒鸭", preference = "少油，适合新手";
        finder(); setInput(dishInput(), dish); setInput(preferenceInput(), preference);
        openIme(preferenceInput()); back(); awaitIme(false);
        assertEquals("false", js("!!document.querySelector('[role=dialog]')"));
        assertEquals(dish, js("(" + dishInput() + ").value"));
        assertEquals(preference, js("(" + preferenceInput() + ").value")); counts(0, 0);
        click("开始寻找"); results(3); awaitWindow(); back(); until("!!(" + dishInput() + ")");
        assertEquals(dish, js("(" + dishInput() + ").value"));
        assertEquals(preference, js("(" + preferenceInput() + ").value")); counts(1, 0); noGeneratedSave();
    }

    @Test public void fakeOffline_clearError_existingLocalRecipeRemainsUsable() throws Exception {
        String localTitle = fixture.title + " LOCAL", instruction = "APK6 离线步骤 " + UUID.randomUUID();
        ownTitle(localTitle); click("新增菜谱"); click("手动录入"); setInput(titleInput(), localTitle);
        if ("false".equals(js("!!(" + input("步骤 1", "textarea") + ")"))) click("添加步骤");
        setInput(input("步骤 1", "textarea"), instruction); click("快速保存菜谱");
        until("document.body.innerText.includes('编辑菜谱')"); assertEquals(1, recipes(localTitle).length()); counts(0, 0);
        click("首页"); until("!!document.querySelector('input[placeholder=\"搜索菜名或食材\"]')");
        fixture.mode = RecipeFinderTestProvider.Mode.NETWORK;
        finder(); search("生成鸭肉做法", "");
        until("document.querySelector('[role=alert]')?.textContent.includes('寻找做法需要联网')");
        assertEquals("true", js("document.querySelector('[role=alert]').textContent.includes('已有菜谱仍可离线使用')"));
        counts(1, 0); awaitWindow(); back(); until("!!document.querySelector('input[placeholder=\"搜索菜名或食材\"]')");
        setInput("document.querySelector('input[placeholder=\"搜索菜名或食材\"]')", localTitle);
        click("打开 " + localTitle); until("document.body.innerText.includes(" + JSONObject.quote(instruction) + ")");
        assertEquals(1, recipes(localTitle).length()); counts(1, 0); noGeneratedSave();
    }

    @Test public void busySearchBack_cancelRetainsInput_withoutDuplicateOrLateResults() throws Exception {
        fixture.holdSearch = true; fixture.ignoreCancellation = true;
        finder(); search("生成鸭肉做法", "少油"); assertTrue(fixture.entered.await(8, TimeUnit.SECONDS));
        until("document.body.innerText.includes('正在寻找公开做法')"); awaitWindow();
        back(); until("document.querySelectorAll('[role=dialog]').length===1");
        back(); until("document.querySelectorAll('[role=dialog]').length===0");
        back(); until("document.querySelectorAll('[role=dialog]').length===1"); counts(1, 0);
        CountDownLatch cancelled = observeNativeCancellation();
        clickIn("document.querySelector('[role=dialog]')", "取消请求");
        assertTrue("Native cancellation precedes releasing the delayed fake response", cancelled.await(8, TimeUnit.SECONDS));
        fixture.release.countDown(); flushFinder();
        until("[...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='开始寻找'&&!e.disabled)");
        assertEquals("生成鸭肉做法", js("(" + dishInput() + ").value")); assertEquals("少油", js("(" + preferenceInput() + ").value"));
        assertEquals("false", js("!!document.querySelector('[aria-label=\"找到的做法\"]')"));
        assertEquals("false", js("document.body.innerText.includes('检查 AI 整理结果')"));
        counts(1, 0); noGeneratedSave();
    }

    @Test public void busyExtractBack_cancelRetainsCandidates_withoutDuplicateOrStalePreview() throws Exception {
        finder(); search("生成鸭肉做法", "少油"); results(3);
        fixture.holdExtract = true; fixture.ignoreCancellation = true; select(1);
        long deadline = android.os.SystemClock.elapsedRealtime() + 8000;
        while (fixture.extractPosts.get() == 0 && android.os.SystemClock.elapsedRealtime() < deadline) Thread.sleep(50);
        assertEquals(1, fixture.extractPosts.get()); until("document.body.innerText.includes('正在读取选中的来源并整理')");
        assertEquals("true", js("[...document.querySelectorAll('[aria-label=\"找到的做法\"] article button')].every(e=>e.disabled)"));
        awaitWindow(); back(); until("document.querySelectorAll('[role=dialog]').length===1");
        back(); until("document.querySelectorAll('[role=dialog]').length===0");
        back(); until("document.querySelectorAll('[role=dialog]').length===1"); counts(1, 1);
        CountDownLatch cancelled = observeNativeCancellation();
        clickIn("document.querySelector('[role=dialog]')", "取消请求");
        assertTrue("Native cancellation precedes releasing the delayed fake response", cancelled.await(8, TimeUnit.SECONDS));
        fixture.release.countDown(); flushFinder();
        results(3); until("[...document.querySelectorAll('[aria-label=\"找到的做法\"] article button')].every(e=>!e.disabled)");
        assertEquals("false", js("document.body.innerText.includes('检查 AI 整理结果')"));
        assertEquals("false", js("!!document.querySelector('input[type=checkbox]')")); counts(1, 1); noGeneratedSave();
        back(); until("!!(" + dishInput() + ")"); assertEquals("生成鸭肉做法", js("(" + dishInput() + ").value"));
        assertEquals("少油", js("(" + preferenceInput() + ").value")); counts(1, 1);
    }

    @Test public void oneOrZeroCandidates_doesNotInventFallbackOrAutomaticallyRetry() throws Exception {
        fixture.mode = RecipeFinderTestProvider.Mode.ONE; finder(); search("生成鸭肉做法", ""); results(1); counts(1, 0);
        click("重新寻找"); until("!!(" + dishInput() + ")"); fixture.mode = RecipeFinderTestProvider.Mode.ZERO;
        click("开始寻找"); until("document.querySelector('[aria-label=\"找到的做法\"]')?.textContent.includes('暂时没有找到适合整理的公开菜谱')");
        assertEquals("false", js("!!document.querySelector('[aria-label=\"找到的做法\"] article')"));
        click("重新寻找"); until("!!(" + dishInput() + ")"); assertEquals("生成鸭肉做法", js("(" + dishInput() + ").value")); counts(2, 0); noGeneratedSave();
    }
}
