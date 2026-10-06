package app.recipio.local;

import android.content.Context;
import android.content.ContextWrapper;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.*;

/** Fake Responses only. Test-owned private Keystore alias and files; never touches the user's key. */
final class RecipeFinderTestProvider {
    enum Mode { NORMAL,ONE,ZERO,UNVERIFIED_CANDIDATE,WRONG_EXTRACT_URL,NETWORK }
    static final class Fixture implements AutoCloseable {
        final AiNativeRuntime runtime;final File root;final String alias,title="APK6 GENERATED "+UUID.randomUUID();
        final AtomicInteger posts=new AtomicInteger(),searchPosts=new AtomicInteger(),extractPosts=new AtomicInteger();
        final CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);
        volatile Mode mode=Mode.NORMAL;volatile boolean holdSearch,holdExtract,ignoreCancellation;
        private Fixture(AiNativeRuntime runtime,File root,String alias){this.runtime=runtime;this.root=root;this.alias=alias;}
        private RecipeFinderClient.HttpReply respond(RecipeFinderClient.PreparedRequest request,AiRequestLifecycle.Token token)throws Exception {
            posts.incrementAndGet();JSONObject body=new JSONObject(new String(request.body,StandardCharsets.UTF_8));boolean search=new JSONObject(body.getJSONArray("input").getJSONObject(0).getString("content")).has("untrustedDish");
            if(search)searchPosts.incrementAndGet();else extractPosts.incrementAndGet();entered.countDown();
            while((search?holdSearch:holdExtract)&&!release.await(30,TimeUnit.MILLISECONDS))if(!ignoreCancellation)token.check();
            if(mode==Mode.NETWORK)throw new IOException("generated offline");
            JSONObject envelope=search?searchEnvelope():extractEnvelope(body);
            return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(envelope.toString().getBytes(StandardCharsets.UTF_8)),()->{});
        }
        private JSONObject searchEnvelope()throws Exception {
            JSONArray sources=new JSONArray();for(int i=1;i<=9;i++)sources.put(new JSONObject().put("type","url").put("url","https://recipes.example.com/duck?variant="+i));
            JSONArray candidates=new JSONArray();int count=mode==Mode.ZERO?0:mode==Mode.ONE?1:3;
            for(int i=1;i<=count;i++)candidates.put(new JSONObject().put("title",title+" "+i).put("sourceUrl",mode==Mode.UNVERIFIED_CANDIDATE&&i==2?"https://recipes.example.com/invented":"https://recipes.example.com/duck?variant="+i).put("summary","先煎后炖 "+i).put("highlights",new JSONArray().put("鸭肉500克").put("小火慢炖")).put("totalMinutes",JSONObject.NULL).put("preparationHint","").put("timeEvidence","").put("preparationEvidence",""));
            return envelope(new JSONArray().put(new JSONObject().put("type","reasoning").put("content",new JSONArray())).put(new JSONObject().put("type","web_search_call").put("status","completed").put("action",new JSONObject().put("type","search").put("sources",sources))).put(message(new JSONObject().put("candidates",candidates).toString())));
        }
        private JSONObject extractEnvelope(JSONObject body)throws Exception {
            JSONObject input=new JSONObject(body.getJSONArray("input").getJSONObject(0).getString("content"));String url=input.getString("selectedSourceUrl");
            return envelope(new JSONArray().put(new JSONObject().put("type","web_extractor_call").put("status","completed").put("urls",new JSONArray().put(mode==Mode.WRONG_EXTRACT_URL?"https://recipes.example.com/other":url)).put("goal","读取已选菜谱").put("output",title+"，鸭肉500克。小火煮20分钟。加盐适量。")).put(message(draft())));
        }
        private String draft()throws Exception {
            JSONObject recipe=new JSONObject().put("title",title).put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","")
                .put("ingredients",new JSONArray().put(new JSONObject().put("name","鸭肉").put("amount","500克"))).put("steps",new JSONArray().put(new JSONObject().put("instruction","小火煮20分钟").put("imagePath",JSONObject.NULL))).put("preparations",new JSONArray()).put("keyTips",new JSONArray());
            return new JSONObject().put("recipe",recipe).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();
        }
        private static JSONObject envelope(JSONArray output)throws Exception{return new JSONObject().put("status","completed").put("model","qwen3.8-flash").put("error",JSONObject.NULL).put("output",output);}
        private static JSONObject message(String text)throws Exception{return new JSONObject().put("type","message").put("role","assistant").put("status","completed").put("content",new JSONArray().put(new JSONObject().put("type","output_text").put("text",text)));}
        @Override public void close()throws Exception {release.countDown();runtime.secrets.delete();KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(store.containsAlias(alias))store.deleteEntry(alias);LocalBackupArchive.deleteOwnedTree(root);}
    }
    private static void field(Object object,String name,Object value)throws Exception {Field field=object.getClass().getDeclaredField(name);field.setAccessible(true);field.set(object,value);}
    static Fixture install(MainActivity activity)throws Exception {
        Context context=activity.getApplicationContext();File root=new File(context.getCacheDir(),"find-generated-"+UUID.randomUUID());if(!root.mkdir())throw new IOException("generated fixture");for(String name:new String[]{"cache","files","no-backup"})if(!new File(root,name).mkdir())throw new IOException("generated fixture");
        Context scoped=new ContextWrapper(context){@Override public Context getApplicationContext(){return this;}@Override public File getCacheDir(){return new File(root,"cache");}@Override public File getFilesDir(){return new File(root,"files");}@Override public File getNoBackupFilesDir(){return new File(root,"no-backup");}};
        Constructor<AiNativeRuntime> constructor=AiNativeRuntime.class.getDeclaredConstructor(Context.class);constructor.setAccessible(true);AiNativeRuntime runtime=constructor.newInstance(scoped);String alias="recipio-find-generated-"+UUID.randomUUID();field(runtime,"secrets",AiSecretStore.open(scoped.getNoBackupFilesDir(),alias));char[] generated=("sk-TEST_"+UUID.randomUUID()).toCharArray();try{runtime.secrets.save(generated);}finally{Arrays.fill(generated,'\0');}
        Fixture fixture=new Fixture(runtime,root,alias);LocalRecipeFinderPlugin finder=(LocalRecipeFinderPlugin)activity.getBridge().getPlugin("LocalRecipeFinder").getInstance();field(finder,"runtime",runtime);
        try(InputStream asset=context.getAssets().open("recipio-ai-intake-contract.json")){field(finder,"client",new RecipeFinderClient(new AiIntakeContract(asset),fixture::respond));}
        LocalAiSecretPlugin secret=(LocalAiSecretPlugin)activity.getBridge().getPlugin("LocalAiSecret").getInstance();field(secret,"store",runtime.secrets);field(secret,"lifecycle",runtime.lifecycle);
        LocalAiIntakePlugin intake=(LocalAiIntakePlugin)activity.getBridge().getPlugin("LocalAiIntake").getInstance();field(intake,"runtime",runtime);
        try(InputStream asset=context.getAssets().open("recipio-ai-intake-contract.json")){field(intake,"client",new QwenClient(new AiIntakeContract(asset),(request,token)->{throw new AiFailure("network_unavailable");}));}
        return fixture;
    }
}
