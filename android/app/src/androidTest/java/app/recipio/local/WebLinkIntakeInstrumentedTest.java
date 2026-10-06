package app.recipio.local;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.Context;
import android.content.ContextWrapper;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
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

/** Actual installed WebView/Capacitor/SQLite/IME. Owned pages + fake Provider only, zero Internet calls. */
@RunWith(AndroidJUnit4.class)
public class WebLinkIntakeInstrumentedTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario; private MainActivity activity; private WebView web;
    private AndroidImeProbe ime;
    private String originalIme,alias; private File root; private AiNativeRuntime runtime;
    private final AtomicInteger reads=new AtomicInteger(),posts=new AtomicInteger();
    private final CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);
    private volatile boolean hold; private String page; private final String title="APK5A GENERATED "+UUID.randomUUID();
    private static void field(Object object,String name,Object value)throws Exception{Field f=object.getClass().getDeclaredField(name);f.setAccessible(true);f.set(object,value);}
    private String recipe(String name,boolean complete)throws Exception {
        JSONObject value=new JSONObject().put("@type","Recipe").put("name",name).put("recipeIngredient",new JSONArray().put("牛肉200克"));
        if(complete)value.put("recipeInstructions",new JSONArray().put("小火煮20分钟"));
        return value.toString();
    }
    private String html(String json){return "<title>生成测试网页</title><script type=\"application/ld+json\">"+json+"</script><main><h2>食材</h2><p>牛肉200克</p><h2>做法</h2><p>小火煮20分钟</p></main>";}
    private String fakeDraft()throws Exception {
        JSONObject details=new JSONObject().put("title",title).put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","")
            .put("ingredients",new JSONArray().put(new JSONObject().put("name","牛肉").put("amount","200克"))).put("steps",new JSONArray().put(new JSONObject().put("instruction","煮熟").put("imagePath",JSONObject.NULL)))
            .put("preparations",new JSONArray()).put("keyTips",new JSONArray());
        return new JSONObject().put("recipe",details).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();
    }
    private void fakeOnly()throws Exception {
        LocalWebImportPlugin plugin=(LocalWebImportPlugin)activity.getBridge().getPlugin("LocalWebImport").getInstance();
        field(plugin,"fetcher",new SafeWebFetcher(host->{
            if(host.equals("recipes.example"))return List.of(InetAddress.getByName("93.184.216.34"));
            if(host.matches("[0-9.]+")||host.contains(":"))return List.of(InetAddress.getByName(host));
            throw new java.net.UnknownHostException("Unowned test host");
        },new OkHttpClient.Builder().addInterceptor(chain->{
            reads.incrementAndGet();entered.countDown();try{while(hold&&!release.await(100,TimeUnit.MILLISECONDS)){if(chain.call().isCanceled())throw new IOException("cancelled");}}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException("cancelled");}
            if(chain.call().isCanceled())throw new IOException("cancelled");
            return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK").header("Content-Type","text/html; charset=utf-8").body(ResponseBody.create(page,MediaType.get("text/html; charset=utf-8"))).build();
        }).build()));
        Context context=instrumentation.getTargetContext();root=new File(context.getCacheDir(),"link-generated-"+UUID.randomUUID());assertTrue(root.mkdir());
        for(String name:new String[]{"cache","files","no-backup"})assertTrue(new File(root,name).mkdir());
        Context scoped=new ContextWrapper(context){@Override public Context getApplicationContext(){return this;}@Override public File getCacheDir(){return new File(root,"cache");}@Override public File getFilesDir(){return new File(root,"files");}@Override public File getNoBackupFilesDir(){return new File(root,"no-backup");}};
        Constructor<AiNativeRuntime> constructor=AiNativeRuntime.class.getDeclaredConstructor(Context.class);constructor.setAccessible(true);runtime=constructor.newInstance(scoped);
        alias="recipio-link-generated-"+UUID.randomUUID();field(runtime,"secrets",AiSecretStore.open(scoped.getNoBackupFilesDir(),alias));runtime.secrets.save(("sk-"+UUID.randomUUID()).toCharArray());
        LocalAiSecretPlugin secret=(LocalAiSecretPlugin)activity.getBridge().getPlugin("LocalAiSecret").getInstance();field(secret,"store",runtime.secrets);field(secret,"lifecycle",runtime.lifecycle);
        LocalAiIntakePlugin ai=(LocalAiIntakePlugin)activity.getBridge().getPlugin("LocalAiIntake").getInstance();field(ai,"runtime",runtime);
        try(InputStream contract=context.getAssets().open("recipio-ai-intake-contract.json")){field(ai,"client",new QwenClient(new AiIntakeContract(contract),(request,cancel)->{
            posts.incrementAndGet();String body=new JSONObject().put("choices",new JSONArray().put(new JSONObject().put("finish_reason","stop").put("message",new JSONObject().put("content",fakeDraft())))).toString();
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)),()->{});
        }));}
    }
    private void launch()throws Exception{scenario=ActivityScenario.launch(MainActivity.class);scenario.onActivity(a->{activity=a;web=a.getBridge().getWebView();ime=new AndroidImeProbe(a);});until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");awaitWindow();}
    private String js(String expression)throws Exception {
        AtomicReference<String> result=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
        instrumentation.runOnMainSync(()->web.evaluateJavascript(expression,value->{result.set(value);done.countDown();}));assertTrue(done.await(15,TimeUnit.SECONDS));return new JSONArray("["+result.get()+"]").optString(0);
    }
    private void until(String expression)throws Exception {
        long deadline=android.os.SystemClock.elapsedRealtime()+15000;
        do{if("true".equals(js(expression)))return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);fail("UI condition: "+expression);
    }
    private void click(String label)throws Exception{until("(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||e.textContent.trim())==="+JSONObject.quote(label)+");if(!b||b.disabled)return false;b.click();return true})()");}
    private void setInput(String selector,String value)throws Exception{js("(()=>{const e="+selector+";Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");}
    private String titleInput(){return "[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent==='菜名').querySelector('input')";}
    private void read()throws Exception{setInput("document.querySelector('input[type=url]')","https://recipes.example/generated");click("读取网页");}
    private boolean imeVisible(){AtomicReference<Boolean> result=new AtomicReference<>(false);instrumentation.runOnMainSync(()->{WindowInsetsCompat insets=ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());result.set(insets!=null&&insets.isVisible(WindowInsetsCompat.Type.ime()));});return result.get();}
    private void awaitIme(boolean visible)throws Exception{long deadline=android.os.SystemClock.elapsedRealtime()+8000;do{if(ime.settled(instrumentation,visible))return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);fail("Actual IME visible="+visible);}
    private void awaitWindow()throws Exception{
        long deadline=android.os.SystemClock.elapsedRealtime()+8000;AtomicBoolean focused=new AtomicBoolean();
        do{instrumentation.runOnMainSync(()->focused.set(activity.hasWindowFocus()));if(focused.get())return;Thread.sleep(100);}while(android.os.SystemClock.elapsedRealtime()<deadline);
        fail("Owned RECIPIO Activity must have input focus before native events");
    }
    private void openIme(String selector)throws Exception{
        awaitWindow();
        JSONArray point=new JSONArray(js("JSON.stringify((()=>{const e="+selector+";e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,innerWidth,innerHeight]})())"));
        assertTrue("Input must be inside the actual viewport",point.getDouble(1)>0&&point.getDouble(1)<point.getDouble(3));
        int[] origin=new int[2];instrumentation.runOnMainSync(()->web.getLocationOnScreen(origin));float scale=web.getWidth()/(float)point.getDouble(2),x=origin[0]+(float)point.getDouble(0)*scale,y=origin[1]+(float)point.getDouble(1)*scale;
        // System input creates fresh timestamps after layout/focus, not an already-stale UP event.
        try(InputStream command=new android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand("input tap "+Math.round(x)+" "+Math.round(y)))){byte[] buffer=new byte[256];while(command.read(buffer)!=-1){}}
        awaitIme(true);until("document.activeElement===("+selector+")");
    }
    private void back(){instrumentation.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);}
    @Before public void setup()throws Exception{
        assertTrue("Dedicated emulator only",android.os.Build.HARDWARE.equals("ranchu")||android.os.Build.HARDWARE.equals("goldfish"));
        originalIme=Settings.Secure.getString(instrumentation.getTargetContext().getContentResolver(),"show_ime_with_hard_keyboard");instrumentation.getUiAutomation().executeShellCommand("settings put secure show_ime_with_hard_keyboard 1").close();
        page=html(recipe(title,true));launch();fakeOnly();click("新增菜谱");click("从网页链接导入");until("!!document.querySelector('input[type=url]')");
    }
    @After public void cleanup()throws Exception{
        release.countDown();if(scenario!=null)scenario.close();if(runtime!=null)runtime.secrets.delete();if(alias!=null){KeyStore keys=KeyStore.getInstance("AndroidKeyStore");keys.load(null);if(keys.containsAlias(alias))keys.deleteEntry(alias);}if(root!=null)LocalBackupArchive.deleteOwnedTree(root);
        instrumentation.getUiAutomation().executeShellCommand(originalIme==null?"settings delete secure show_ime_with_hard_keyboard":"settings put secure show_ime_with_hard_keyboard "+originalIme).close();
    }
    @Test public void completeParser_zeroAi_edit_save_realSqlite()throws Exception{
        read();until("document.body.innerText.includes('检查网页菜谱')");assertEquals(0,posts.get());assertEquals("false",js("!!document.querySelector('input[type=checkbox],input[type=file]')"));
        setInput(titleInput(),title+" EDITED");click("确认保存菜谱");until("document.body.innerText.includes('编辑菜谱')");assertEquals(1,reads.get());assertEquals(0,posts.get());
        js("window.__query=null;window.Capacitor.nativePromise('CapacitorSQLite','query',{database:'recipio',statement:'SELECT title,cover_path,notes FROM recipes WHERE title=?',values:["+JSONObject.quote(title+" EDITED")+"],readonly:false}).then(r=>window.__query=JSON.stringify(r.values),e=>window.__query='ERROR')");
        until("window.__query!==null");JSONArray rows=new JSONArray(js("window.__query"));assertEquals(1,rows.length());assertEquals(title+" EDITED",rows.getJSONObject(0).getString("title"));assertTrue(rows.getJSONObject(0).isNull("cover_path"));assertEquals("",rows.getJSONObject(0).getString("notes"));
        scenario.close();launch();until("document.body.innerText.includes("+JSONObject.quote(title+" EDITED")+")");
    }
    @Test public void partialParser_explicitAi_reviewGate()throws Exception{
        page=html(recipe(title,false));read();until("document.body.innerText.includes('直接完善菜谱')");assertEquals(0,posts.get());click("使用 AI 继续整理");until("document.body.innerText.includes('检查 AI 整理结果')");assertEquals(1,posts.get());
        assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));click("快速保存菜谱");until("document.activeElement?.getAttribute('aria-label')==='AI 整理审核'");assertEquals("true",js("document.body.innerText.includes('检查 AI 整理结果')"));
    }
    @Test public void noJsonLd_readable_doesNotCallAiUntilClicked()throws Exception{
        page="<main><h1>测试生成菜</h1><p>牛肉200克煮熟</p></main>";read();until("document.body.innerText.includes('没有完整的结构化菜谱')");assertEquals(0,posts.get());click("使用 AI 继续整理");until("document.body.innerText.includes('检查 AI 整理结果')");assertEquals(1,posts.get());
    }
    @Test public void multipleCandidates_explicitSelection()throws Exception{
        page=html("["+recipe(title,true)+","+recipe(title+" SECOND",true)+"]");read();until("document.body.innerText.includes('请选择要导入的菜谱')");click(title+" SECOND · 1 项食材 · 1 个步骤");until("document.body.innerText.includes('检查网页菜谱')");assertEquals(title+" SECOND",js("("+titleInput()+").value"));assertEquals(0,posts.get());
    }
    @Test public void inputImeBack_onlyHidesKeyboard_thenPageBack()throws Exception{
        setInput("document.querySelector('input[type=url]')","https://recipes.example/generated");openIme("document.querySelector('input[type=url]')");back();awaitIme(false);assertEquals("false",js("!!document.querySelector('[role=dialog]')"));assertEquals("https://recipes.example/generated",js("document.querySelector('input[type=url]').value"));back();until("!!document.querySelector('[role=dialog]')");assertEquals(0,reads.get());
    }
    @Test public void previewImeBack_keepsEditedTitleAndReviewGate()throws Exception{
        page=html(recipe(title,false));read();until("document.body.innerText.includes('直接完善菜谱')");click("使用 AI 继续整理");until("document.body.innerText.includes('检查 AI 整理结果')");setInput(titleInput(),title+" EDITED");openIme(titleInput());back();awaitIme(false);assertEquals(title+" EDITED",js("("+titleInput()+").value"));assertEquals("false",js("!!document.querySelector('[role=dialog]')"));assertEquals("false",js("document.querySelector('input[type=checkbox]').checked"));assertEquals(1,posts.get());
    }
    @Test public void busyBack_andCancel_doNotDoubleFetchOrSave()throws Exception{
        hold=true;read();assertTrue(entered.await(8,TimeUnit.SECONDS));until("document.body.innerText.includes('正在安全读取网页')");awaitWindow();back();until("document.querySelectorAll('[role=dialog]').length===1");back();until("document.querySelectorAll('[role=dialog]').length===1");assertEquals(1,reads.get());assertEquals(0,posts.get());click("放弃网页导入");until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");release.countDown();assertEquals(1,reads.get());
    }
    @Test public void nativePrivateTargets_areRejectedBeforeAnyHttp()throws Exception{
        for(String url:new String[]{"http://localhost/","http://127.0.0.1/","http://10.0.0.1/","http://[::1]/","http://169.254.169.254/","http://user:pass@recipes.example/","http://recipes.example:8080/","file:///data/secret"}){
            js("window.__blocked=null;window.Capacitor.nativePromise('LocalWebImport','read',{requestId:"+JSONObject.quote(UUID.randomUUID().toString())+",url:"+JSONObject.quote(url)+"}).then(()=>window.__blocked='UNSAFE_SUCCESS',e=>window.__blocked=e.code)");until("window.__blocked!==null");assertNotEquals("UNSAFE_SUCCESS",js("window.__blocked"));assertEquals(0,reads.get());
        }
        assertTrue((instrumentation.getTargetContext().getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_USES_CLEARTEXT_TRAFFIC)!=0);
    }
}
