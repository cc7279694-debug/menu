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
    private AndroidImeProbe ime;
    private String originalHardwareIme;
    private File root;
    private String alias;
    private AiNativeRuntime runtime;
    private LocalAiIntakePlugin intake;
    private ExecutorService worker;
    private Uri generatedImage;
    private final AtomicInteger posts=new AtomicInteger();
    private boolean pickerConfirmationAttempted;
    private JSONObject pickerConfirmation;
    private String pickerConfirmationLabel="";
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
    private interface ReadyPickerAction { void run()throws Exception; }
    private void until(String expression)throws Exception { until(expression,null); }
    private void until(String expression,ReadyPickerAction pickerAction)throws Exception {
        long deadline=android.os.SystemClock.elapsedRealtime()+15000;
        do {if("true".equals(js(expression)))return;if(pickerAction!=null)pickerAction.run();Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);
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
        do {if(ime.settled(instrumentation,shown))return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);
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
        scenario.onActivity(a->{activity=a;web=a.getBridge().getWebView();ime=new AndroidImeProbe(a);});
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
        until("!document.body.innerText.includes('整理菜谱')");assertEquals("1",js("window.__imeTestBackCount"));assertEquals(0,posts.get());
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
    private boolean systemPicker(String pkg) {
        return "com.google.android.apps.photos".equals(pkg)||"com.android.documentsui".equals(pkg)
            ||"com.google.android.documentsui".equals(pkg)||"com.android.providers.media.module".equals(pkg)
            ||"com.google.android.providers.media.module".equals(pkg)||"com.google.android.photopicker".equals(pkg);
    }
    private String positivePickerLabel(AccessibilityNodeInfo node) {
        if(node==null)return "";
        String text=node.getText()==null?"":node.getText().toString().trim();
        String description=node.getContentDescription()==null?"":node.getContentDescription().toString().trim();
        for(String allowed:new String[]{"Select","Select (1)","Open","Add","Add (1)","Use","Use photo","Use this photo","Done",
                "选择","选择 (1)","选择（1）","打开","添加","添加 (1)","添加（1）","使用","使用照片","使用此照片","完成"}) {
            if(allowed.equalsIgnoreCase(text)||allowed.equalsIgnoreCase(description))return allowed;
        }
        return "";
    }
    private AccessibilityNodeInfo pickerConfirmation(AccessibilityNodeInfo node) {
        if(node==null)return null;
        String label=positivePickerLabel(node);
        if(node.isVisibleToUser()&&node.isEnabled()&&!label.isEmpty()) {
            AccessibilityNodeInfo target=node;
            for(int hop=0;hop<3&&!target.isClickable()&&target.getParent()!=null;hop++)target=target.getParent();
            String type=target.getClassName()==null?"":target.getClassName().toString();
            String id=target.getViewIdResourceName()==null?"":target.getViewIdResourceName();
            boolean button=type.equals("android.widget.Button")||type.equals("android.widget.ImageButton")||type.endsWith(".MaterialButton");
            boolean identified=id.matches("[A-Za-z0-9_.]+:id/(?:[A-Za-z0-9]+_)*(?:select|confirm|done|open|add|use)(?:_[A-Za-z0-9]+)*");
            boolean parentHasOtherLabel=target!=node&&positivePickerLabel(target).isEmpty()
                &&(target.getText()!=null&&target.getText().length()>0||target.getContentDescription()!=null&&target.getContentDescription().length()>0);
            if(target.isVisibleToUser()&&target.isEnabled()&&target.isClickable()&&(button||identified)&&!parentHasOtherLabel) {
                pickerConfirmationLabel=label;return target;
            }
        }
        for(int index=0;index<node.getChildCount();index++) {
            AccessibilityNodeInfo found=pickerConfirmation(node.getChild(index));if(found!=null)return found;
        }
        return null;
    }
    private void confirmAlreadySelectedGeneratedFixture()throws Exception {
        if(pickerConfirmationAttempted)return;
        AccessibilityNodeInfo root=instrumentation.getUiAutomation().getRootInActiveWindow();
        String pkg=root==null||root.getPackageName()==null?"":root.getPackageName().toString();
        if(!systemPicker(pkg))return;
        AccessibilityNodeInfo target=pickerConfirmation(root);if(target==null)return;
        // This is called only after the exact generated filename was clicked.
        // Attempt at most one positive system confirmation, never login/permission controls.
        pickerConfirmationAttempted=true;
        String id=target.getViewIdResourceName(),type=target.getClassName()==null?"":target.getClassName().toString();
        pickerConfirmation=new JSONObject().put("scope","AFTER_EXACT_GENERATED_FILE_TAP")
            .put("package",pkg).put("label",pickerConfirmationLabel)
            .put("id",id!=null&&id.matches("[A-Za-z0-9_.]+:id/[A-Za-z0-9_]+")?id:"UNAVAILABLE")
            .put("class",type.matches("[A-Za-z0-9_.$]{1,160}")?type:"UNAVAILABLE");
        pickerConfirmation.put("dispatched",target.performAction(AccessibilityNodeInfo.ACTION_CLICK));
        android.os.Bundle status=new android.os.Bundle();
        status.putString("stream","\nG5_PICKER_CONFIRMATION="+pickerConfirmation+"\n");instrumentation.sendStatus(2,status);
    }
    private void observePickerForFailureDiagnostics()throws Exception {
        // Observe only this generated pick. Return the exact original Promise and
        // values; no retry, request replacement, response mutation or extra call.
        js("(()=>{const c=window.Capacitor;window.__imePickDiagnostic={phase:'not-called'};"
            +"if(!c||typeof c.nativePromise!=='function'){window.__imePickDiagnostic={phase:'observer-unavailable'};return false;}"
            +"const original=c.nativePromise;c.nativePromise=function(...args){const p=Reflect.apply(original,this,args);"
            +"if(args[0]==='LocalAiIntake'&&args[1]==='pickImage'){const operationId=args[2]?.operationId;window.__imePickDiagnostic={phase:'pending'};"
            +"try{p.then(r=>{try{const i=r?.image;let scheme='unavailable';try{if(typeof i?.previewUri==='string')scheme=new URL(i.previewUri).protocol;}catch{}"
            +"const uuid=v=>typeof v==='string'&&/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/.test(v);"
            +"const names=['id','mimeType','byteSize','width','height','previewUri'];"
            +"const imageShapeMatches=!!(i&&typeof i==='object'&&!Array.isArray(i)&&Object.keys(i).length===6&&names.every(n=>Object.hasOwn(i,n))&&uuid(i.id)&&i.mimeType==='image/jpeg'&&Number.isInteger(i.byteSize)&&i.byteSize>=1&&i.byteSize<=1048576&&[i.width,i.height].every(n=>Number.isInteger(n)&&n>=11&&n<=2048)&&typeof i.previewUri==='string'&&i.previewUri.length<=512);"
            +"const matched=typeof i?.previewUri==='string'?i.previewUri.match(/^file:[/][/][/]data[/](?:user[/][0-9]+|data)[/]app[.]recipio[.]local[/]cache[/]ai-import[/]([^/]+)[/]([^/]+)[.]jpg$/):null;"
            +"const ownedImageMatches=!!(uuid(operationId)&&uuid(i?.id)&&matched&&matched[1]===operationId&&matched[2]===i.id&&Math.max(i.width,i.height)<=Math.min(i.width,i.height)*200);"
            +"window.__imePickDiagnostic={phase:r?.cancelled?'cancelled':'resolved',hasImage:!!i,"
            +"imageShapeMatches,ownedImageMatches,"
            +"mime:i?.mimeType==='image/jpeg'?'image/jpeg':'other',scheme,"
            +"width:Number.isFinite(i?.width)?i.width:null,height:Number.isFinite(i?.height)?i.height:null,"
            +"bytes:Number.isFinite(i?.byteSize)?i.byteSize:null};}catch{window.__imePickDiagnostic={phase:'observer-error'};}},"
            +"e=>{const allowed=['image_invalid','image_too_large','input_invalid','storage_error','busy','stale_session','invalid_output','native_unavailable','cancelled'];"
            +"window.__imePickDiagnostic={phase:'rejected',code:allowed.includes(e?.code)?e.code:'other'};});"
            +"}catch{window.__imePickDiagnostic={phase:'observer-error'};}}return p;};"
            +"if(c.nativePromise===original)window.__imePickDiagnostic={phase:'observer-unavailable'};return true;})()");
    }
    private void collectSafePickerControls(AccessibilityNodeInfo node,JSONArray controls,int[] visited,int depth)throws Exception {
        if(node==null||depth>12||visited[0]++>=128||controls.length()>=16)return;
        String type=node.getClassName()==null?"":node.getClassName().toString();
        if(node.isVisibleToUser()&&(node.isClickable()||type.endsWith("Button"))) {
            String id=node.getViewIdResourceName(),label=positivePickerLabel(node);
            controls.put(new JSONObject()
                .put("id",id!=null&&id.length()<=200&&id.matches("[A-Za-z0-9_.]+:id/[A-Za-z0-9_]+")?id:"UNAVAILABLE")
                .put("class",type.matches("[A-Za-z0-9_.$]{1,160}")?type:"UNAVAILABLE")
                .put("enabled",node.isEnabled()).put("visible",node.isVisibleToUser()).put("clickable",node.isClickable())
                .put("label",label.isEmpty()?"OTHER_OR_EMPTY":label));
        }
        for(int index=0;index<node.getChildCount()&&visited[0]<128&&controls.length()<16;index++)
            collectSafePickerControls(node.getChild(index),controls,visited,depth+1);
    }
    private void generatedPickerFailureEvidence(JSONObject report,AccessibilityNodeInfo foreground)throws Exception {
        JSONObject image=new JSONObject().put("status","NOT_REQUESTED");report.put("screenshot",image);
        // The cloud harness grants this only after checking a fresh, isolated owned AVD.
        // Normal connected tests and phones never opt in to screen capture diagnostics.
        if(!"G5_SYNTHETIC_CLOUD_FIXTURE".equals(InstrumentationRegistry.getArguments().getString("g5SyntheticPickerDiagnostics")))return;
        String pkg=foreground==null||foreground.getPackageName()==null?"":foreground.getPackageName().toString();
        if(generatedImage==null||!systemPicker(pkg)){image.put("status","NOT_CAPTURED_OUTSIDE_GENERATED_PICKER");return;}
        JSONArray controls=new JSONArray();collectSafePickerControls(foreground,controls,new int[]{0},0);report.put("pickerControls",controls);
        Bitmap screen=null;File output=null;boolean created=false,saved=false;
        try {
            screen=instrumentation.getUiAutomation().takeScreenshot();
            if(screen==null){image.put("status","NULL_SCREENSHOT");return;}
            output=new File(instrumentation.getTargetContext().getCacheDir(),"g5-picker-diagnostic.png");
            if(!output.createNewFile()){image.put("status","REFUSED_EXISTING_FILE");return;}
            created=true;
            try(FileOutputStream stream=new FileOutputStream(output)) {
                if(!screen.compress(Bitmap.CompressFormat.PNG,100,stream))throw new IOException("Diagnostic encoding failed");
                stream.getFD().sync();
            }
            if(!output.isFile()||output.length()==0)throw new IOException("Diagnostic file empty");
            saved=true;image.put("status","SAVED").put("bytes",output.length()).put("width",screen.getWidth()).put("height",screen.getHeight());
        } catch(IOException|RuntimeException ignored) {
            image.put("status","NOT_SAVED");
        } finally {
            if(screen!=null)screen.recycle();
            if(created&&!saved&&output!=null)output.delete();
        }
    }
    private void reportPickerFailureDiagnostic() {
        String output;
        try {
            JSONObject report=new JSONObject().put("scope","GENERATED_PICK_FAILURE_DIAGNOSTIC_ONLY")
                .put("privateFiles","NOT_READ").put("providerPosts",posts.get())
                .put("pickerConfirmationAttempted",pickerConfirmationAttempted)
                .put("pickerConfirmation",pickerConfirmation==null?JSONObject.NULL:pickerConfirmation);
            AccessibilityNodeInfo foreground=instrumentation.getUiAutomation().getRootInActiveWindow();
            String pkg=foreground==null||foreground.getPackageName()==null?"UNAVAILABLE":foreground.getPackageName().toString();
            if(!pkg.matches("[A-Za-z0-9_.]{1,160}"))pkg="UNAVAILABLE";
            report.put("foregroundPackage",pkg).put("targetAppForeground",instrumentation.getTargetContext().getPackageName().equals(pkg));
            generatedPickerFailureEvidence(report,foreground);
            String ui=js("JSON.stringify((()=>{const a=document.querySelector('.v2-ai-intake');"
                +"const message=a?.querySelector('[role=alert] > p')?.textContent?.trim()||'';"
                +"const categories=new Map([['截图无法读取，请选择 JPG、PNG 或 WebP 图片。','image_invalid'],"
                +"['AI 返回内容不完整，请重试或手动录入。','invalid_output'],"
                +"['本机临时存储失败，请检查可用空间。','storage_error'],"
                +"['本轮整理已结束，请重新进入。','stale_session'],['当前 AI 操作尚未结束，请稍候。','busy'],"
                +"['AI 整理仅支持 Android；本地菜谱仍可使用。','native_unavailable'],"
                +"['截图超出数量或大小限制。','image_too_large']]);"
                +"return {aiInputPresent:!!a,previewButtons:a?.querySelectorAll('button[aria-label^=\"预览截图 \"]').length||0,"
                +"gridItems:a?.querySelectorAll('.v2-intake-image-grid > li').length||0,"
                +"unavailablePlaceholders:[...(a?.querySelectorAll('.v2-image-placeholder')||[])].filter(e=>e.textContent.trim()==='图片暂不可用').length,"
                +"safeAlertCategory:categories.get(message)||(message?'other-safe-alert':'none'),"
                +"images:[...(a?.querySelectorAll('.v2-intake-image-grid img')||[])].slice(0,6).map(i=>{let scheme='unavailable',ownOrigin=false;"
                +"try{const u=new URL(i.currentSrc||i.src,location.href);scheme=u.protocol;ownOrigin=u.origin===location.origin;}catch{}"
                +"return {complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,scheme,ownOrigin};}),"
                +"pickPromise:window.__imePickDiagnostic||{phase:'not-installed'}};})())");
            report.put("ui",new JSONObject(ui));output=report.toString();
        } catch(Exception ignored) {
            output="{\"scope\":\"GENERATED_PICK_FAILURE_DIAGNOSTIC_ONLY\",\"diagnostic\":\"UNAVAILABLE\",\"privateFiles\":\"NOT_READ\"}";
        }
        try {
            android.os.Bundle status=new android.os.Bundle();
            status.putString("stream","\nG5_IME_PICK_DIAGNOSTIC="+output+"\n");
            instrumentation.sendStatus(2,status);
        } catch(RuntimeException ignored) { /* Preserve the original failure, even if diagnostic delivery fails. */ }
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
        observePickerForFailureDiagnostics();
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
        try { until("!!document.querySelector('img[alt=\"截图 1\"]')",this::confirmAlreadySelectedGeneratedFixture); }
        catch(AssertionError failure) { reportPickerFailureDiagnostic(); throw failure; }
    }
    @Test public void selectedTempImages_surviveImeBack()throws Exception {
        pickGeneratedImage();String before=js("document.querySelector('img[alt=\"截图 1\"]').src");openIme();back();awaitIme(false);
        assertEquals(before,js("document.querySelector('img[alt=\"截图 1\"]').src"));assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
        assertEquals(0,posts.get());assertEquals("0",js("window.__imeTestBackCount"));
    }
    private String titleInput(){return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==='菜名').querySelector('input')";}
    private void preview()throws Exception {click("开始 AI 整理");until("document.body.innerText.includes('检查整理结果')");assertEquals(1,posts.get());}
    @Test public void previewEdits_surviveImeBack()throws Exception {
        preview();js("(()=>{const e="+titleInput()+";Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'APK4 IME EDITED 🍚');e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
        openIme(titleInput());back();awaitIme(false);assertEquals("APK4 IME EDITED 🍚",js("("+titleInput()+").value"));assertEquals("0",js("window.__imeTestBackCount"));assertEquals("false",js("!!document.querySelector('[role=dialog]')"));
    }
    @Test public void previewConfirmationGate_survivesImeBack()throws Exception {
        preview();until("!!document.querySelector('input[type=checkbox]')");assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));
        openIme(titleInput());back();awaitIme(false);assertEquals("true",js("Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='快速保存菜谱').disabled"));js("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");until("document.activeElement?.getAttribute('aria-label')==='AI 整理审核'");
        assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));assertEquals("true",js("document.body.innerText.includes('检查整理结果')"));
        js("document.querySelector('input[type=checkbox]').click()");until("document.querySelector('input[type=checkbox]').checked===true");openIme(titleInput());back();awaitIme(false);assertEquals("true",js("document.querySelector('input[type=checkbox]').checked"));assertEquals("0",js("window.__imeTestBackCount"));
    }
    @Test public void repeatedBack_doesNotDoubleNavigate()throws Exception {
        openIme();back();awaitIme(false);back();back();until("document.querySelectorAll('[role=dialog]').length===1");
        click("继续整理");assertEquals("APK4 IME GENERATED 中文 🍚",js("document.querySelector('textarea').value"));assertEquals(0,posts.get());
    }
    @Test public void backDuringBusy_doesNotStartDuplicateAiRequest()throws Exception {
        holdHttp=true;click("开始 AI 整理");assertTrue(httpEntered.await(8,TimeUnit.SECONDS));back();back();until("!!document.querySelector('[role=dialog]')");
        assertEquals(1,posts.get());click("继续整理");assertEquals("true",js("document.body.innerText.includes('正在整理')"));
        httpRelease.countDown();until("document.body.innerText.includes('检查整理结果')");assertEquals(1,posts.get());
    }
}
