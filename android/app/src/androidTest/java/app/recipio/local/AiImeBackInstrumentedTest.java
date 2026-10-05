package app.recipio.local;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.Context;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.junit.*;
import org.junit.runner.RunWith;

/** Installed Android WebView + actual platform IME/Back; never sends Provider requests. */
@RunWith(AndroidJUnit4.class)
public class AiImeBackInstrumentedTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private String originalHardwareIme;

    private String js(String expression)throws Exception {
        AtomicReference<String> reply=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
        instrumentation.runOnMainSync(()->web.evaluateJavascript(expression,value->{reply.set(value);done.countDown();}));
        assertTrue("WebView callback timeout",done.await(15,TimeUnit.SECONDS));
        return new JSONArray("["+reply.get()+"]").optString(0);
    }
    private void until(String expression)throws Exception {
        long deadline=android.os.SystemClock.elapsedRealtime()+15000;
        do {if("true".equals(js(expression)))return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);
        fail("UI condition failed: "+expression);
    }
    private void click(String label)throws Exception {
        until("(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())==='"+label+"');if(!b||b.disabled)return false;b.click();return true})()");
    }
    private boolean imeVisible(){
        AtomicReference<Boolean> shown=new AtomicReference<>(false);
        instrumentation.runOnMainSync(()->{WindowInsetsCompat insets=ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());shown.set(insets!=null&&insets.isVisible(WindowInsetsCompat.Type.ime()));});
        return shown.get();
    }
    private void awaitIme(boolean shown)throws Exception {
        long deadline=android.os.SystemClock.elapsedRealtime()+8000;
        do {if(imeVisible()==shown)return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);
        fail("Actual window IME must be "+shown+"; dispatched page backs="+js("window.__imeTestBackCount"));
    }
    private void openIme()throws Exception {
        js("document.querySelector('textarea').focus()");
        instrumentation.runOnMainSync(()->{web.requestFocus();((InputMethodManager)activity.getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(web,InputMethodManager.SHOW_IMPLICIT);});
        awaitIme(true);
    }
    private void back(){instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);}
    @Before public void setup()throws Exception {
        // Scoped emulator setting is restored even when an assertion fails; never touch another device.
        originalHardwareIme=Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(),"show_ime_with_hard_keyboard");
        instrumentation.getUiAutomation().executeShellCommand("settings put secure show_ime_with_hard_keyboard 1").close();
        scenario=ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(a->{activity=a;web=a.getBridge().getWebView();});
        click("新增菜谱");click("AI 整理");until("!!document.querySelector('textarea')");
        js("(()=>{const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'APK4 IME GENERATED 中文 🍚');e.dispatchEvent(new Event('input',{bubbles:true}));window.__imeTestBackCount=0;window.addEventListener('recipio:back',()=>window.__imeTestBackCount++);return true})()");
    }
    @After public void cleanup()throws Exception {
        if(scenario!=null)scenario.close();
        instrumentation.getUiAutomation().executeShellCommand(originalHardwareIme==null?"settings delete secure show_ime_with_hard_keyboard":"settings put secure show_ime_with_hard_keyboard "+originalHardwareIme).close();
    }
    @Test public void keyboardOpen_firstBack_onlyHidesIme()throws Exception {
        openIme();back();awaitIme(false);
        assertEquals("0",js("window.__imeTestBackCount"));
        assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
        assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));
    }
}
