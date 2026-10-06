package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;
import org.junit.Test;
import okhttp3.mockwebserver.*;

public class RecipeFinderClientTest {
    private AiIntakeContract contract()throws Exception{return new AiIntakeContract(new FileInputStream("src/main/assets/recipio-ai-intake-contract.json"));}
    private char[] key(){return ("sk-TEST_"+UUID.randomUUID()).toCharArray();}
    private AiRequestLifecycle.Token token()throws Exception{return new AiRequestLifecycle().tryBeginRequest(UUID.randomUUID().toString());}
    private String url="https://recipes.example/duck?id=2";
    private JSONObject search()throws Exception{return complete(RecipeFinderSourcesTest.search(new String[]{url},RecipeFinderSourcesTest.candidate(url)));}
    private JSONObject complete(JSONObject response)throws Exception{return response.put("status","completed").put("model","qwen3.8-flash").put("error",JSONObject.NULL);}
    private String draft()throws Exception{return new JSONObject().put("recipe",new JSONObject().put("title","啤酒鸭").put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","").put("ingredients",new JSONArray()).put("steps",new JSONArray()).put("preparations",new JSONArray()).put("keyTips",new JSONArray())).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();}
    private JSONObject extraction(String content)throws Exception{return complete(new JSONObject().put("output",new JSONArray().put(RecipeFinderSourcesTest.extractor(url,"鸭肉500克，加盐适量")).put(RecipeFinderSourcesTest.message(content))));}
    private RecipeFinderClient client(int status,String body)throws Exception{return new RecipeFinderClient(contract(),(r,t)->new RecipeFinderClient.HttpReply(status,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)),()->{}));}
    @Test public void fixedModelProfileRoutingToolsAndNoConversationAreUsedForSearchAndExtract()throws Exception {
        for(char[] secret:List.of(key(),("sk-ws-TEST_"+UUID.randomUUID()).toCharArray())){
            List<JSONObject> bodies=new ArrayList<>();List<String> endpoints=new ArrayList<>();
            RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{endpoints.add(r.endpoint);JSONObject body=new JSONObject(new String(r.body,StandardCharsets.UTF_8));bodies.add(body);assertFalse(body.toString().contains(new String(secret)));return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream((bodies.size()==1?search():extraction(draft())).toString().getBytes(StandardCharsets.UTF_8)),()->{});});
            assertEquals(1,client.search(" 啤酒鸭 ","不要辣",secret,token()).size());assertEquals(draft(),client.extract(url,secret,token()).rawJson);
            String endpoint=new String(secret).startsWith("sk-ws-")?"https://maas.qianwenaiapi.com/compatible-mode/v1/responses":"https://dashscope.aliyuncs.com/compatible-mode/v1/responses";
            assertEquals(List.of(endpoint,endpoint),endpoints);
            for(JSONObject body:bodies){assertEquals("qwen3.8-flash",body.getString("model"));assertFalse(body.getBoolean("store"));assertFalse(body.getBoolean("stream"));assertFalse(body.has("conversation"));assertFalse(body.has("previous_response_id"));assertFalse(body.toString().contains("code_interpreter"));}
            assertEquals("web_search",bodies.get(0).getJSONArray("tools").getJSONObject(0).getString("type"));assertEquals("web_extractor",bodies.get(0).getJSONArray("tools").getJSONObject(1).getString("type"));
            assertEquals(2,bodies.get(1).getJSONArray("tools").length());assertEquals("web_search",bodies.get(1).getJSONArray("tools").getJSONObject(0).getString("type"));assertEquals("web_extractor",bodies.get(1).getJSONArray("tools").getJSONObject(1).getString("type"));assertTrue(bodies.get(1).getJSONArray("input").toString().contains(url));
            Arrays.fill(secret,'\0');
        }
    }
    @Test public void missingKeyAndDishPreferenceLimitsStopBeforeAnyPost()throws Exception {
        int[] posts={0};RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{posts[0]++;return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(search().toString().getBytes(StandardCharsets.UTF_8)),()->{});});
        assertEquals("key_missing",assertThrows(AiFailure.class,()->client.search("啤酒鸭","",null,token())).code);
        for(String dish:List.of(" ","🍚".repeat(121)))assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.search(dish,"",key(),token())).code);
        assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.search("啤酒鸭","🍚".repeat(501),key(),token())).code);
        assertEquals(0,posts[0]);assertEquals(1,client.search("🍚".repeat(120),"🍚".repeat(500),key(),token()).size());assertEquals(1,posts[0]);
    }
    @Test public void incompleteWrongModelErrorMissingMessageAndMalformedJsonCannotReturnCandidates()throws Exception {
        List<String> bodies=List.of(search().put("status","incomplete").toString(),search().put("model","other").toString(),search().put("error",new JSONObject().put("message","PRIVATE")).toString(),complete(new JSONObject().put("output",new JSONArray())).toString(),"not JSON",search().toString().replace("\"status\":\"completed\"","\"status\":\"failed\",\"status\":\"completed\""));
        for(String body:bodies)assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,body).search("啤酒鸭","",key(),token())).code);
    }
    @Test public void validSelectedSourceReturnsOnlyRecipeContractAndBoundedTransientSourceText()throws Exception {
        RecipeFinderClient.Extraction result=client(200,extraction(draft()).toString()).extract(url,key(),token());assertEquals(draft(),result.rawJson);assertEquals("鸭肉500克，加盐适量",result.sourceText);
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("output","🍚".repeat(30001));result=client(200,root.toString()).extract(url,key(),token());assertEquals(30000,result.sourceText.codePointCount(0,result.sourceText.length()));
    }
    @Test public void zeroReliableRecipesAfterVerifiedSearchReturnsEmptyCandidates()throws Exception {
        JSONObject response=complete(RecipeFinderSourcesTest.search(new String[]{url}));
        assertTrue(client(200,response.toString()).search("啤酒鸭","",key(),token()).isEmpty());
    }
    @Test public void sourceMismatchAndMalformedRecipeStopBeforePreview()throws Exception {
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("urls",new JSONArray().put("https://recipes.example/other"));assertEquals("source_mismatch",assertThrows(AiFailure.class,()->client(200,root.toString()).extract(url,key(),token())).code);
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction("{\"recipe\":{}}").toString()).extract(url,key(),token())).code);
    }
    @Test public void statusFailuresExposeOnlyAllowlistedCodesAndNeverRetry()throws Exception {
        int[] statuses={302,400,401,403,429,500,503,599,600};
        String[] codes={"provider_access","provider_access","provider_access","provider_access","rate_limited","provider_unavailable","provider_unavailable","provider_unavailable","provider_access"};
        for(int i=0;i<statuses.length;i++){final int status=statuses[i];int[] posts={0};char[] secret=key();RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{posts[0]++;return new RecipeFinderClient.HttpReply(status,new ByteArrayInputStream(("PRIVATE "+new String(secret)).getBytes(StandardCharsets.UTF_8)),()->{});});AiFailure failure=assertThrows(AiFailure.class,()->client.search("啤酒鸭","",secret,token()));assertEquals("HTTP "+status,codes[i],failure.code);assertEquals(1,posts[0]);assertNull(failure.getCause());assertFalse(failure.toString().contains("PRIVATE"));}
    }
    @Test public void secretReflectionInToolsOrEscapedMessageCannotCrossBridge()throws Exception {
        char[] secret=key();JSONObject response=search();response.getJSONArray("output").getJSONObject(0).put("private",new String(secret));
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,response.toString().replace("sk-","\\u0073\\u006b-")).search("啤酒鸭","",secret,token())).code);
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("output",new String(secret));assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,root.toString()).extract(url,secret,token())).code);
    }
    @Test public void nestedJsonUnicodeSecretReflectionCannotBecomeRecipeOrCandidateText()throws Exception {
        char[] secret=key();String encoded=new String(secret).replace("sk-","\\u0073\\u006b-");
        String raw=draft().replace("\"notes\":\"\"","\"notes\":\""+encoded+"\"");
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction(raw).toString()).extract(url,secret,token())).code);
        JSONObject root=search();JSONObject message=root.getJSONArray("output").getJSONObject(1);String content=message.getJSONArray("content").getJSONObject(0).getString("text").replace("啤酒鸭",encoded);message.getJSONArray("content").getJSONObject(0).put("text",content);
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,root.toString()).search("啤酒鸭","",secret,token())).code);
    }
    @Test public void recipeCannotContainSourceProvenanceInNotesOrWarnings()throws Exception {
        for(String provenance:List.of(url,"来源 recipes.example","HTTPS://other.example/secret")){
            JSONObject raw=new JSONObject(draft());raw.getJSONObject("recipe").put("notes",provenance);
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction(raw.toString()).toString()).extract(url,key(),token())).code);
        }
    }
    @Test public void bodyBoundsUtf8AndCancelledIoCannotReturnLateSuccess()throws Exception {
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,"x".repeat(2097153)).search("啤酒鸭","",key(),token())).code);
        RecipeFinderClient invalid=new RecipeFinderClient(contract(),(r,t)->new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(new byte[]{(byte)255}),()->{}));assertEquals("invalid_output",assertThrows(AiFailure.class,()->invalid.search("啤酒鸭","",key(),token())).code);
        RecipeFinderClient cancelled=new RecipeFinderClient(contract(),(r,t)->{t.cancel("cancelled");throw new SocketTimeoutException("PRIVATE");});assertEquals("cancelled",assertThrows(AiFailure.class,()->cancelled.search("啤酒鸭","",key(),token())).code);
    }
    @Test public void actualHttpTransportPostsOnceAndDoesNotFollowRedirect()throws Exception {
        try(MockWebServer server=new MockWebServer()){
            server.enqueue(new MockResponse().setResponseCode(200).setBody(search().toString()));server.enqueue(new MockResponse().setResponseCode(302).setHeader("Location",server.url("/credential-sink")));
            RecipeFinderClient client=new RecipeFinderClient(contract(),new RecipeFinderClient.UrlConnectionTransport(endpoint->(HttpURLConnection)server.url("/responses").url().openConnection()));char[] secret=key();assertEquals(1,client.search("啤酒鸭","",secret,token()).size());
            RecordedRequest request=server.takeRequest(1,TimeUnit.SECONDS);assertNotNull(request);assertEquals("POST",request.getMethod());assertEquals("Bearer "+new String(secret),request.getHeader("Authorization"));assertFalse(request.getBody().readUtf8().contains(new String(secret)));
            assertEquals("provider_access",assertThrows(AiFailure.class,()->client.search("啤酒鸭","",secret,token())).code);assertEquals(2,server.getRequestCount());
        }
    }
    @Test public void actualHttpCancellationDisconnectsBeforeSuccessAndSharedFinishAcknowledges()throws Exception {
        try(MockWebServer server=new MockWebServer()){
            server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));RecipeFinderClient client=new RecipeFinderClient(contract(),new RecipeFinderClient.UrlConnectionTransport(endpoint->(HttpURLConnection)server.url("/responses").url().openConnection()));AiRequestLifecycle life=new AiRequestLifecycle();String id=UUID.randomUUID().toString();AiRequestLifecycle.Token token=life.tryBeginRequest(id);ExecutorService worker=Executors.newSingleThreadExecutor();
            try{Future<String> result=worker.submit(()->{try{client.search("啤酒鸭","",key(),token);return "UNSAFE_SUCCESS";}catch(AiFailure failure){return failure.code;}finally{life.finishRequest(id);}});assertNotNull(server.takeRequest(2,TimeUnit.SECONDS));life.cancel(id);assertEquals("cancelled",result.get(3,TimeUnit.SECONDS));assertNotNull(life.tryBeginRequest(UUID.randomUUID().toString()));}finally{worker.shutdownNow();}
        }
    }
    @Test public void absoluteWatchdogClosesStalledHttpWithoutAnyRetry()throws Exception {
        try(MockWebServer server=new MockWebServer()){
            server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));RecipeFinderClient client=new RecipeFinderClient(contract(),new RecipeFinderClient.UrlConnectionTransport(endpoint->(HttpURLConnection)server.url("/responses").url().openConnection()));AiRequestLifecycle life=new AiRequestLifecycle(()->System.nanoTime()/1000000L,250);AiRequestLifecycle.Token token=life.tryBeginRequest(UUID.randomUUID().toString());long start=System.nanoTime();assertEquals("timeout",assertThrows(AiFailure.class,()->client.search("啤酒鸭","",key(),token)).code);assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<3000);assertEquals(1,server.getRequestCount());
        }
    }
}
