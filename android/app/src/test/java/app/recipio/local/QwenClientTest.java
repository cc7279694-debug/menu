package app.recipio.local;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.*;
import org.junit.Test;

public class QwenClientTest {
    private AiIntakeContract contract()throws Exception{return new AiIntakeContract(new FileInputStream("src/main/assets/recipio-ai-intake-contract.json"));}
    private char[] key(){return ("sk-"+UUID.randomUUID()).toCharArray();}
    private AiRequestLifecycle.Token token()throws Exception{return new AiRequestLifecycle().tryBeginRequest(UUID.randomUUID().toString());}
    private String draft()throws Exception{return new JSONObject().put("recipe",new JSONObject().put("title","啤酒鸭 🍚").put("totalMinutes",JSONObject.NULL).put("servings",JSONObject.NULL).put("caloriesPerServing",JSONObject.NULL).put("coverPath",JSONObject.NULL).put("notes","").put("ingredients",new JSONArray()).put("steps",new JSONArray()).put("preparations",new JSONArray()).put("keyTips",new JSONArray())).put("fieldChecks",new JSONArray()).put("warnings",new JSONArray()).toString();}
    private String envelope(Object content,String reason)throws Exception{return new JSONObject().put("choices",new JSONArray().put(new JSONObject().put("finish_reason",reason).put("message",new JSONObject().put("content",content)))).toString();}
    private QwenClient client(int status,String body)throws Exception{return new QwenClient(contract(),(request,cancel)->new QwenClient.HttpReply(status,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)),()->{}));}
    private QwenClient.Request request(){return new QwenClient.Request("啤酒鸭",Collections.emptyList(),false);}
    @Test public void workspaceKeyUsesOfficialPlatformForPreflightTextAndImagesWithoutFallback()throws Exception {
        char[] generated=("sk-ws-TEST_"+UUID.randomUUID()).toCharArray();
        List<QwenClient.Request> requests=List.of(new QwenClient.Request("unused",List.of(),true),request(),new QwenClient.Request("",List.of(new QwenClient.Image("image/png","AA==",1)),false));
        AtomicInteger posts=new AtomicInteger();
        try {
            for(QwenClient.Request input:requests){
                QwenClient client=new QwenClient(contract(),(req,cancel)->{
                    posts.incrementAndGet();
                    assertEquals("https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions",req.endpoint);
                    assertArrayEquals(generated,req.key);
                    assertFalse(new String(req.body,StandardCharsets.UTF_8).contains(new String(generated)));
                    return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope(input.preflight?"{\"status\":\"ok\"}":draft(),"stop").getBytes(StandardCharsets.UTF_8)),()->{});
                });
                assertEquals(input.preflight?"{\"status\":\"ok\"}":draft(),client.organize(input,generated,token()));
            }
            assertEquals(3,posts.get());
        }finally{Arrays.fill(generated,'\0');}
    }
    @Test public void tokenPlanAndMalformedWorkspaceKeysCannotReachAnyEndpoint()throws Exception {
        AtomicInteger posts=new AtomicInteger();
        QwenClient client=new QwenClient(contract(),(req,cancel)->{posts.incrementAndGet();throw new IOException();});
        for(String generated:List.of("sk-sp-TEST_"+UUID.randomUUID(),"sk-ws-TEST."+UUID.randomUUID()+"\n","sk-ws-TEST."+UUID.randomUUID()+"/other"))
            assertThrows(AiFailure.class,()->client.organize(new QwenClient.Request("test",List.of(),true),generated.toCharArray(),token()));
        assertEquals(0,posts.get());
    }
    @Test public void validReplyAndTextBlocksAreAccepted()throws Exception {
        String raw=draft();assertEquals(raw,client(200,envelope(raw,"stop")).organize(request(),key(),token()));
        JSONArray blocks=new JSONArray().put(new JSONObject().put("type","text").put("text",raw));assertEquals(raw,client(200,envelope(blocks,"stop")).organize(request(),key(),token()));
    }
    @Test public void fixedEndpointPromptSchemaAndNonThinkingParametersHaveNoBodySecret()throws Exception {
        char[] secret=key();QwenClient client=new QwenClient(contract(),(req,cancel)->{
            assertEquals(AiIntakeContract.ENDPOINT,req.endpoint);assertArrayEquals(secret,req.key);
            JSONObject body=new JSONObject(new String(req.body,StandardCharsets.UTF_8));assertEquals("qwen3.8-flash",body.getString("model"));assertFalse(body.getBoolean("stream"));assertFalse(body.getBoolean("enable_thinking"));assertEquals(16384,body.getInt("max_tokens"));
            assertEquals("json_schema",body.getJSONObject("response_format").getString("type"));assertTrue(body.getJSONObject("response_format").getJSONObject("json_schema").getBoolean("strict"));
            assertFalse(body.toString().contains(new String(secret)));assertTrue(body.getJSONArray("messages").getJSONObject(0).getString("content").contains("不可信"));
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope(draft(),"stop").getBytes(StandardCharsets.UTF_8)),()->{});
        });client.organize(request(),secret,token());
    }
    @Test public void imagesUseJsonObjectWithoutChangingRecipeBudget()throws Exception {
        QwenClient client=new QwenClient(contract(),(req,cancel)->{JSONObject body=new JSONObject(new String(req.body,StandardCharsets.UTF_8));assertEquals("json_object",body.getJSONObject("response_format").getString("type"));assertTrue(body.getJSONArray("messages").getJSONObject(1).get("content") instanceof JSONArray);assertEquals(16384,body.getInt("max_tokens"));
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope(draft(),"stop").getBytes(StandardCharsets.UTF_8)),()->{});});
        client.organize(new QwenClient.Request("",List.of(new QwenClient.Image("image/png","AA==",1)),false),key(),token());
    }
    @Test public void textPreflightUsesOnlyFixedSmallJsonSchemaAndNoImage()throws Exception {
        QwenClient client=new QwenClient(contract(),(req,cancel)->{
            JSONObject body=new JSONObject(new String(req.body,StandardCharsets.UTF_8));
            assertEquals("qwen3.8-flash",body.getString("model"));assertEquals(128,body.getInt("max_tokens"));
            assertFalse(body.getBoolean("stream"));assertFalse(body.getBoolean("enable_thinking"));
            JSONObject format=body.getJSONObject("response_format");assertEquals("json_schema",format.getString("type"));
            JSONObject schema=format.getJSONObject("json_schema").getJSONObject("schema");
            assertEquals("object",schema.getString("type"));assertFalse(schema.getBoolean("additionalProperties"));
            assertEquals(1,schema.getJSONObject("properties").length());assertEquals("string",schema.getJSONObject("properties").getJSONObject("status").getString("type"));
            assertEquals("ok",schema.getJSONObject("properties").getJSONObject("status").getJSONArray("enum").getString(0));
            assertEquals("status",schema.getJSONArray("required").getString(0));assertTrue(format.getJSONObject("json_schema").getBoolean("strict"));
            assertTrue(body.getJSONArray("messages").getJSONObject(1).get("content") instanceof String);
            assertFalse(body.toString().contains("image_url"));assertFalse(body.toString().contains("UNUSED_PRIVATE_SOURCE"));
            return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope("{\"status\":\"ok\"}","stop").getBytes(StandardCharsets.UTF_8)),()->{});
        });
        assertEquals("{\"status\":\"ok\"}",client.organize(new QwenClient.Request("UNUSED_PRIVATE_SOURCE",List.of(),true),key(),token()));
    }
    @Test public void preflightRejectsAnythingExceptExactStatusOkObject()throws Exception {
        for(String content:List.of("ok","{\"color\":\"red\"}","{\"status\":\"OK\"}","{\"status\":true}","{\"status\":null}","{\"status\":1}","{\"status\":\"ok\",\"extra\":1}","[]","{}","{\"status\":\"bad\",\"status\":\"ok\"}")){
            assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,envelope(content,"stop")).organize(new QwenClient.Request("test",List.of(),true),key(),token())).code);
        }
    }
    @Test public void preflightRejectsImageInputBeforeHttp()throws Exception {
        AtomicInteger posts=new AtomicInteger();QwenClient client=new QwenClient(contract(),(req,cancel)->{posts.incrementAndGet();return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope("{\"status\":\"ok\"}","stop").getBytes(StandardCharsets.UTF_8)),()->{});});
        assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.organize(new QwenClient.Request("test",List.of(new QwenClient.Image("image/png","AA==",1)),true),key(),token())).code);
        assertEquals(0,posts.get());
    }
    @Test public void accessFailureCodesArePreservedWithoutProviderMessages()throws Exception {
        for(String code:List.of("ModelNotFound","NoPermission","AccessDenied","UnsupportedModel")){
            String body=new JSONObject().put("error",new JSONObject().put("code",code).put("message","PRIVATE_PROVIDER_TEXT")).toString();
            AiFailure error=assertThrows(AiFailure.class,()->client(400,body).organize(new QwenClient.Request("test",List.of(),true),key(),token()));
            assertEquals(code,error.providerCode);assertEquals(400,error.httpStatus);assertFalse(error.toString().contains("PRIVATE_PROVIDER_TEXT"));
        }
    }
    @Test public void statusErrorsNeverEchoProviderMessageOrCredentials()throws Exception {
        int[] statuses={400,401,403,429,500,302};String[] codes={"provider_unavailable","unauthorized","forbidden","rate_limited","provider_unavailable","provider_unavailable"};
        for(int i=0;i<statuses.length;i++){final int status=statuses[i];char[] secret=key();String privateMessage=new JSONObject().put("error",new JSONObject().put("message",new String(secret)).put("code","ModelNotFound")).toString();
            AiFailure error=assertThrows(AiFailure.class,()->client(status,privateMessage).organize(request(),secret,token()));assertEquals(codes[i],error.code);assertEquals(status,error.httpStatus);assertFalse(error.toString().contains(new String(secret)));assertNull(error.getCause());}
    }
    @Test public void truncatedRefusalEmptyMalformedAndSchemaInvalidAreRejected()throws Exception {
        List<String> bodies=List.of(envelope(draft(),"length"),envelope("","stop"),envelope(JSONObject.NULL,"stop"),"not JSON",envelope("{\"recipe\":{}}","stop"),envelope(new JSONArray().put(new JSONObject().put("type","refusal")),"stop"));
        for(String body:bodies)assertEquals("invalid_output",assertThrows(AiFailure.class,()->client(200,body).organize(request(),key(),token())).code);
        JSONObject withRefusal=new JSONObject(envelope(draft(),"stop"));withRefusal.getJSONArray("choices").getJSONObject(0).getJSONObject("message").put("refusal","no");assertThrows(AiFailure.class,()->client(200,withRefusal.toString()).organize(request(),key(),token()));
    }
    @Test public void unknownBusinessFieldsImagesNumericStringsAndBadReferencesAreRejected()throws Exception {
        for(String field:List.of("secret","provider","confirmedAt")){JSONObject raw=new JSONObject(draft());raw.getJSONObject("recipe").put(field,"untrusted");assertThrows(AiFailure.class,()->client(200,envelope(raw.toString(),"stop")).organize(request(),key(),token()));}
        JSONObject raw=new JSONObject(draft());raw.getJSONObject("recipe").put("servings","2");assertThrows(AiFailure.class,()->client(200,envelope(raw.toString(),"stop")).organize(request(),key(),token()));
        raw.getJSONObject("recipe").put("servings",JSONObject.NULL).put("coverPath","images/secret.png");assertThrows(AiFailure.class,()->client(200,envelope(raw.toString(),"stop")).organize(request(),key(),token()));
        raw.getJSONObject("recipe").put("coverPath",JSONObject.NULL).put("keyTips",new JSONArray().put(new JSONObject().put("instruction","注意").put("stepNumber",1)));assertThrows(AiFailure.class,()->client(200,envelope(raw.toString(),"stop")).organize(request(),key(),token()));
    }
    @Test public void currentSecretInResponseIncludingJsonEscapesIsRejected()throws Exception {
        char[] secret=key();String text=new String(secret);JSONObject raw=new JSONObject(draft());raw.getJSONObject("recipe").put("notes",text);
        assertThrows(AiFailure.class,()->client(200,envelope(raw.toString(),"stop")).organize(request(),secret,token()));
        String escaped=raw.toString().replace("sk-","\\u0073\\u006b-");assertThrows(AiFailure.class,()->client(200,envelope(escaped,"stop")).organize(request(),secret,token()));
    }
    @Test public void streamLimitFailureAndCancellationAreClosed()throws Exception {
        AiFailure tooLarge=assertThrows(AiFailure.class,()->client(200,"x".repeat(2097153)).organize(request(),key(),token()));assertEquals("response_too_large",tooLarge.code);
        QwenClient failing=new QwenClient(contract(),(r,c)->new QwenClient.HttpReply(200,new InputStream(){public int read()throws IOException{throw new IOException("sensitive transport text");}},()->{}));
        AiFailure error=assertThrows(AiFailure.class,()->failing.organize(request(),key(),token()));assertEquals("network_unavailable",error.code);assertNull(error.getCause());assertFalse(error.toString().contains("sensitive"));
        AiRequestLifecycle life=new AiRequestLifecycle();String id=UUID.randomUUID().toString();AiRequestLifecycle.Token cancelled=life.tryBeginRequest(id);life.cancel(id);assertEquals("cancelled",assertThrows(AiFailure.class,()->client(200,envelope(draft(),"stop")).organize(request(),key(),cancelled)).code);
    }
    @Test public void inputLimitsCodePointsAndMissingKeyAreEnforcedBeforeHttp()throws Exception {
        AtomicInteger posts=new AtomicInteger();QwenClient client=new QwenClient(contract(),(r,c)->{posts.incrementAndGet();return new QwenClient.HttpReply(200,new ByteArrayInputStream(envelope(draft(),"stop").getBytes(StandardCharsets.UTF_8)),()->{});});
        client.organize(new QwenClient.Request("🍚".repeat(30000),List.of(),false),key(),token());assertEquals(1,posts.get());
        assertEquals("input_invalid",assertThrows(AiFailure.class,()->client.organize(new QwenClient.Request("🍚".repeat(30001),List.of(),false),key(),token())).code);
        assertThrows(AiFailure.class,()->client.organize(new QwenClient.Request(" ",List.of(),false),key(),token()));
        assertEquals("key_missing",assertThrows(AiFailure.class,()->client.organize(request(),null,token())).code);assertEquals(1,posts.get());
    }
    @Test public void secretsCannotBecomeSourceOrPreflightPayload()throws Exception {
        char[] secret=key();AtomicInteger posts=new AtomicInteger();QwenClient client=new QwenClient(contract(),(r,c)->{posts.incrementAndGet();throw new IOException();});
        assertThrows(AiFailure.class,()->client.organize(new QwenClient.Request(new String(secret),List.of(),false),secret,token()));assertEquals(0,posts.get());
    }
    @Test public void socketTimeoutAndOverallTimeoutAreDistinctFromOtherIo()throws Exception {
        QwenClient client=new QwenClient(contract(),(r,c)->{throw new java.net.SocketTimeoutException("private");});assertEquals("timeout",assertThrows(AiFailure.class,()->client.organize(request(),key(),token())).code);
        long[] now={0};AiRequestLifecycle.Token token=new AiRequestLifecycle(()->now[0],90).tryBeginRequest(UUID.randomUUID().toString());now[0]=90;assertEquals("timeout",assertThrows(AiFailure.class,()->client.organize(request(),key(),token)).code);
    }
    @Test public void cancelledErrorBodyDoesNotReplaceTimeoutWithUnauthorized()throws Exception {
        long[] now={0};AiRequestLifecycle.Token token=new AiRequestLifecycle(()->now[0],90).tryBeginRequest(UUID.randomUUID().toString());
        QwenClient client=new QwenClient(contract(),(r,c)->new QwenClient.HttpReply(401,new InputStream(){public int read(){now[0]=90;return 'x';}},()->{}));
        assertEquals("timeout",assertThrows(AiFailure.class,()->client.organize(request(),key(),token)).code);
    }
    @Test public void cancelledSocketAndInvalidUtf8CannotReturnSuccessOrDifferentError()throws Exception {
        QwenClient cancelled=new QwenClient(contract(),(r,c)->{c.cancel("cancelled");throw new java.net.SocketTimeoutException();});
        assertEquals("cancelled",assertThrows(AiFailure.class,()->cancelled.organize(request(),key(),token())).code);
        JSONObject raw=new JSONObject(draft());raw.getJSONObject("recipe").put("notes","UTF8_MARKER");byte[] damaged=envelope(raw.toString(),"stop").getBytes(StandardCharsets.UTF_8);
        int marker=new String(damaged,StandardCharsets.UTF_8).indexOf("UTF8_MARKER");int offset=new String(damaged,StandardCharsets.UTF_8).substring(0,marker).getBytes(StandardCharsets.UTF_8).length;damaged[offset]=(byte)0xff;
        QwenClient invalid=new QwenClient(contract(),(r,c)->new QwenClient.HttpReply(200,new ByteArrayInputStream(damaged),()->{}));
        assertEquals("invalid_output",assertThrows(AiFailure.class,()->invalid.organize(request(),key(),token())).code);
    }
}
