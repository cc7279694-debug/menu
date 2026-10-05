package app.recipio.local;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ExecutorService;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
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
    private File root;
    private String alias;
    private AiNativeRuntime runtime;
    private LocalAiIntakePlugin intake;
    private ExecutorService worker;
    private Uri generatedImage;
    private final AtomicInteger posts=new AtomicInteger();
    private volatile boolean holdHttp;
    private final CountDownLatch httpEntered=new CountDownLatch(1),httpRelease=new CountDownLatch(1);
    private static void field(Object target,String name,Object value)throws Exception {Field f=target.getClass().getDeclaredField(name);f.setAccessible(true);f.set(target,value);}
    private String fakeDraft()throws Exception {
        JSONObject recipe=new JSONObject().put("title","APK4 IME GENERATED 中文 🍚").put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","")
            .put("ingredients",new JSONArray().put(new JSONObject().put("name","鸡翅").put("amount","500克")))
            .put("steps",new JSONArray().put(new JSONObject().put("instruction","先焯水").put("imagePath",JSONObject.NULL)))
            .put("preparations",new JSONArray()).put("keyTips",new JSONArray());
        return new JSONObject().put("recipe",recipe).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();
    }
    private void nativeFakeOnly()throws Exception {
        Context target=instrumentation.getTargetContext();root=new File(target.getCacheDir(),"ime-generated-"+UUID.randomUUID());assertTrue(root.mkdir());
        for(String name:new String[]{"cache","files","no-backup"})assertTrue(new File(root,name).mkdir());
        Context scoped=new ContextWrapper(target){@Override public Context getApplicationContext(){return this;}@Override public File getCacheDir(){return new File(root,"cache");}@Override public File getFilesDir(){return new File(root,"files");}@Override public File getNoBackupFilesDir(){return new File(root,"no-backup");}};
        Constructor<AiNativeRuntime> constructor=AiNativeRuntime.class.getDeclaredConstructor(Context.class);constructor.setAccessible(true);runtime=constructor.newInstance(scoped);
        alias="recipio-ime-generated-"+UUID.randomUUID();field(runtime,"secrets",AiSecretStore.open(scoped.getNoBackupFilesDir(),alias));runtime.secrets.save(("sk-"+UUID.randomUUID()).toCharArray());
        // Generated image sessions must use the real cache URI namespace required by the JS port.
        // Only the native test credential is isolated; plugin teardown removes its owned UUID images.
        field(runtime,"images",AiTemporaryImages.forContext(target));
        intake=(LocalAiIntakePlugin)activity.getBridge().getPlugin("LocalAiIntake").getInstance();field(intake,"runtime",runtime);
        try(InputStream asset=target.getAssets().open("recipio-ai-intake-contract.json")){field(intake,"client",new QwenClient(new AiIntakeContract(asset),(request,cancel)->{
            posts.incrementAndGet();httpEntered.countDown();while(holdHttp&&!httpRelease.await(100,TimeUnit.MILLISECONDS))cancel.check();cancel.check();
            String body=new JSONObject().put("choices",new JSONArray().put(new JSONObject().put("finish_reason","stop").put("message",new JSONObject().put("content",fakeDraft())))).toString();
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)),()->{});
        }));}
        Field w=LocalAiIntakePlugin.class.getDeclaredField("worker");w.setAccessible(true);worker=(ExecutorService)w.get(intake);
        LocalAiSecretPlugin secrets=(LocalAiSecretPlugin)activity.getBridge().getPlugin("LocalAiSecret").getInstance();field(secrets,"store",runtime.secrets);field(secrets,"lifecycle",runtime.lifecycle);
    }

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
    private void openIme()throws Exception {openIme("document.querySelector('textarea')");}
    private void openIme(String selector)throws Exception {
        // WebView needs a real user touch to establish its editor connection; DOM focus is not an IME test.
        JSONArray point=new JSONArray(js("JSON.stringify((()=>{const e="+selector+";e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth]})())"));
        int[] origin=new int[2];instrumentation.runOnMainSync(()->web.getLocationOnScreen(origin));
        float scale=web.getWidth()/(float)point.getDouble(2),x=origin[0]+(float)point.getDouble(0)*scale,y=origin[1]+(float)point.getDouble(1)*scale;
        long now=android.os.SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(now,now,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(now,now+1,MotionEvent.ACTION_UP,x,y,0);
        try{instrumentation.sendPointerSync(down);instrumentation.sendPointerSync(up);}finally{down.recycle();up.recycle();}
        awaitIme(true);
        until("document.activeElement===("+selector+")");
    }
    private void back(){instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);}
    @Before public void setup()throws Exception {
        assertTrue("Dedicated emulator only", android.os.Build.HARDWARE.equals("ranchu")||android.os.Build.HARDWARE.equals("goldfish"));
        // Scoped emulator setting is restored even when an assertion fails; never touch another device.
        originalHardwareIme=Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(),"show_ime_with_hard_keyboard");
        instrumentation.getUiAutomation().executeShellCommand("settings put secure show_ime_with_hard_keyboard 1").close();
        scenario=ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(a->{activity=a;web=a.getBridge().getWebView();});
        until("!!document.querySelector('button')");nativeFakeOnly();
        click("新增菜谱");click("AI 整理");until("!!document.querySelector('textarea')");
        js("(()=>{const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'APK4 IME GENERATED 中文 🍚');e.dispatchEvent(new Event('input',{bubbles:true}));window.__imeTestBackCount=0;window.addEventListener('recipio:back',()=>window.__imeTestBackCount++);return true})()");
    }
    @After public void cleanup()throws Exception {
        httpRelease.countDown();
        if(scenario!=null)scenario.close();
        if(worker!=null)assertTrue(worker.awaitTermination(10,TimeUnit.SECONDS));
        if(generatedImage!=null)instrumentation.getTargetContext().getContentResolver().delete(generatedImage,null,null);
        if(runtime!=null)runtime.secrets.delete();
        if(alias!=null){KeyStore keys=KeyStore.getInstance("AndroidKeyStore");keys.load(null);if(keys.containsAlias(alias))keys.deleteEntry(alias);}
        if(root!=null)LocalBackupArchive.deleteOwnedTree(root);
        instrumentation.getUiAutomation().executeShellCommand(originalHardwareIme==null?"settings delete secure show_ime_with_hard_keyboard":"settings put secure show_ime_with_hard_keyboard "+originalHardwareIme).close();
    }
    @Test public void keyboardOpen_firstBack_onlyHidesIme()throws Exception {
        openIme();back();awaitIme(false);
        assertEquals("0",js("window.__imeTestBackCount"));
        assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
        assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));
    }
    @Test public void keyboardClosed_secondBack_leavesIntake()throws Exception {
        openIme();back();awaitIme(false);back();until("!!document.querySelector('[role=dialog]')");click("放弃本轮整理");
        until("!document.body.innerText.includes('AI 整理菜谱')");assertEquals("1",js("window.__imeTestBackCount"));assertEquals(0,posts.get());
    }
    @Test public void intakeDraft_survivesImeBack()throws Exception {
        openIme();back();awaitIme(false);assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));
        openIme();back();awaitIme(false);assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));assertEquals("0",js("window.__imeTestBackCount"));
    }
    private boolean nativeClick(AccessibilityNodeInfo node,String label){
        if(node==null)return false;
        String description=node.getContentDescription()==null?"":node.getContentDescription().toString();
        // DocumentsUI's grid exposes "exact filename, size, date" as its accessible label.
        // Match the complete UUID filename and delimiter, never an arbitrary substring.
        if(description.startsWith(label+",")){
            // File tiles need a real tap; their accessibility label includes formatted
            // metadata and is not necessarily an ACTION_CLICK-capable text node.
            if(!node.refresh()||!node.isVisibleToUser())return false;
            Rect bounds=new Rect();node.getBoundsInScreen(bounds);if(bounds.isEmpty())return false;
            // Let the platform input command produce current-timestamp DOWN/UP events
            // for this external window, rather than preconstructing an already-stale UP.
            try(InputStream command=new android.os.ParcelFileDescriptor.AutoCloseInputStream(
                instrumentation.getUiAutomation().executeShellCommand("input tap "+bounds.centerX()+" "+bounds.centerY()))){
                byte[] buffer=new byte[256];while(command.read(buffer)!=-1){}return true;
            } catch(IOException error){throw new AssertionError("Generated SAF native tap failed",error);}
        }
        if(label.contentEquals(node.getText()==null?"":node.getText())||label.equals(description)){
            AccessibilityNodeInfo target=node;while(target!=null&&!target.isClickable())target=target.getParent();return target!=null&&target.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        for(int i=0;i<node.getChildCount();i++)if(nativeClick(node.getChild(i),label))return true;return false;
    }
    private void awaitNativeClick(String label)throws Exception {
        long deadline=android.os.SystemClock.elapsedRealtime()+15000;
        do {
            if(nativeClick(instrumentation.getUiAutomation().getRootInActiveWindow(),label))return;
            Thread.sleep(100);
        } while(android.os.SystemClock.elapsedRealtime()<deadline);
        fail("Real SAF control missing: "+label);
    }
    private void pickGeneratedImage()throws Exception {
        Context context=instrumentation.getTargetContext();String name="recipio-ime-"+UUID.randomUUID()+".png";
        ContentValues values=new ContentValues();values.put(MediaStore.Downloads.DISPLAY_NAME,name);values.put(MediaStore.Downloads.MIME_TYPE,"image/png");values.put(MediaStore.Downloads.RELATIVE_PATH,"Download/");values.put(MediaStore.Downloads.IS_PENDING,1);
        generatedImage=context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);assertNotNull(generatedImage);
        Bitmap bitmap=Bitmap.createBitmap(64,64,Bitmap.Config.ARGB_8888);bitmap.eraseColor(android.graphics.Color.WHITE);
        try(OutputStream output=context.getContentResolver().openOutputStream(generatedImage)){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,output));}finally{bitmap.recycle();}
        ContentValues published=new ContentValues();published.put(MediaStore.Downloads.IS_PENDING,0);
        assertEquals(1,context.getContentResolver().update(generatedImage,published,null,null));
        // MediaStore indexes the closed descriptor asynchronously. Only select a fully
        // published, nonempty fixture, never an empty placeholder in DocumentsUI.
        long indexedDeadline=android.os.SystemClock.elapsedRealtime()+15000;boolean indexed=false;
        do {
            try(Cursor row=context.getContentResolver().query(generatedImage,new String[]{MediaStore.Downloads.IS_PENDING,MediaStore.Downloads.SIZE},null,null,null)){
                assertNotNull(row);assertTrue(row.moveToFirst());indexed=row.getInt(0)==0&&row.getLong(1)>0;
            }
            if(indexed)break;Thread.sleep(100);
        } while(android.os.SystemClock.elapsedRealtime()<indexedDeadline);
        assertTrue("Generated fixture must be published and indexed before opening SAF",indexed);
        click("添加截图");
        // OPEN_DOCUMENT starts at Recents or the previously visited directory. A Downloads
        // fixture is not necessarily listed there; navigate the real picker before selecting it.
        // The picker may already be at Downloads. Do not reopen its animated drawer
        // over a fixture that is already visible and tappable.
        long pickerDeadline=android.os.SystemClock.elapsedRealtime()+15000;boolean selected=false;
        do {
            if(nativeClick(instrumentation.getUiAutomation().getRootInActiveWindow(),name)){selected=true;break;}
            Thread.sleep(100);
        } while(android.os.SystemClock.elapsedRealtime()<pickerDeadline);
        if(!selected){awaitNativeClick("Show roots");awaitNativeClick("Downloads");awaitNativeClick(name);}
        until("!!document.querySelector('img[alt=\"截图 1\"]')");
    }
    @Test public void selectedTempImages_surviveImeBack()throws Exception {
        pickGeneratedImage();String before=js("document.querySelector('img[alt=\"截图 1\"]').src");openIme();back();awaitIme(false);
        assertEquals(before,js("document.querySelector('img[alt=\"截图 1\"]').src"));assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
        assertEquals(0,posts.get());assertEquals("0",js("window.__imeTestBackCount"));
    }
    private String titleInput(){return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==='菜名').querySelector('input')";}
    private void preview()throws Exception {click("开始 AI 整理");until("document.body.innerText.includes('检查 AI 整理结果')");assertEquals(1,posts.get());}
    @Test public void previewEdits_surviveImeBack()throws Exception {
        preview();js("(()=>{const e="+titleInput()+";Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'APK4 IME EDITED 🍚');e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        openIme(titleInput());back();awaitIme(false);assertEquals("APK4 IME EDITED 🍚",js("("+titleInput()+").value"));assertEquals("0",js("window.__imeTestBackCount"));assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
    }
    @Test public void previewConfirmationGate_survivesImeBack()throws Exception {
        preview();until("!!document.querySelector('input[type=checkbox]')");assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));
        openIme(titleInput());back();awaitIme(false);click("快速保存菜谱");until("document.activeElement?.getAttribute('aria-label')==='AI 整理审核'");
        assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));assertEquals("true",js("document.body.innerText.includes('检查 AI 整理结果')"));
        js("document.querySelector('input[type=checkbox]').click()");until("document.querySelector('input[type=checkbox]').checked===true");openIme(titleInput());back();awaitIme(false);assertEquals("true",js("document.querySelector('input[type=checkbox]').checked"));assertEquals("0",js("window.__imeTestBackCount"));
    }
    @Test public void repeatedBack_doesNotDoubleNavigate()throws Exception {
        openIme();back();awaitIme(false);back();back();until("document.querySelectorAll('[role=dialog]').length===1");
        click("继续整理");assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));assertEquals(0,posts.get());
    }
    @Test public void backDuringBusy_doesNotStartDuplicateAiRequest()throws Exception {
        holdHttp=true;click("开始 AI 整理");assertTrue(httpEntered.await(8,TimeUnit.SECONDS));back();back();until("!!document.querySelector('[role=dialog]')");
        assertEquals(1,posts.get());click("继续整理");assertEquals("true",js("document.body.innerText.includes('正在整理')"));
        httpRelease.countDown();until("document.body.innerText.includes('检查 AI 整理结果')");assertEquals(1,posts.get());
    }
}
