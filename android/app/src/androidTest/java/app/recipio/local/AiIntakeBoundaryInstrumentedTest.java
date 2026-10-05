package app.recipio.local;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.ContextWrapper;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;
import org.junit.*;
import org.junit.runner.RunWith;

/** Real bridge/lifecycle/Keystore and private cache. Fake HTTP only, no production credentials. */
@RunWith(AndroidJUnit4.class)
public class AiIntakeBoundaryInstrumentedTest {
    private File root;private Context context;private AiNativeRuntime runtime;private LocalAiIntakePlugin plugin;
    private ExecutorService worker;private String alias;private CountDownLatch hold;
    private final AtomicInteger posts=new AtomicInteger();
    private static void field(Object target,String name,Object value)throws Exception {Field f=target.getClass().getSuperclass()==LocalAiIntakePlugin.class?LocalAiIntakePlugin.class.getDeclaredField(name):target.getClass().getDeclaredField(name);f.setAccessible(true);f.set(target,value);}
    private static final class Reply extends PluginCall {
        final CountDownLatch done=new CountDownLatch(1);volatile JSObject value;volatile String error;
        Reply(String method,JSObject data){super(null,"LocalAiIntake","generated-test",method,data);}
        @Override public void resolve(JSObject value){this.value=value;done.countDown();}
        @Override public void resolve(){done.countDown();}
        @Override public void reject(String message,String code,JSObject data){error=code;done.countDown();}
        void await()throws Exception {assertTrue("native callback timeout",done.await(8,TimeUnit.SECONDS));}
    }
    @Before public void setup()throws Exception {
        Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();root=new File(target.getCacheDir(),"ai-boundary-"+UUID.randomUUID());assertTrue(root.mkdir());
        for(String name:new String[]{"cache","no-backup","files"})assertTrue(new File(root,name).mkdir());
        context=new ContextWrapper(target){@Override public Context getApplicationContext(){return this;}@Override public File getCacheDir(){return new File(root,"cache");}@Override public File getFilesDir(){return new File(root,"files");}@Override public File getNoBackupFilesDir(){return new File(root,"no-backup");}};
        Constructor<AiNativeRuntime> constructor=AiNativeRuntime.class.getDeclaredConstructor(Context.class);constructor.setAccessible(true);runtime=constructor.newInstance(context);
        alias="recipio-ai-boundary-"+UUID.randomUUID();field(runtime,"secrets",AiSecretStore.open(context.getNoBackupFilesDir(),alias));
        runtime.secrets.save(("sk-"+UUID.randomUUID()).toCharArray());
        plugin=new LocalAiIntakePlugin(){@Override public Context getContext(){return context;}};field(plugin,"runtime",runtime);
        try(InputStream asset=target.getAssets().open("recipio-ai-intake-contract.json")){field(plugin,"client",new QwenClient(new AiIntakeContract(asset),(request,cancel)->{posts.incrementAndGet();throw new IOException("FAKE_NO_NETWORK");}));}
        Field w=LocalAiIntakePlugin.class.getDeclaredField("worker");w.setAccessible(true);worker=(ExecutorService)w.get(plugin);
    }
    @After public void cleanup()throws Exception {if(hold!=null)hold.countDown();if(plugin!=null)plugin.handleOnDestroy();if(worker!=null)assertTrue(worker.awaitTermination(10,TimeUnit.SECONDS));if(runtime!=null)runtime.secrets.delete();if(alias!=null){KeyStore keys=KeyStore.getInstance("AndroidKeyStore");keys.load(null);if(keys.containsAlias(alias))keys.deleteEntry(alias);}if(root!=null)LocalBackupArchive.deleteOwnedTree(root);}
    private String session()throws Exception {Reply call=new Reply("createSession",new JSObject());plugin.createSession(call);call.await();assertNull(call.error);return call.value.getString("operationId");}
    private Reply organize(String operation){Reply call=new Reply("organize",new JSObject().put("operationId",operation).put("requestId",UUID.randomUUID().toString()).put("text","GENERATED_RECIPE_SOURCE").put("imageIds",new com.getcapacitor.JSArray()));plugin.organize(call);return call;}
    @Test public void destroyDrainsCancelledQueuedRequestAndReleasesSharedMutexBeforeReply()throws Exception {
        String operation=session();hold=new CountDownLatch(1);CountDownLatch entered=new CountDownLatch(1);worker.execute(()->{entered.countDown();try{hold.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}});assertTrue(entered.await(3,TimeUnit.SECONDS));
        Reply request=organize(operation);assertThrows(AiFailure.class,()->runtime.lifecycle.withSecretMutation(()->null));plugin.handleOnDestroy();hold.countDown();request.await();assertEquals("cancelled",request.error);assertEquals(0,posts.get());assertTrue(runtime.lifecycle.withSecretMutation(()->true));
    }
    @Test public void rejectedExecutorReleasesMutexWithoutReadingKeyOrSendingHttp()throws Exception {
        String operation=session();worker.shutdown();assertTrue(worker.awaitTermination(3,TimeUnit.SECONDS));Reply request=organize(operation);request.await();assertEquals("stale_session",request.error);assertEquals(0,posts.get());assertTrue(runtime.lifecycle.withSecretMutation(()->true));
    }
    @Test public void nativePreflightSendsFixedTextAndAcceptsOnlyStatusOk()throws Exception {
        try(InputStream asset=context.getAssets().open("recipio-ai-intake-contract.json")){field(plugin,"client",new QwenClient(new AiIntakeContract(asset),(request,cancel)->{
            posts.incrementAndGet();JSONObject body=new JSONObject(new String(request.body,StandardCharsets.UTF_8));
            assertEquals("qwen3.8-flash",body.getString("model"));assertEquals(128,body.getInt("max_tokens"));
            assertEquals("返回 JSON：{\"status\":\"ok\"}",body.getJSONArray("messages").getJSONObject(1).getString("content"));
            assertFalse(body.toString().contains("image_url"));assertEquals("json_schema",body.getJSONObject("response_format").getString("type"));
            String response="{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"content\":\"{\\\"status\\\":\\\"ok\\\"}\"}}]}";
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(response.getBytes(StandardCharsets.UTF_8)),()->{});
        }));}
        Reply call=new Reply("preflight",new JSObject());plugin.preflight(call);call.await();assertNull(call.error);assertTrue(call.value.getBoolean("available"));assertEquals("beijing",call.value.getString("region"));assertFalse(call.value.has("rawJson"));assertEquals(1,posts.get());
    }
    @Test public void nativeWorkspacePreflightReportsOnlyMatchingSafeProfile()throws Exception {
        String generated="sk-ws-TEST."+UUID.randomUUID()+"."+UUID.randomUUID();
        runtime.secrets.save(generated.toCharArray());
        try(InputStream asset=context.getAssets().open("recipio-ai-intake-contract.json")){field(plugin,"client",new QwenClient(new AiIntakeContract(asset),(request,cancel)->{
            posts.incrementAndGet();assertEquals("https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions",request.endpoint);
            assertFalse(new String(request.body,StandardCharsets.UTF_8).contains(generated));
            String response="{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"content\":\"{\\\"status\\\":\\\"ok\\\"}\"}}]}";
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(response.getBytes(StandardCharsets.UTF_8)),()->{});
        }));}
        Reply call=new Reply("preflight",new JSObject());plugin.preflight(call);call.await();assertNull(call.error);
        assertEquals("qianwen-platform",call.value.getString("region"));assertEquals(3,call.value.length());
        assertFalse(call.value.toString().contains(generated));assertFalse(call.value.has("rawJson"));assertEquals(1,posts.get());
    }
    @Test public void failedDiscardCanRetryOnlyItsOwnedSessionAfterFilesystemRecovers()throws Exception {
        String operation=session();File unexpected=new File(context.getCacheDir(),"ai-import/"+operation+"/unexpected.txt");assertTrue(unexpected.createNewFile());
        Reply first=new Reply("discardSession",new JSObject().put("operationId",operation));plugin.discardSession(first);first.await();assertEquals("storage_error",first.error);assertTrue(unexpected.delete());
        Reply retry=new Reply("discardSession",new JSObject().put("operationId",operation));plugin.discardSession(retry);retry.await();assertNull(retry.error);assertFalse(unexpected.getParentFile().exists());assertEquals(0,posts.get());
        Reply repeated=new Reply("discardSession",new JSObject().put("operationId",operation));plugin.discardSession(repeated);repeated.await();assertNull(repeated.error);
        Reply foreign=new Reply("discardSession",new JSObject().put("operationId",UUID.randomUUID().toString()));plugin.discardSession(foreign);foreign.await();assertEquals("stale_session",foreign.error);
    }
    @Test public void fakeProviderFailureHasNoPlaintextSecretInReplyOrPrivateFiles()throws Exception {
        char[] secret=runtime.secrets.readForRequest();Reply request=organize(session());request.await();assertNotNull(request.error);assertFalse(request.error.contains(new String(secret)));assertNull(request.value);
        byte[] envelope=AiTemporaryImages.read(new File(context.getNoBackupFilesDir(),"ai-secret/key-v1.json").getCanonicalFile(),8192);assertFalse(new String(envelope,StandardCharsets.UTF_8).contains(new String(secret)));Arrays.fill(secret,'\0');assertEquals(1,posts.get());
    }
    @Test public void cleanupRetryReclaimsFailedDiscardCapacityWithoutRememberedJsOwner()throws Exception {
        List<File> failures=new ArrayList<>();
        for(int i=0;i<8;i++){String operation=session();File unexpected=new File(context.getCacheDir(),"ai-import/"+operation+"/unexpected.txt");assertTrue(unexpected.createNewFile());failures.add(unexpected);Reply discard=new Reply("discardSession",new JSObject().put("operationId",operation));plugin.discardSession(discard);discard.await();assertEquals("storage_error",discard.error);}
        Reply blocked=new Reply("createSession",new JSObject());plugin.createSession(blocked);blocked.await();assertEquals("busy",blocked.error);
        for(File file:failures)assertTrue(file.delete());
        Reply cleanup=new Reply("cleanupExpired",new JSObject());plugin.cleanupExpired(cleanup);cleanup.await();assertNull(cleanup.error);assertFalse(cleanup.value.getBoolean("pendingCleanup"));
        assertNotNull(session());assertEquals(0,posts.get());
    }
    @Test public void verifiedBackupStagingCannotRestoreOrEraseADeviceCredential()throws Exception {
        char[] secret=runtime.secrets.readForRequest();
        JSONObject data=new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"cookingRecords\":[],\"settings\":{}}");
        File archive=new File(root,"generated.recipio");LocalBackupArchive.write(archive,data,Collections.emptyList(),"generated",12,4);
        LocalBackupArchive.Validated checked=LocalBackupArchive.validate(archive);String generation=UUID.randomUUID().toString();LocalBackupArchive.stage(checked,context.getFilesDir().getCanonicalFile(),generation);
        assertArrayEquals(secret,AiSecretStore.open(context.getNoBackupFilesDir(),alias).readForRequest());
        runtime.secrets.delete();LocalBackupArchive.stage(checked,context.getFilesDir().getCanonicalFile(),UUID.randomUUID().toString());assertFalse(runtime.secrets.hasKey());
        assertFalse(AiSecretStore.open(new File(root,"different-device"),"recipio-test-new-"+UUID.randomUUID()).hasKey());
        assertFalse(new String(checked.data.toString()).contains(new String(secret)));Arrays.fill(secret,'\0');assertEquals(0,posts.get());
    }
}
