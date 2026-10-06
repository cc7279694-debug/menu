package app.recipio.local;
import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;

/** Real Capacitor calls, strict Native ownership and shared lifecycle. No real Provider transport. */
@RunWith(AndroidJUnit4.class)
public class RecipeFinderBoundaryInstrumentedTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;private MainActivity activity;private WebView web;private RecipeFinderTestProvider.Fixture fake;
    private ExecutorService finderWorker,intakeWorker;
    @Before public void setup()throws Exception {
        assertTrue("Dedicated emulator only",android.os.Build.HARDWARE.equals("ranchu")||android.os.Build.HARDWARE.equals("goldfish"));
        scenario=ActivityScenario.launch(MainActivity.class);scenario.onActivity(a->{activity=a;web=a.getBridge().getWebView();});
        finderWorker=worker(activity.getBridge().getPlugin("LocalRecipeFinder").getInstance());
        intakeWorker=worker(activity.getBridge().getPlugin("LocalAiIntake").getInstance());
        // LibraryApp appears only after NativeApp finishes opening SQLite and Backup.
        until("!!document.querySelector('button[aria-label=\"新增菜谱\"]')");
        fake=RecipeFinderTestProvider.install(activity);
    }
    @After public void cleanup()throws Exception {
        if(fake!=null)fake.release.countDown();
        if(scenario!=null)scenario.close();
        boolean finderStopped=finderWorker==null||finderWorker.awaitTermination(8,TimeUnit.SECONDS);
        boolean intakeStopped=intakeWorker==null||intakeWorker.awaitTermination(8,TimeUnit.SECONDS);
        assertTrue("Finder worker stopped before fixture cleanup",finderStopped);
        assertTrue("Intake worker stopped before fixture cleanup",intakeStopped);
        if(fake!=null)fake.close();
    }
    private ExecutorService worker(Object plugin)throws Exception {Field field=plugin.getClass().getDeclaredField("worker");field.setAccessible(true);return (ExecutorService)field.get(plugin);}
    private String js(String expression)throws Exception {AtomicReference<String> result=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);instrumentation.runOnMainSync(()->web.evaluateJavascript(expression,value->{result.set(value);done.countDown();}));assertTrue(done.await(10,TimeUnit.SECONDS));return new JSONArray("["+result.get()+"]").optString(0);}
    private void until(String expression)throws Exception {long deadline=android.os.SystemClock.elapsedRealtime()+10000;do{if("true".equals(js(expression)))return;Thread.sleep(30);}while(android.os.SystemClock.elapsedRealtime()<deadline);fail("Native bridge condition: "+expression);}
    private void invoke(String slot,String method,JSONObject data)throws Exception {js("window["+JSONObject.quote(slot)+"]=null;window.Capacitor.nativePromise('LocalRecipeFinder',"+JSONObject.quote(method)+","+data+").then(r=>window["+JSONObject.quote(slot)+"]=JSON.stringify({ok:true,result:r}),e=>window["+JSONObject.quote(slot)+"]=JSON.stringify({ok:false,code:e.code}))");}
    private JSONObject result(String slot)throws Exception {until("window["+JSONObject.quote(slot)+"]!==null");return new JSONObject(js("window["+JSONObject.quote(slot)+"]"));}
    private JSONObject call(String method,JSONObject data)throws Exception {invoke("__finder",method,data);return result("__finder");}
    private String create()throws Exception {JSONObject response=call("createSession",new JSONObject());assertTrue(response.getBoolean("ok"));return response.getJSONObject("result").getString("sessionId");}
    private JSONObject input(String id,String request)throws Exception {return new JSONObject().put("sessionId",id).put("requestId",request).put("dish","啤酒鸭").put("preference","不要辣");}
    private JSONArray find(String id)throws Exception {JSONObject response=call("search",input(id,UUID.randomUUID().toString()));assertTrue(response.getBoolean("ok"));return response.getJSONObject("result").getJSONArray("candidates");}
    @Test public void realBridgeSelectsOnlyStoredCandidateAndReturnsExistingContract()throws Exception {
        String id=create();JSONArray candidates=find(id);assertEquals(3,candidates.length());JSONObject response=call("extract",new JSONObject().put("sessionId",id).put("requestId",UUID.randomUUID().toString()).put("candidateId",candidates.getJSONObject(1).getString("id")));assertTrue(response.getBoolean("ok"));JSONObject value=response.getJSONObject("result");assertEquals(2,value.length());assertEquals(fake.title,new JSONObject(value.getString("rawJson")).getJSONObject("recipe").getString("title"));assertTrue(value.getString("sourceText").contains("鸭肉500克"));assertEquals(1,fake.searchPosts.get());assertEquals(1,fake.extractPosts.get());call("discardSession",new JSONObject().put("sessionId",id));
    }
    @Test public void jsCannotSupplyUrlOrStealCandidateFromAnotherSession()throws Exception {
        String first=create(),second=create();String candidate=find(first).getJSONObject(0).getString("id");JSONObject stolen=call("extract",new JSONObject().put("sessionId",second).put("requestId",UUID.randomUUID().toString()).put("candidateId",candidate));assertFalse(stolen.getBoolean("ok"));assertEquals("source_missing",stolen.getString("code"));
        JSONObject supplied=call("extract",new JSONObject().put("sessionId",first).put("requestId",UUID.randomUUID().toString()).put("candidateId",candidate).put("sourceUrl","https://recipes.example/other"));assertFalse(supplied.getBoolean("ok"));assertEquals(0,fake.extractPosts.get());
    }
    @Test public void structuredMembershipAndSelectedExtractionMismatchAreEnforced()throws Exception {
        String id=create();fake.mode=RecipeFinderTestProvider.Mode.UNVERIFIED_CANDIDATE;JSONArray candidates=find(id);assertEquals(2,candidates.length());assertFalse(candidates.toString().contains("invented"));fake.mode=RecipeFinderTestProvider.Mode.WRONG_EXTRACT_URL;JSONObject response=call("extract",new JSONObject().put("sessionId",id).put("requestId",UUID.randomUUID().toString()).put("candidateId",candidates.getJSONObject(0).getString("id")));assertFalse(response.getBoolean("ok"));assertEquals("source_mismatch",response.getString("code"));
    }
    @Test public void verifiedZeroCandidateSearchReturnsAnEmptyResult()throws Exception {
        String id=create();fake.mode=RecipeFinderTestProvider.Mode.ZERO;assertEquals(0,find(id).length());assertEquals(1,fake.searchPosts.get());
    }
    @Test public void cancelWaitsForSharedFinishBeforeAcknowledging()throws Exception {
        String id=create(),request=UUID.randomUUID().toString();fake.holdSearch=true;fake.ignoreCancellation=true;invoke("__search","search",input(id,request));assertTrue(fake.entered.await(5,TimeUnit.SECONDS));invoke("__cancel","cancel",new JSONObject().put("sessionId",id).put("requestId",request));Thread.sleep(100);assertEquals("true",js("window.__cancel===null"));fake.release.countDown();assertTrue(result("__cancel").getBoolean("ok"));assertEquals("cancelled",result("__search").getString("code"));String next=UUID.randomUUID().toString();assertNotNull(fake.runtime.lifecycle.tryBeginRequest(next));fake.runtime.lifecycle.finishRequest(next);
    }
    @Test public void discardInvalidatesSessionBeforeLateResponseCanResolve()throws Exception {
        String id=create(),request=UUID.randomUUID().toString();fake.holdSearch=true;fake.ignoreCancellation=true;invoke("__search","search",input(id,request));assertTrue(fake.entered.await(5,TimeUnit.SECONDS));invoke("__discard","discardSession",new JSONObject().put("sessionId",id));Thread.sleep(100);assertEquals("true",js("window.__discard===null"));fake.release.countDown();assertTrue(result("__discard").getBoolean("ok"));assertFalse(result("__search").getBoolean("ok"));JSONObject stale=call("search",input(id,UUID.randomUUID().toString()));assertEquals("stale_session",stale.getString("code"));assertEquals(1,fake.posts.get());
    }
    @Test public void sharedAiLifecycleBusyPreventsAnyFinderPost()throws Exception {
        String id=create(),shared=UUID.randomUUID().toString();fake.runtime.lifecycle.tryBeginRequest(shared);try{JSONObject response=call("search",input(id,UUID.randomUUID().toString()));assertFalse(response.getBoolean("ok"));assertEquals("busy",response.getString("code"));assertEquals(0,fake.posts.get());}finally{fake.runtime.lifecycle.finishRequest(shared);}
    }
}
