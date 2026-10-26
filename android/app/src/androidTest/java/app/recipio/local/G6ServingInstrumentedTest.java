package app.recipio.local;

import static org.junit.Assert.*;

import android.app.Instrumentation;
import android.graphics.Bitmap;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.KeyEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * G6 QA plan: exactly two real WebView/API36 cases on the fresh owned CI AVD.
 * Literal expectations: source3, 600克/330毫升/2个 -> target2,400克/220毫升/约1.33个;
 * target1.5 -> 300克/165毫升/1个; ambiguous original text and steps unchanged.
 * Actual native SQLite snapshots and an owned generated PNG, never a mocked store.
 * No AI/provider, private files, clearing, backup restore, or existing recipe access.
 * Activity relaunch is not a process cold-start, physical phone, or flight-mode claim.
 */
@RunWith(AndroidJUnit4.class)
public class G6ServingInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private AndroidImeProbe ime;
    private String originalIme;
    private boolean changedIme;
    private File generatedImage;

    private String js(String expression) throws Exception {
        AtomicReference<String> reply = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, value -> {
            reply.set(value); done.countDown();
        }));
        assertTrue("G6 WebView callback timed out", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + reply.get() + "]").optString(0);
    }
    private void until(String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            if ("true".equals(js(expression))) return;
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("G6 UI condition failed: " + expression);
    }
    private String visible(String variable) {
        return variable + ".getClientRects().length>0&&!" + variable + ".closest('[hidden],[inert],[aria-hidden=\"true\"]')";
    }
    private String button(String name) {
        return "[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())==="
            + JSONObject.quote(name) + "&&!b.disabled&&" + visible("b") + ")";
    }
    private void click(String name) throws Exception {
        until("(()=>{const b=" + button(name) + ";if(!b)return false;b.click();return true})()");
    }
    private String editor(String label, String tag) {
        return "[...document.querySelectorAll('form label')].find(l=>l.querySelector('span')?.textContent==="
            + JSONObject.quote(label) + ")?.querySelector(" + JSONObject.quote(tag) + ")";
    }
    private String serving() {
        return "[...document.querySelectorAll('input[aria-label=\"本次做几人份\"]')].find(e=>" + visible("e") + ")";
    }
    private void fillSelector(String selector, String value) throws Exception {
        until("!!(" + selector + ")");
        js("(()=>{const e=" + selector + ";const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;"
            + "Object.getOwnPropertyDescriptor(p,'value').set.call(e," + JSONObject.quote(value)
            + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        until("(" + selector + ").value===" + JSONObject.quote(value));
    }
    private void fill(String label, String tag, String value) throws Exception { fillSelector(editor(label, tag), value); }
    private void target(String value) throws Exception { fillSelector(serving(), value); }
    private void shell(String command) throws Exception {
        try (InputStream output = new ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand(command))) {
            byte[] buffer = new byte[256]; while (output.read(buffer) != -1) { /* Await fixed platform operation. */ }
        }
    }
    private void awaitIme(boolean shown) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 10000;
        do { if (ime.settled(instrumentation, shown)) return; Thread.sleep(100); }
        while (SystemClock.elapsedRealtime() < deadline);
        fail("Actual G6 editor IME did not settle to " + shown);
    }
    private void openIme() throws Exception {
        assertEquals("decimal", js("(" + serving() + ").inputMode"));
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=" + serving()
            + ";e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth]})())"));
        int[] origin = new int[2]; instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin));
        float scale = web.getWidth() / (float) point.getDouble(2);
        shell("input tap " + Math.round(origin[0] + (float) point.getDouble(0) * scale)
            + " " + Math.round(origin[1] + (float) point.getDouble(1) * scale));
        awaitIme(true); until("document.activeElement===(" + serving() + ")");
    }
    private void back() { instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); }
    private void launch() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(current -> { activity = current; web = current.getBridge().getWebView(); ime = new AndroidImeProbe(current); });
        until("!!(" + button("新增菜谱") + ")");
    }
    private JSONArray query(String statement, JSONArray values) throws Exception {
        js("window.__g6Rows=null;window.Capacitor.nativePromise('CapacitorSQLite','query',"
            + new JSONObject().put("database", "recipio").put("statement", statement).put("values", values).put("readonly", false)
            + ").then(r=>window.__g6Rows=JSON.stringify(r.values),()=>window.__g6Rows='ERROR')");
        until("window.__g6Rows!==null"); String rows = js("window.__g6Rows");
        assertNotEquals("Own generated-row query failed", "ERROR", rows); return new JSONArray(rows);
    }
    private String createRecipe() throws Exception {
        String title = "G6 GENERATED " + UUID.randomUUID();
        click("新增菜谱"); click("手动录入"); fill("菜名", "input", title);
        fill("约几人份", "input", "3"); fill("做菜耗时（分钟）", "input", "30"); fill("每份参考热量（kcal）", "input", "328");
        String[] names = { "鸡翅", "可乐", "鸡蛋", "盐", "复杂用量" }, amounts = { "600 克", "330 毫升", "2 个", "适量", "1～2 勺" };
        for (int index = 0; index < names.length; index++) {
            click("添加食材"); fill("食材 " + (index + 1), "input", names[index]); fill("用量 " + (index + 1), "input", amounts[index]);
        }
        click("添加步骤"); fill("步骤 1", "textarea", "焯水 2 分钟，保持原文数字。");
        click("添加步骤"); fill("步骤 2", "textarea", "倒入 330 毫升可乐，焖煮 15 分钟。");
        click("保存菜谱"); until("document.querySelector('.v2-detail-title')?.textContent===" + JSONObject.quote(title));
        JSONArray rows = query("SELECT id FROM recipes WHERE title=? AND deleted_at IS NULL", new JSONArray().put(title));
        assertEquals(1, rows.length()); String id = rows.getJSONObject(0).getString("id"); UUID.fromString(id); return id;
    }
    private int count(String id) throws Exception {
        return query("SELECT count(*) AS count FROM cooking_records WHERE recipe_id=?", new JSONArray().put(id)).getJSONObject(0).getInt("count");
    }
    private String snapshot(String id) throws Exception {
        JSONObject snapshot = new JSONObject();
        snapshot.put("recipes", query("SELECT * FROM recipes WHERE id=?", new JSONArray().put(id)));
        for (String table : new String[] { "recipe_ingredients", "recipe_steps", "recipe_preparations", "recipe_key_tips" })
            snapshot.put(table, query("SELECT * FROM " + table + " WHERE recipe_id=? ORDER BY position", new JSONArray().put(id)));
        snapshot.put("recipe_changes", query("SELECT * FROM recipe_changes WHERE recipe_id=? ORDER BY changed_at,id", new JSONArray().put(id)));
        return snapshot.toString();
    }
    private void expectAmounts(String... expected) throws Exception {
        JSONArray amounts = new JSONArray(js("JSON.stringify([...document.querySelectorAll('.v2-ingredients')].find(e=>"
            + visible("e") + ")? [...[...document.querySelectorAll('.v2-ingredients')].find(e=>" + visible("e")
            + ").querySelectorAll('dd')].map(e=>{const v=(e.querySelector('.v2-g6-amount-value')||e).cloneNode(true);"
            + "v.querySelectorAll('.sr-only').forEach(p=>p.remove());return v.textContent.trim()}):[])"));
        assertEquals(expected.length, amounts.length());
        for (int index = 0; index < expected.length; index++) assertEquals(expected[index], amounts.getString(index));
    }
    private void progress(int step) throws Exception {
        until("document.querySelector('.v2-production-cooking .v2-cook-progress span')?.textContent==="
            + JSONObject.quote("第 " + step + " 步／共 2 步"));
    }
    private void watch() throws Exception {
        js("(()=>{window.__g6Writes=[];window.__g6Online=[];window.__g6PageBacks=0;"
            + "window.addEventListener('recipio:back',()=>window.__g6PageBacks++);"
            + "for(const [p,methods] of [[Storage.prototype,['setItem','removeItem','clear']],[IDBObjectStore.prototype,['add','put','delete','clear']]])"
            + "for(const m of methods){const original=p[m];p[m]=function(...a){window.__g6Writes.push('storage.'+m);return original.apply(this,a)}};"
            + "const native=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(p,m,o){"
            + "if(p==='CapacitorSQLite'&&['run','execute','executeSet','beginTransaction','commitTransaction'].includes(m))window.__g6Writes.push(p+'.'+m);"
            + "if((p==='Filesystem'&&['writeFile','appendFile','deleteFile','mkdir','rmdir','rename','copy'].includes(m))||p==='Preferences')window.__g6Writes.push(p+'.'+m);"
            + "if(p==='CapacitorHttp'||p==='LocalAiIntake'||p==='LocalAiSecret'){window.__g6Online.push(p+'.'+m);return Promise.reject(new Error('G6 QA forbids external capability'));}"
            + "return native.call(this,p,m,o)};"
            + "const fetchOriginal=window.fetch;window.fetch=function(u,...a){const v=new URL(typeof u==='string'?u:u.url,location.href);"
            + "if(['http:','https:'].includes(v.protocol)&&v.origin!==location.origin){window.__g6Online.push(v.origin);return Promise.reject(new Error('G6 QA forbids external origin'));}return fetchOriginal.call(this,u,...a)};"
            + "const xhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...a){const v=new URL(u,location.href);"
            + "if(['http:','https:'].includes(v.protocol)&&v.origin!==location.origin){window.__g6Online.push(v.origin);throw new Error('G6 QA forbids external origin')}return xhr.call(this,m,u,...a)};return true})()");
    }
    private void zeroWrites(String id, String before) throws Exception {
        assertEquals("[]", js("JSON.stringify(window.__g6Writes)"));
        assertEquals("[]", js("JSON.stringify(window.__g6Online)"));
        assertEquals(before, snapshot(id)); assertEquals(0, count(id));
    }
    private void fixtureRun(String statement, JSONArray values) throws Exception {
        // Fixture preparation only: bound updates target one generated UUID, before observation starts.
        js("window.__g6FixtureRun=null;window.Capacitor.nativePromise('CapacitorSQLite','run',"
            + new JSONObject().put("database", "recipio").put("statement", statement).put("values", values).put("transaction", true).put("readonly", false)
            + ").then(r=>window.__g6FixtureRun=String(r.changes.changes),()=>window.__g6FixtureRun='ERROR')");
        until("window.__g6FixtureRun!==null"); assertEquals("1", js("window.__g6FixtureRun"));
    }
    private String addGeneratedMediaAndHistory(String id) throws Exception {
        File images = new File(instrumentation.getTargetContext().getFilesDir(), "images");
        assertTrue(images.isDirectory() || images.mkdir());
        String relative = "images/" + UUID.randomUUID() + ".png";
        generatedImage = new File(instrumentation.getTargetContext().getFilesDir(), relative);
        assertTrue("Never overwrite a media file", generatedImage.createNewFile());
        Bitmap bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888); bitmap.eraseColor(0xffcc8844);
        try (FileOutputStream output = new FileOutputStream(generatedImage)) { assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)); }
        finally { bitmap.recycle(); }
        fixtureRun("UPDATE recipes SET cover_path=? WHERE id=? AND cover_path IS NULL", new JSONArray().put(relative).put(id));
        fixtureRun("UPDATE recipe_steps SET image_path=? WHERE recipe_id=? AND position=0 AND image_path IS NULL", new JSONArray().put(relative).put(id));
        click("返回菜谱库"); String title = query("SELECT title FROM recipes WHERE id=?", new JSONArray().put(id)).getJSONObject(0).getString("title");
        click("打开 " + title); click("编辑菜谱"); fill("个人备注", "textarea", "G6 generated edit creates genuine original history.");
        click("保存菜谱"); until("!!(" + serving() + ")");
        assertEquals(1, query("SELECT id FROM recipe_changes WHERE recipe_id=?", new JSONArray().put(id)).length());
        assertEquals("3", js("(" + serving() + ").value")); return title;
    }
    private byte[] mediaDigest() throws Exception { return MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(generatedImage.toPath())); }

    @Before public void setup() throws Exception {
        assertTrue("Owned generated emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        assertEquals(36, android.os.Build.VERSION.SDK_INT);
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        assertTrue(originalIme == null || originalIme.matches("[01]")); changedIme = true;
        shell("settings put secure show_ime_with_hard_keyboard 1"); launch();
    }
    @After public void cleanup() throws Exception {
        try { if (scenario != null) scenario.close(); }
        finally { if (changedIme) shell(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard"
            : "settings put secure show_ime_with_hard_keyboard " + originalIme); }
        // Leave only our generated fixture data in this ephemeral VM; never clear data or scan user media.
    }

    @Test public void realNumericImeBack_preservesSheetStepAndLastValidWithoutWrites() throws Exception {
        String id = createRecipe(), before = snapshot(id); watch(); target("2");
        expectAmounts("400 克", "220 毫升", "约 1.33 个", "适量", "1～2 勺");
        click("放大步骤 2"); progress(2); click("查看食材");
        until("!!document.querySelector('.v2-cook-reference')"); assertEquals("2", js("(" + serving() + ").value"));
        target("0"); until("(" + serving() + ").getAttribute('aria-invalid')==='true'");
        expectAmounts("400 克", "220 毫升", "约 1.33 个", "适量", "1～2 勺"); zeroWrites(id, before);
        openIme(); js("(" + serving() + ").select()"); shell("input text 2");
        until("(" + serving() + ").value==='2'");
        back(); awaitIme(false);
        assertEquals("0", js("window.__g6PageBacks")); assertEquals("true", js("!!document.querySelector('.v2-cook-reference')"));
        assertEquals("2", js("(" + serving() + ").value")); progress(2);
        back(); until("!document.querySelector('.v2-cook-reference')");
        assertEquals("1", js("window.__g6PageBacks")); progress(2);
        back(); until("!document.querySelector('.v2-production-cooking')");
        assertEquals("2", js("(" + serving() + ").value")); zeroWrites(id, before);
    }

    @Test public void realSqliteOriginalAndMediaSurviveAdjustmentCompletionAndActivityRestart() throws Exception {
        String id = createRecipe(), title = addGeneratedMediaAndHistory(id), before = snapshot(id);
        byte[] imageBefore = mediaDigest(); watch(); target("2");
        expectAmounts("400 克", "220 毫升", "约 1.33 个", "适量", "1～2 勺");
        click("开始引导烹饪"); progress(1); click("查看食材"); target("1.5");
        expectAmounts("300 克", "165 毫升", "1 个", "适量", "1～2 勺");
        click("关闭食材"); until("!document.querySelector('.v2-cook-reference')"); progress(1);
        click("退出引导"); until("!document.querySelector('.v2-production-cooking')");
        assertEquals("1.5", js("(" + serving() + ").value")); zeroWrites(id, before); assertArrayEquals(imageBefore, mediaDigest());
        click("开始引导烹饪"); progress(1); click("下一步"); progress(2); zeroWrites(id, before);
        js("(()=>{const b=" + button("完成这道菜") + ";b.click();b.click();return true})()");
        until("document.body.innerText.includes('已记录做过这道菜')"); assertEquals(1, count(id));
        assertEquals(before, snapshot(id)); assertArrayEquals(imageBefore, mediaDigest());
        assertEquals("[]", js("JSON.stringify(window.__g6Online)")); click("完成并返回");
        scenario.close(); scenario = null; launch(); click("打开 " + title);
        until("!!(" + serving() + ")"); assertEquals("3", js("(" + serving() + ").value"));
        expectAmounts("600 克", "330 毫升", "2 个", "适量", "1～2 勺");
        assertEquals(before, snapshot(id)); assertEquals(1, count(id)); assertArrayEquals(imageBefore, mediaDigest());
        JSONObject row = query("SELECT servings,total_minutes,calories_per_serving FROM recipes WHERE id=?", new JSONArray().put(id)).getJSONObject(0);
        assertEquals(3, row.getDouble("servings"), 0); assertEquals(30, row.getInt("total_minutes")); assertEquals(328, row.getDouble("calories_per_serving"), 0);
    }
}
