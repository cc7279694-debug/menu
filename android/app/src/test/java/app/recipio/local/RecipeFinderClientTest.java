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
    private final String url="https://recipes.example/duck?id=2";
    private JSONObject function(String name,String arguments)throws Exception {
        return new JSONObject().put("type","function_call").put("name",name).put("arguments",arguments)
            .put("status","completed").put("call_id","call_"+UUID.randomUUID()).put("id","fc_"+UUID.randomUUID());
    }
    private JSONObject searchCall(String... urls)throws Exception {
        JSONArray sources=new JSONArray();for(String source:urls)sources.put(new JSONObject().put("type","url").put("url",source));
        return new JSONObject().put("type","web_search_call").put("status","completed")
            .put("action",new JSONObject().put("type","search").put("sources",sources));
    }
    private String candidates(JSONObject... values)throws Exception{return new JSONObject().put("candidates",new JSONArray(Arrays.asList(values))).toString();}
    private JSONObject search(String arguments)throws Exception{return complete(new JSONObject().put("output",new JSONArray().put(searchCall(url)).put(function("submit_candidates",arguments))));}
    private JSONObject search()throws Exception{return search(candidates(RecipeFinderSourcesTest.candidate(url)));}
    private JSONObject complete(JSONObject response)throws Exception{return response.put("status","completed").put("model","qwen3.8-flash").put("error",JSONObject.NULL);}
    private String draft()throws Exception{return new JSONObject().put("recipe",new JSONObject().put("title","啤酒鸭").put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","").put("ingredients",new JSONArray()).put("steps",new JSONArray()).put("preparations",new JSONArray()).put("keyTips",new JSONArray())).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();}
    private JSONObject extraction(String content)throws Exception{return complete(new JSONObject().put("output",new JSONArray().put(RecipeFinderSourcesTest.extractor(url,"鸭肉500克，加盐适量")).put(function("submit_recipe_draft",content))));}
    private RecipeFinderClient client(int status,String body)throws Exception{return new RecipeFinderClient(contract(),(r,t)->new RecipeFinderClient.HttpReply(status,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)),()->{}));}
    private JSONObject handoff(JSONObject body,String name)throws Exception {
        JSONObject found=null;JSONArray tools=body.getJSONArray("tools");
        for(int i=0;i<tools.length();i++){JSONObject tool=tools.getJSONObject(i);if("function".equals(tool.optString("type"))){assertNull("Only one result handoff may be declared",found);assertEquals(name,tool.getString("name"));found=tool;}}
        assertNotNull("The request must declare the result handoff",found);return found;
    }
    @Test public void selectedExtractionInstructionsDoNotRetainIntakeOnlyTransportOrToolBan()throws Exception {
        AiIntakeContract shared=contract();String original=shared.asset.getString("systemPrompt");
        assertTrue(original.contains("不访问工具、账号或其他数据"));
        assertTrue(original.contains("仅输出符合所给JSON Schema的JSON对象"));
        RecipeFinderClient finder=new RecipeFinderClient(shared,(request,requestToken)->{
            String instructions=new JSONObject(new String(request.body,StandardCharsets.UTF_8)).getString("instructions");
            assertFalse(instructions.contains("不访问工具"));
            assertFalse(instructions.contains("仅输出符合所给JSON Schema的JSON对象"));
            assertTrue(instructions.contains("必须调用 web_extractor"));
            assertTrue(instructions.contains("仅以 submit_recipe_draft 函数参数提交"));
            assertTrue(instructions.contains("不访问账号或其他数据"));
            assertTrue(instructions.contains("盐适量、少许等照抄，不换精确克数"));
            assertTrue(instructions.contains("status只能explicit/inferred/missing"));
            return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(extraction(draft()).toString().getBytes(StandardCharsets.UTF_8)),()->{});
        });
        finder.extract(url,key(),token());assertEquals(original,shared.asset.getString("systemPrompt"));
    }
    private JSONObject candidateSchema()throws Exception {
        return new JSONObject("{\"type\":\"object\",\"properties\":{\"candidates\":{\"type\":\"array\",\"maxItems\":3,\"items\":{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"},\"sourceUrl\":{\"type\":\"string\"},\"summary\":{\"type\":\"string\"},\"highlights\":{\"type\":\"array\",\"maxItems\":3,\"items\":{\"type\":\"string\"}},\"totalMinutes\":{\"anyOf\":[{\"type\":\"integer\"},{\"type\":\"null\"}]},\"preparationHint\":{\"type\":\"string\"},\"timeEvidence\":{\"type\":\"string\"},\"preparationEvidence\":{\"type\":\"string\"}},\"required\":[\"title\",\"sourceUrl\",\"summary\",\"highlights\",\"totalMinutes\",\"preparationHint\",\"timeEvidence\",\"preparationEvidence\"],\"additionalProperties\":false}}},\"required\":[\"candidates\"],\"additionalProperties\":false}");
    }
    @Test public void fixedModelProfileRoutingToolsAndNoConversationAreUsedForSearchAndExtract()throws Exception {
        for(char[] secret:List.of(key(),("sk-ws-TEST_"+UUID.randomUUID()).toCharArray())){
            List<JSONObject> bodies=new ArrayList<>();List<String> endpoints=new ArrayList<>();
            RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{endpoints.add(r.endpoint);JSONObject body=new JSONObject(new String(r.body,StandardCharsets.UTF_8));bodies.add(body);assertFalse(body.toString().contains(new String(secret)));return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream((bodies.size()==1?search():extraction(draft())).toString().getBytes(StandardCharsets.UTF_8)),()->{});});
            assertEquals(1,client.search(" 啤酒鸭 ","不要辣",secret,token()).size());assertEquals(draft(),client.extract(url,secret,token()).rawJson);
            String endpoint=new String(secret).startsWith("sk-ws-")?"https://maas.qianwenaiapi.com/compatible-mode/v1/responses":"https://dashscope.aliyuncs.com/compatible-mode/v1/responses";
            assertEquals(List.of(endpoint,endpoint),endpoints);
            for(JSONObject body:bodies){assertEquals("qwen3.8-flash",body.getString("model"));assertFalse(body.getBoolean("store"));assertFalse(body.getBoolean("stream"));assertFalse(body.has("conversation"));assertFalse(body.has("previous_response_id"));assertFalse(body.has("response_format"));assertFalse(body.toString().contains("code_interpreter"));}
            assertEquals("web_search",bodies.get(0).getJSONArray("tools").getJSONObject(0).getString("type"));assertEquals("web_extractor",bodies.get(0).getJSONArray("tools").getJSONObject(1).getString("type"));
            assertEquals(3,bodies.get(0).getJSONArray("tools").length());assertEquals(com.google.gson.JsonParser.parseString(candidateSchema().toString()),com.google.gson.JsonParser.parseString(handoff(bodies.get(0),"submit_candidates").getJSONObject("parameters").toString()));
            assertEquals(3,bodies.get(1).getJSONArray("tools").length());assertEquals("web_search",bodies.get(1).getJSONArray("tools").getJSONObject(0).getString("type"));assertEquals("web_extractor",bodies.get(1).getJSONArray("tools").getJSONObject(1).getString("type"));assertTrue(bodies.get(1).getJSONArray("input").toString().contains(url));
            assertEquals(com.google.gson.JsonParser.parseString(contract().asset.getJSONObject("schema").toString()),com.google.gson.JsonParser.parseString(handoff(bodies.get(1),"submit_recipe_draft").getJSONObject("parameters").toString()));
            Arrays.fill(secret,'\0');
        }
    }
    @Test public void validCandidateFunctionReturnsVerifiedCandidateWithoutAssistantMessage()throws Exception {
        List<RecipeFinderSources.Candidate> result=client(200,search().toString()).search("啤酒鸭","",key(),token());
        assertEquals(1,result.size());assertEquals("啤酒鸭",result.get(0).title);assertEquals(url,result.get(0).sourceUrl);
    }
    @Test public void assistantJsonOrFenceCannotReplaceCandidateFunction()throws Exception {
        String raw=candidates(RecipeFinderSourcesTest.candidate(url));
        for(String assistant:List.of(raw,"```json\n"+raw+"\n```")){
            JSONObject response=complete(new JSONObject().put("output",new JSONArray().put(searchCall(url)).put(RecipeFinderSourcesTest.message(assistant))));
            assertEquals("candidate_output_missing",assertThrows(AiFailure.class,()->client(200,response.toString()).search("啤酒鸭","",key(),token())).code);
        }
    }
    @Test public void malformedCandidateArgumentsCannotFallbackToValidAssistantJson()throws Exception {
        String valid=candidates(RecipeFinderSourcesTest.candidate(url));
        for(String raw:List.of("not JSON","```json\n"+valid+"\n```",valid+" trailing","{\"candidates\":[],\"candidates\":[]}")){
            JSONObject response=search(raw);response.getJSONArray("output").put(RecipeFinderSourcesTest.message(valid));
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,response.toString()).search("啤酒鸭","",key(),token())).code);
        }
    }
    @Test public void candidateFunctionRequiresExactRootAndEveryCandidateField()throws Exception {
        JSONObject extraRoot=new JSONObject(candidates(RecipeFinderSourcesTest.candidate(url))).put("sourceUrl",url);
        for(String raw:List.of(extraRoot.toString(),"{}","{\"candidates\":null}","{\"candidates\":{}}"))
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,search(raw).toString()).search("啤酒鸭","",key(),token())).code);
        JSONObject extraCandidate=RecipeFinderSourcesTest.candidate(url).put("rating",5);
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,search(candidates(extraCandidate)).toString()).search("啤酒鸭","",key(),token())).code);
        for(String missing:List.of("title","sourceUrl","summary","highlights","totalMinutes","preparationHint","timeEvidence","preparationEvidence")){
            JSONObject value=RecipeFinderSourcesTest.candidate(url);value.remove(missing);
            assertEquals(missing,"invalid_output",assertThrows(AiFailure.class,()->client(200,search(candidates(value)).toString()).search("啤酒鸭","",key(),token())).code);
        }
    }
    @Test public void candidateArgumentTypesAndArrayLimitsAreStrictBeforeFiltering()throws Exception {
        List<JSONObject> invalid=List.of(RecipeFinderSourcesTest.candidate(url).put("title",JSONObject.NULL),RecipeFinderSourcesTest.candidate(url).put("summary",3),RecipeFinderSourcesTest.candidate(url).put("highlights",new JSONArray().put(1)),RecipeFinderSourcesTest.candidate(url).put("highlights",new JSONArray().put("1").put("2").put("3").put("4")),RecipeFinderSourcesTest.candidate(url).put("totalMinutes",1.5),RecipeFinderSourcesTest.candidate(url).put("preparationEvidence",JSONObject.NULL));
        for(JSONObject value:invalid)
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,search(candidates(value)).toString()).search("啤酒鸭","",key(),token())).code);
        String tooMany=candidates(RecipeFinderSourcesTest.candidate(url),RecipeFinderSourcesTest.candidate(url),RecipeFinderSourcesTest.candidate(url),RecipeFinderSourcesTest.candidate(url));
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,search(tooMany).toString()).search("啤酒鸭","",key(),token())).code);
    }
    @Test public void resultFunctionMustHaveStringArgumentsCompletedStatusAndExpectedName()throws Exception {
        for(Object arguments:List.of(new JSONObject(candidates(RecipeFinderSourcesTest.candidate(url))),JSONObject.NULL,3)){
            JSONObject response=search();response.getJSONArray("output").getJSONObject(1).put("arguments",arguments);
            assertThrows(AiFailure.class,()->client(200,response.toString()).search("啤酒鸭","",key(),token()));
        }
        for(String state:List.of("in_progress","incomplete","failed")){
            JSONObject response=search();response.getJSONArray("output").getJSONObject(1).put("status",state);
            assertThrows(AiFailure.class,()->client(200,response.toString()).search("啤酒鸭","",key(),token()));
        }
        JSONObject wrongName=search();wrongName.getJSONArray("output").getJSONObject(1).put("name","submit_recipe_draft");
        assertThrows(AiFailure.class,()->client(200,wrongName.toString()).search("啤酒鸭","",key(),token()));
        JSONObject duplicate=search();duplicate.getJSONArray("output").put(function("submit_candidates",candidates(RecipeFinderSourcesTest.candidate(url))));
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,duplicate.toString()).search("啤酒鸭","",key(),token())).code);
    }
    @Test public void candidateFunctionCannotAuthorizeUrlAbsentFromCompletedSearchSources()throws Exception {
        String invented="https://recipes.example/invented?id=9";JSONObject response=search(candidates(RecipeFinderSourcesTest.candidate(invented)));
        response.getJSONArray("output").put(RecipeFinderSourcesTest.message(new JSONObject().put("sources",new JSONArray().put(new JSONObject().put("type","url").put("url",invented))).toString()));
        assertEquals("no_candidates",assertThrows(AiFailure.class,()->client(200,response.toString()).search("啤酒鸭","",key(),token())).code);
        JSONObject failed=search();failed.getJSONArray("output").getJSONObject(0).put("status","failed");
        assertEquals("search_not_triggered",assertThrows(AiFailure.class,()->client(200,failed.toString()).search("啤酒鸭","",key(),token())).code);
    }
    @Test public void missingKeyAndDishPreferenceLimitsStopBeforeAnyPost()throws Exception {
        int[] posts={0};RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{posts[0]++;return new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(search().toString().getBytes(StandardCharsets.UTF_8)),()->{});});
        assertEquals("key_missing",assertThrows(AiFailure.class,()->client.search("啤酒鸭","",null,token())).code);
        for(String dish:List.of(" ","🍚".repeat(121)))assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.search(dish,"",key(),token())).code);
        assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.search("啤酒鸭","🍚".repeat(501),key(),token())).code);
        assertEquals(0,posts[0]);assertEquals(1,client.search("🍚".repeat(120),"🍚".repeat(500),key(),token()).size());assertEquals(1,posts[0]);
    }
    @Test public void incompleteWrongModelErrorAndMalformedJsonCannotReturnCandidates()throws Exception {
        List<String> bodies=List.of(search().put("status","incomplete").toString(),search().put("model","other").toString(),search().put("error",new JSONObject().put("message","PRIVATE")).toString(),"not JSON",search().toString().replace("\"status\":\"completed\"","\"status\":\"failed\",\"status\":\"completed\""));
        for(String body:bodies)assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,body).search("啤酒鸭","",key(),token())).code);
    }
    @Test public void validSelectedSourceReturnsOnlyRecipeContractAndBoundedTransientSourceText()throws Exception {
        RecipeFinderClient.Extraction result=client(200,extraction(draft()).toString()).extract(url,key(),token());assertEquals(draft(),result.rawJson);assertEquals("鸭肉500克，加盐适量",result.sourceText);
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("output","🍚".repeat(30001));result=client(200,root.toString()).extract(url,key(),token());assertEquals(30000,result.sourceText.codePointCount(0,result.sourceText.length()));
    }
    @Test public void zeroReliableRecipesAfterVerifiedSearchReturnsEmptyCandidates()throws Exception {
        JSONObject response=search(candidates());
        assertTrue(client(200,response.toString()).search("啤酒鸭","",key(),token()).isEmpty());
    }
    @Test public void sourceMismatchAndMalformedRecipeStopBeforePreview()throws Exception {
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("urls",new JSONArray().put("https://recipes.example/other"));assertEquals("source_mismatch",assertThrows(AiFailure.class,()->client(200,root.toString()).extract(url,key(),token())).code);
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction("{\"recipe\":{}}").toString()).extract(url,key(),token())).code);
    }
    @Test public void assistantRecipeCannotReplaceDraftFunction()throws Exception {
        for(String assistant:List.of(draft(),"```json\n"+draft()+"\n```")){
            JSONObject response=complete(new JSONObject().put("output",new JSONArray().put(RecipeFinderSourcesTest.extractor(url,"鸭肉500克")).put(RecipeFinderSourcesTest.message(assistant))));
            assertThrows(AiFailure.class,()->client(200,response.toString()).extract(url,key(),token()));
        }
    }
    @Test public void draftFunctionCannotBypassCompletedSelectedExtractorOrExecutedSearchGate()throws Exception {
        JSONObject searched=extraction(draft());searched.getJSONArray("output").put(searchCall(url));
        assertEquals("source_mismatch",assertThrows(AiFailure.class,()->client(200,searched.toString()).extract(url,key(),token())).code);
        JSONObject missing=complete(new JSONObject().put("output",new JSONArray().put(function("submit_recipe_draft",draft()))));
        assertEquals("source_unreadable",assertThrows(AiFailure.class,()->client(200,missing.toString()).extract(url,key(),token())).code);
        JSONObject failed=extraction(draft());failed.getJSONArray("output").getJSONObject(0).put("status","failed");
        assertEquals("source_unreadable",assertThrows(AiFailure.class,()->client(200,failed.toString()).extract(url,key(),token())).code);
    }
    @Test public void strictDraftFunctionRejectsMalformedExtraAndMissingRecipeFields()throws Exception {
        JSONObject extra=new JSONObject(draft()).put("sourceUrl",url),missing=new JSONObject(draft());missing.getJSONObject("recipe").remove("notes");
        for(String raw:List.of("not JSON","```json\n"+draft()+"\n```",extra.toString(),missing.toString(),draft().replace("\"notes\":\"\"","\"notes\":\"\",\"notes\":\"\"")))
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction(raw).toString()).extract(url,key(),token())).code);
    }
    @Test public void statusFailuresExposeOnlyAllowlistedCodesAndNeverRetry()throws Exception {
        int[] statuses={302,400,401,403,429,500,503,599,600};
        String[] codes={"provider_access","provider_access","provider_access","provider_access","rate_limited","provider_unavailable","provider_unavailable","provider_unavailable","provider_access"};
        for(int i=0;i<statuses.length;i++){final int status=statuses[i];int[] posts={0};char[] secret=key();RecipeFinderClient client=new RecipeFinderClient(contract(),(r,t)->{posts[0]++;return new RecipeFinderClient.HttpReply(status,new ByteArrayInputStream(("PRIVATE "+new String(secret)).getBytes(StandardCharsets.UTF_8)),()->{});});AiFailure failure=assertThrows(AiFailure.class,()->client.search("啤酒鸭","",secret,token()));assertEquals("HTTP "+status,codes[i],failure.code);assertEquals(1,posts[0]);assertNull(failure.getCause());assertFalse(failure.toString().contains("PRIVATE"));}
    }
    @Test public void secretReflectionInToolsOrEscapedEnvelopeCannotCrossBridge()throws Exception {
        char[] secret=key();JSONObject response=search();response.getJSONArray("output").getJSONObject(0).put("private",new String(secret));
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,response.toString().replace("sk-","\\u0073\\u006b-")).search("啤酒鸭","",secret,token())).code);
        JSONObject root=extraction(draft());root.getJSONArray("output").getJSONObject(0).put("output",new String(secret));assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,root.toString()).extract(url,secret,token())).code);
    }
    @Test public void nestedJsonUnicodeSecretReflectionCannotBecomeRecipeOrCandidateText()throws Exception {
        char[] secret=key();String encoded=new String(secret).replace("sk-","\\u0073\\u006b-");
        String raw=draft().replace("\"notes\":\"\"","\"notes\":\""+encoded+"\"");
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,extraction(raw).toString()).extract(url,secret,token())).code);
        JSONObject root=search();JSONObject handoff=root.getJSONArray("output").getJSONObject(1);String content=handoff.getString("arguments").replace("啤酒鸭",encoded);handoff.put("arguments",content);
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
