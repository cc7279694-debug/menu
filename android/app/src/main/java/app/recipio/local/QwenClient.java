package app.recipio.local;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.CharacterCodingException;
import java.util.List;
import java.util.*;
import java.util.concurrent.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import org.json.*;
import com.google.gson.*;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.Strictness;
final class QwenClient {
    interface AiHttpTransport{HttpReply execute(PreparedRequest request,AiRequestLifecycle.Token cancellation)throws Exception;}
    static final class PreparedRequest{final String endpoint=AiIntakeContract.ENDPOINT;final byte[] body;final char[] key;PreparedRequest(byte[] body,char[] key){this.body=body;this.key=key;}}
    static final class HttpReply{final int status;final InputStream body;final Runnable close;HttpReply(int status,InputStream body,Runnable close){this.status=status;this.body=body;this.close=close;}}
    static final class Image{final String mimeType,base64;final int byteSize;Image(String mime,String base64,int bytes){mimeType=mime;this.base64=base64;byteSize=bytes;}}
    static final class Request{final String text;final List<Image> images;final boolean preflight;Request(String text,List<Image> images,boolean preflight){this.text=text;this.images=images;this.preflight=preflight;}}
    private static final ScheduledExecutorService WATCHDOG=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"recipio-ai-deadline");t.setDaemon(true);return t;});
    private final AiIntakeContract contract;private final AiHttpTransport transport;
    QwenClient(AiIntakeContract contract,AiHttpTransport transport){this.contract=contract;this.transport=transport;}
    QwenClient(AiIntakeContract contract){this(contract,new HttpsTransport());}
    String organize(Request request,char[] key,AiRequestLifecycle.Token cancellation)throws AiFailure {
        ScheduledFuture<?> watchdog=null;HttpReply reply=null;
        try {
            cancellation.check();if(key==null)throw new AiFailure("key_missing");AiSecretEnvelope.validate(key);
            byte[] body=prepare(request);String secret=new String(key);if(new String(body,StandardCharsets.UTF_8).contains(secret))throw new AiFailure("input_invalid");
            watchdog=WATCHDOG.schedule(()->cancellation.cancel("timeout"),cancellation.remainingMillis(),TimeUnit.MILLISECONDS);
            reply=transport.execute(new PreparedRequest(body,key),cancellation);cancellation.check();
            if(reply.status!=200){String errorBody="";try{errorBody=read(reply.body,contract.limit("errorBytes"),cancellation);}catch(AiFailure ignored){}cancellation.check();throw failure(reply.status,errorBody);}
            String raw=read(reply.body,contract.limit("responseBytes"),cancellation);if(raw.contains(secret))throw new AiFailure("invalid_output");
            JsonElement root=AiIntakeContract.parse(raw);if(!root.isJsonObject()||root.toString().contains(secret))throw new AiFailure("invalid_output");JSONObject envelope=new JSONObject(root.toString());
            JSONArray choices=envelope.getJSONArray("choices");if(choices.length()!=1)throw new AiFailure("invalid_output");JSONObject choice=choices.getJSONObject(0),message=choice.getJSONObject("message");
            if(!"stop".equals(choice.optString("finish_reason"))||message.has("refusal")&&!message.isNull("refusal"))throw new AiFailure("invalid_output");
            Object value=message.get("content");String content;
            if(value instanceof String)content=(String)value;
            else if(value instanceof JSONArray){StringBuilder text=new StringBuilder();JSONArray blocks=(JSONArray)value;for(int i=0;i<blocks.length();i++){JSONObject block=blocks.getJSONObject(i);if(!"text".equals(block.getString("type"))||!(block.get("text") instanceof String))throw new AiFailure("invalid_output");text.append(block.getString("text"));}content=text.toString();}
            else throw new AiFailure("invalid_output");
            JsonElement result=AiIntakeContract.parse(content);if(result.toString().contains(secret))throw new AiFailure("invalid_output");
            if(request.preflight)validatePreflight(content);
            else contract.validateDraft(content);
            cancellation.check();return content;
        } catch(AiFailure failure){throw failure;}
        catch(SocketTimeoutException ignored){cancellation.check();throw new AiFailure("timeout");}
        catch(IOException ignored){cancellation.check();throw new AiFailure("network_unavailable");}
        catch(Exception ignored){throw new AiFailure("invalid_output");}
        finally{if(watchdog!=null)watchdog.cancel(false);if(reply!=null){try{reply.body.close();}catch(IOException ignored){}reply.close.run();}}
    }
    private static void validatePreflight(String content)throws Exception {
        // Read the original JSON, not a map which could hide duplicate status keys.
        try(JsonReader reader=new JsonReader(new StringReader(content))){
            reader.setStrictness(Strictness.STRICT);reader.beginObject();
            if(!reader.hasNext()||!"status".equals(reader.nextName())||reader.peek()!=JsonToken.STRING||!"ok".equals(reader.nextString())||reader.hasNext())throw new AiFailure("invalid_output");
            reader.endObject();if(reader.peek()!=JsonToken.END_DOCUMENT)throw new AiFailure("invalid_output");
        }
    }
    private byte[] prepare(Request request)throws Exception {
        if(request.preflight&&!request.images.isEmpty())throw new AiFailure("input_invalid");
        String text=request.preflight?"返回 JSON：{\"status\":\"ok\"}":request.text.trim();if(text.codePointCount(0,text.length())>contract.limit("textCodePoints")||text.isEmpty()&&request.images.isEmpty()||request.images.size()>contract.limit("imageCount"))throw new AiFailure("input_invalid");
        long total=0;JSONArray content=new JSONArray();content.put(new JSONObject().put("type","text").put("text",request.preflight?text:new JSONObject().put("untrustedSourceText",text).toString()));
        for(Image image:request.images){if(!Arrays.asList("image/jpeg","image/png","image/webp").contains(image.mimeType)||image.byteSize<=0||image.byteSize>contract.limit("imageBytes")||image.base64.length()>((image.byteSize+2)/3)*4)throw new AiFailure("image_too_large");total+=image.byteSize;content.put(new JSONObject().put("type","image_url").put("image_url",new JSONObject().put("url","data:"+image.mimeType+";base64,"+image.base64)));}
        if(total>contract.limit("totalImageBytes"))throw new AiFailure("image_too_large");
        JSONObject format=request.images.isEmpty()?new JSONObject().put("type","json_schema").put("json_schema",new JSONObject().put("name","recipio_recipe").put("strict",true).put("schema",contract.asset.getJSONObject("schema"))):new JSONObject().put("type","json_object");
        if(request.preflight)format=new JSONObject().put("type","json_schema").put("json_schema",new JSONObject().put("name","recipio_preflight").put("strict",true).put("schema",new JSONObject("{\"type\":\"object\",\"properties\":{\"status\":{\"type\":\"string\",\"enum\":[\"ok\"]}},\"required\":[\"status\"],\"additionalProperties\":false}")));
        JSONObject body=new JSONObject().put("model",AiIntakeContract.MODEL).put("enable_thinking",false).put("stream",false).put("temperature",0.1).put("max_tokens",request.preflight?128:16384).put("response_format",format).put("messages",new JSONArray().put(new JSONObject().put("role","system").put("content",request.preflight?"Return only the fixed JSON object {\"status\":\"ok\"}, without explanation.":contract.asset.getString("systemPrompt"))).put(new JSONObject().put("role","user").put("content",request.images.isEmpty()?content.getJSONObject(0).getString("text"):content)));
        byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>contract.limit("requestBytes"))throw new AiFailure("input_invalid");return bytes;
    }
    private static String read(InputStream input,int limit,AiRequestLifecycle.Token cancellation)throws IOException,AiFailure {
        if(input==null)throw new AiFailure("invalid_output");try(ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){cancellation.check();if(n==0)continue;if(out.size()+n>limit)throw new AiFailure("response_too_large");out.write(buffer,0,n);}try{return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(out.toByteArray())).toString();}catch(CharacterCodingException ignored){throw new AiFailure("invalid_output");}}
    }
    private static AiFailure failure(int status,String body){
        String code=status==401?"unauthorized":status==403?"forbidden":status==429?"rate_limited":"provider_unavailable",provider=null;
        try{JSONObject json=new JSONObject(AiIntakeContract.parse(body).toString());String value=json.getJSONObject("error").getString("code");if(Arrays.asList("ModelNotFound","InvalidApiKey","AccessDenied","InvalidParameter","QuotaExceeded","ResourceNotFound","NoPermission","UnsupportedModel","ModelNotSupported","model_not_found","invalid_api_key","insufficient_quota").contains(value))provider=value;}catch(Exception ignored){}
        return new AiFailure(code,status,provider);
    }
    private static final class HttpsTransport implements AiHttpTransport {
        public HttpReply execute(PreparedRequest request,AiRequestLifecycle.Token token)throws Exception {
            if(!AiIntakeContract.ENDPOINT.equals(request.endpoint))throw new AiFailure("input_invalid");
            HttpsURLConnection connection=(HttpsURLConnection)new URL(AiIntakeContract.ENDPOINT).openConnection();
            token.onCancel(connection::disconnect);
            try{token.check();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(60000);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json; charset=utf-8");connection.setRequestProperty("Accept-Encoding","identity");connection.setRequestProperty("Authorization","Bearer "+new String(request.key));connection.setFixedLengthStreamingMode(request.body.length);
                try(OutputStream output=connection.getOutputStream()){output.write(request.body);}token.check();int status=connection.getResponseCode();InputStream input=status==200?connection.getInputStream():connection.getErrorStream();if(input==null)input=new ByteArrayInputStream(new byte[0]);
                String encoding=connection.getContentEncoding();if(encoding!=null&&!encoding.equalsIgnoreCase("identity"))throw new AiFailure("invalid_output");return new HttpReply(status,input,connection::disconnect);
            }catch(Exception error){connection.disconnect();throw error;}
        }
    }
}
