package app.recipio.local;

import android.graphics.*;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

@CapacitorPlugin(name="LocalAiIntake")
public class LocalAiIntakePlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final Set<String> sessions=new HashSet<>();
    private AiNativeRuntime runtime;private QwenClient client;
    private volatile String activeOperation,activeRequest;private volatile AiRequestLifecycle.Token activeToken;
    @Override public void load(){runtime=AiNativeRuntime.get(getContext());try{client=new QwenClient(new AiIntakeContract(getContext().getAssets().open("recipio-ai-intake-contract.json")));}catch(Exception ignored){client=null;}}
    private static void keys(PluginCall call,String... names)throws AiFailure {Set<String> allowed=new HashSet<>(Arrays.asList(names));if(call.getData().length()!=allowed.size())throw new AiFailure("input_invalid");Iterator<String> actual=call.getData().keys();while(actual.hasNext())if(!allowed.contains(actual.next()))throw new AiFailure("input_invalid");}
    private synchronized String operation(PluginCall call)throws AiFailure {String id=call.getString("operationId");if(!AiRequestLifecycle.uuid(id)||!sessions.contains(id))throw new AiFailure("stale_session");return id;}
    private void reject(PluginCall call,Exception error){AiFailure safe=error instanceof AiFailure?(AiFailure)error:new AiFailure("invalid_output");JSObject data=new JSObject();if(safe.httpStatus!=0)data.put("httpStatus",safe.httpStatus);if(safe.providerCode!=null)data.put("providerCode",safe.providerCode);call.reject(safe.code,safe.code,data);}
    @PluginMethod public synchronized void createSession(PluginCall call){try{keys(call);if(sessions.size()>=8)throw new AiFailure("busy");String id=UUID.randomUUID().toString();sessions.add(id);call.resolve(new JSObject().put("operationId",id));}catch(Exception e){reject(call,e);}}
    @PluginMethod public void discardSession(PluginCall call){try{keys(call,"operationId");String id=operation(call);synchronized(this){sessions.remove(id);}AiRequestLifecycle.Token token=activeToken;if(token!=null&&id.equals(activeOperation)){runtime.lifecycle.cancel(token.id);token.whenFinished(call::resolve);}else call.resolve();}catch(Exception e){reject(call,e);}}
    @PluginMethod public void cancel(PluginCall call){try{keys(call,"operationId","requestId");String id=operation(call),request=call.getString("requestId");if(!AiRequestLifecycle.uuid(request))throw new AiFailure("input_invalid");AiRequestLifecycle.Token token=activeToken;if(token!=null&&request.equals(token.id)&&id.equals(activeOperation)){runtime.lifecycle.cancel(request);token.whenFinished(call::resolve);}else call.resolve();}catch(Exception e){reject(call,e);}}
    @PluginMethod public void organize(PluginCall call){
        try{keys(call,"operationId","requestId","text","imageIds");String id=operation(call),request=call.getString("requestId");Object value=call.getData().get("text");if(!(value instanceof String))throw new AiFailure("input_invalid");JSArray handles=call.getArray("imageIds");if(handles==null)throw new AiFailure("input_invalid");
            // Opaque screenshot resolver is attached by the temporary-media task.
            if(handles.length()!=0)throw new AiFailure("image_invalid");run(call,id,request,new QwenClient.Request((String)value,Collections.emptyList(),false));
        }catch(Exception e){reject(call,e);}
    }
    @PluginMethod public void preflight(PluginCall call){try{keys(call);run(call,null,UUID.randomUUID().toString(),new QwenClient.Request("",Collections.singletonList(preflightImage()),true));}catch(Exception e){reject(call,e);}}
    private static QwenClient.Image preflightImage()throws AiFailure {
        Bitmap bitmap=Bitmap.createBitmap(32,32,Bitmap.Config.ARGB_8888);
        try(ByteArrayOutputStream out=new ByteArrayOutputStream()){Canvas canvas=new Canvas(bitmap);canvas.drawColor(Color.WHITE);Paint paint=new Paint();paint.setColor(Color.RED);canvas.drawRect(8,8,24,24,paint);if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,out))throw new AiFailure("image_invalid");byte[] bytes=out.toByteArray();return new QwenClient.Image("image/png",Base64.encodeToString(bytes,Base64.NO_WRAP),bytes.length);}
        catch(Exception ignored){throw new AiFailure("image_invalid");}finally{bitmap.recycle();}
    }
    private synchronized void run(PluginCall call,String operation,String request,QwenClient.Request input)throws Exception {
        if(client==null)throw new AiFailure("native_unavailable");AiRequestLifecycle.Token token=runtime.lifecycle.tryBeginRequest(request);activeOperation=operation;activeRequest=request;activeToken=token;
        worker.execute(()->{
            char[] key=null;String output=null;Exception failure=null;
            try{key=runtime.secrets.readForRequest();output=client.organize(input,key,token);token.check();synchronized(this){if(operation!=null&&!sessions.contains(operation))throw new AiFailure("stale_session");}}
            catch(Exception e){failure=e;}
            finally{
                if(key!=null)Arrays.fill(key,'\0');
                String terminal=runtime.lifecycle.finishRequest(request);
                if(terminal!=null)failure=new AiFailure(terminal);
                synchronized(this){if(request.equals(activeRequest)){activeRequest=null;activeOperation=null;activeToken=null;}}
            }
            if(failure!=null)reject(call,failure);else if(input.preflight)call.resolve(new JSObject().put("available",true).put("model",AiIntakeContract.MODEL).put("region","beijing"));else call.resolve(new JSObject().put("rawJson",output));
        });
    }
    @Override protected void handleOnDestroy(){String request=activeRequest;if(request!=null)runtime.lifecycle.cancel(request);synchronized(this){sessions.clear();}worker.shutdownNow();}
}
