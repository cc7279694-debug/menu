package app.recipio.local;

import static org.junit.Assert.*;

import android.app.Instrumentation;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
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
 * Real installed WebView, actual Android IME/Back and the existing SQLite bridge.
 * CI runs this only on its freshly owned emulator. No clearing, restore, media,
 * credentials, Provider calls or access to rows outside the generated UUID title.
 * Activity restart below is not a process cold-start or airplane-mode claim.
 */
@RunWith(AndroidJUnit4.class)
public class G5DailyCookingInstrumentedTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private AndroidImeProbe ime;
    private String originalIme;
    private boolean changedIme;

    private String input(String label, String tag) {
        return "[...document.querySelectorAll('form label')].find(l=>l.querySelector('span')?.textContent==="
            + JSONObject.quote(label) + ")?.querySelector(" + JSONObject.quote(tag) + ")";
    }

    private String js(String expression) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(expression, value -> {
            result.set(value); done.countDown();
        }));
        assertTrue("Generated WebView condition callback timed out", done.await(15, TimeUnit.SECONDS));
        return new JSONArray("[" + result.get() + "]").optString(0);
    }

    private void until(String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            if ("true".equals(js(expression))) return;
            // Bounded condition polling, not a guessed UI settling delay.
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Generated UI condition failed: " + expression);
    }

    private String button(String label) {
        // A hidden recipe detail remains mounted under Focus/Guided. Never
        // click its invisible completion button and call that a UI test.
        return "[...document.querySelectorAll('button')].find(b=>"
            + "(b.getAttribute('aria-label')||b.textContent.trim())===" + JSONObject.quote(label)
            + "&&!b.disabled&&b.getClientRects().length>0&&!b.closest('[hidden],[inert],[aria-hidden=\"true\"]'))";
    }

    private void click(String label) throws Exception {
        until("(()=>{const b=" + button(label) + ";if(!b)return false;b.click();return true})()");
    }

    private void fill(String label, String tag, String value) throws Exception {
        String selector = input(label, tag);
        until("!!(" + selector + ")");
        js("(()=>{const e=" + selector + ";const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;"
            + "Object.getOwnPropertyDescriptor(p,'value').set.call(e," + JSONObject.quote(value)
            + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        until("(" + selector + ").value===" + JSONObject.quote(value));
    }

    private void shell(String command) throws Exception {
        try (InputStream output = new ParcelFileDescriptor.AutoCloseInputStream(
                instrumentation.getUiAutomation().executeShellCommand(command))) {
            byte[] buffer = new byte[256];
            while (output.read(buffer) != -1) { /* Await this fixed platform operation. */ }
        }
    }

    private void awaitIme(boolean shown) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 10000;
        do {
            if (ime.settled(instrumentation, shown)) return;
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Actual owned-window IME did not settle to " + shown);
    }

    private void openIme(String selector) throws Exception {
        JSONArray point = new JSONArray(js("JSON.stringify((()=>{const e=" + selector
            + ";e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();"
            + "return [r.x+r.width/2,r.y+r.height/2,innerWidth]})())"));
        int[] origin = new int[2];
        instrumentation.runOnMainSync(() -> web.getLocationOnScreen(origin));
        float scale = web.getWidth() / (float) point.getDouble(2);
        int x = Math.round(origin[0] + (float) point.getDouble(0) * scale);
        int y = Math.round(origin[1] + (float) point.getDouble(1) * scale);
        // Actual Android touch establishes WebView's editor input connection.
        shell("input tap " + x + " " + y);
        awaitIme(true);
        until("document.activeElement===(" + selector + ")");
    }

    private void back() { instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK); }

    private AccessibilityNodeInfo findText(AccessibilityNodeInfo node, String text) {
        if (node == null) return null;
        if (text.contentEquals(node.getText() == null ? "" : node.getText())) return node;
        for (int index = 0; index < node.getChildCount(); index++) {
            AccessibilityNodeInfo found = findText(node.getChild(index), text);
            if (found != null) return found;
        }
        return null;
    }

    private void cancelActualUnsavedConfirmation() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        do {
            AccessibilityNodeInfo root = instrumentation.getUiAutomation().getRootInActiveWindow();
            if (root != null && activity.getPackageName().contentEquals(root.getPackageName() == null ? "" : root.getPackageName())
                    && findText(root, "有未保存的修改，确定放弃吗？") != null) {
                AccessibilityNodeInfo cancel = findText(root, "Cancel");
                if (cancel == null) cancel = findText(root, "CANCEL");
                if (cancel == null) cancel = findText(root, "取消");
                while (cancel != null && !cancel.isClickable()) cancel = cancel.getParent();
                if (cancel != null && cancel.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return;
            }
            Thread.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("The original native unsaved-changes confirmation and its Cancel button were not available");
    }

    private JSONArray query(String statement, JSONArray values) throws Exception {
        // Read only the row(s) identified by this test's UUID title or its own ID.
        js("window.__g5OwnedRows=null;window.Capacitor.nativePromise('CapacitorSQLite','query',"
            + new JSONObject().put("database", "recipio").put("statement", statement)
                .put("values", values).put("readonly", false)
            + ").then(r=>window.__g5OwnedRows=JSON.stringify(r.values),()=>window.__g5OwnedRows='ERROR')");
        until("window.__g5OwnedRows!==null");
        String rows = js("window.__g5OwnedRows");
        assertNotEquals("Own generated-row SQLite query failed", "ERROR", rows);
        return new JSONArray(rows);
    }

    private JSONArray recipes(String title) throws Exception {
        return query("SELECT id,title,created_at FROM recipes WHERE title=? AND deleted_at IS NULL", new JSONArray().put(title));
    }

    private int cookingCount(String recipeId) throws Exception {
        return query("SELECT count(*) AS count FROM cooking_records WHERE recipe_id=?", new JSONArray().put(recipeId))
            .getJSONObject(0).getInt("count");
    }

    private void launch() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(current -> {
            activity = current; web = current.getBridge().getWebView(); ime = new AndroidImeProbe(current);
        });
        until("!!(" + button("新增菜谱") + ")");
    }

    private void newManualRecipe() throws Exception {
        click("新增菜谱"); click("手动录入"); until("!!(" + input("菜名", "input") + ")");
    }

    private void progress(int step) throws Exception {
        until("document.querySelector('.v2-production-cooking .v2-cook-progress span')?.textContent==="
            + JSONObject.quote("第 " + step + " 步／共 2 步"));
    }

    @Before public void setup() throws Exception {
        assertTrue("Owned generated emulator only", android.os.Build.HARDWARE.equals("ranchu") || android.os.Build.HARDWARE.equals("goldfish"));
        originalIme = Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(), "show_ime_with_hard_keyboard");
        assertTrue("Unexpected initial emulator IME preference", originalIme == null || originalIme.matches("[01]"));
        changedIme = true;
        shell("settings put secure show_ime_with_hard_keyboard 1");
        launch();
    }

    @After public void cleanup() throws Exception {
        try {
            if (scenario != null) scenario.close();
        } finally {
            if (changedIme) shell(originalIme == null ? "settings delete secure show_ime_with_hard_keyboard"
                : "settings put secure show_ime_with_hard_keyboard " + originalIme);
        }
        // Keep only our generated records for the ephemeral CI evidence. No DB
        // clearing, uninstall, restore or deletion of existing rows is performed.
    }

    @Test public void manualDraft_realImeBackThenCanceledLeave_preservesInputs() throws Exception {
        String title = "G5 GENERATED DRAFT " + UUID.randomUUID();
        String note = "GENERATED draft stays after actual IME Back 中文";
        newManualRecipe(); fill("菜名", "input", title); fill("个人备注", "textarea", note);
        js("window.__g5PageBacks=0;window.addEventListener('recipio:back',()=>window.__g5PageBacks++)");
        openIme(input("个人备注", "textarea"));
        back(); awaitIme(false);
        assertEquals("0", js("window.__g5PageBacks"));
        assertEquals(title, js("(" + input("菜名", "input") + ").value"));
        assertEquals(note, js("(" + input("个人备注", "textarea") + ").value"));
        assertEquals("false", js("!!document.querySelector('[role=dialog]')"));
        back(); cancelActualUnsavedConfirmation();
        until("window.__g5PageBacks===1");
        assertEquals(title, js("(" + input("菜名", "input") + ").value"));
        assertEquals(note, js("(" + input("个人备注", "textarea") + ").value"));
        assertEquals(0, recipes(title).length());
    }

    @Test public void realLocalCooking_onlyExplicitCompletionRecordsOnce_andSurvivesActivityRestart() throws Exception {
        String title = "G5 GENERATED COOK " + UUID.randomUUID();
        String first = "GENERATED 第一步：准备清水", second = "GENERATED 第二步：烧开后关火";
        newManualRecipe(); fill("菜名", "input", title);
        click("添加步骤"); fill("步骤 1", "textarea", first);
        click("添加步骤"); fill("步骤 2", "textarea", second);
        click("保存菜谱");
        until("document.querySelector('.v2-detail-title')?.textContent===" + JSONObject.quote(title));
        JSONArray saved = recipes(title); assertEquals(1, saved.length());
        String recipeId = saved.getJSONObject(0).getString("id"); UUID.fromString(recipeId);
        String createdAt = saved.getJSONObject(0).getString("created_at");
        assertEquals(0, cookingCount(recipeId));

        click("放大步骤 2"); progress(2); click("上一步"); progress(1);
        assertEquals(0, cookingCount(recipeId));
        back(); until("!document.querySelector('.v2-production-cooking')");
        assertEquals(0, cookingCount(recipeId));

        click("开始引导烹饪"); progress(1); click("下一步"); progress(2);
        click("上一步"); progress(1); click("退出引导");
        until("!document.querySelector('.v2-production-cooking')");
        assertEquals(0, cookingCount(recipeId));

        click("开始引导烹饪"); progress(1); click("下一步"); progress(2);
        until("!!(" + button("完成这道菜") + ")");
        js("(()=>{const b=" + button("完成这道菜") + ";b.click();b.click();return true})()");
        until("document.body.innerText.includes('已记录做过这道菜')");
        assertEquals(1, cookingCount(recipeId));
        JSONArray records = query("SELECT id,cooked_at FROM cooking_records WHERE recipe_id=?", new JSONArray().put(recipeId));
        assertEquals(1, records.length());
        String recordId = records.getJSONObject(0).getString("id"); UUID.fromString(recordId);
        assertFalse(records.getJSONObject(0).getString("cooked_at").isEmpty());
        click("完成并返回");
        until("document.querySelector('.v2-latest-cooking-title')?.textContent==='上次下厨'");
        until("!!document.querySelector('[data-record-id=" + JSONObject.quote(recordId) + "]')");

        scenario.close(); scenario = null; launch();
        JSONArray reopened = recipes(title); assertEquals(1, reopened.length());
        assertEquals(recipeId, reopened.getJSONObject(0).getString("id"));
        assertEquals(createdAt, reopened.getJSONObject(0).getString("created_at"));
        assertEquals(1, cookingCount(recipeId));
        click("打开 " + title);
        until("document.querySelector('.v2-detail-title')?.textContent===" + JSONObject.quote(title));
        until("!!document.querySelector('[data-record-id=" + JSONObject.quote(recordId) + "]')");
        JSONArray steps = query("SELECT position,instruction FROM recipe_steps WHERE recipe_id=? ORDER BY position", new JSONArray().put(recipeId));
        assertEquals(2, steps.length());
        assertEquals(first, steps.getJSONObject(0).getString("instruction"));
        assertEquals(second, steps.getJSONObject(1).getString("instruction"));
    }
}
