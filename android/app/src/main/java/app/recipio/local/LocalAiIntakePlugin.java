package app.recipio.local;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

@CapacitorPlugin(name="LocalAiIntake")
public class LocalAiIntakePlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final Set<String> sessions=new HashSet<>();
    private final Set<String> pendingDiscards=new HashSet<>();
    private final LinkedHashSet<String> completedDiscards=new LinkedHashSet<>();
    private AiNativeRuntime runtime;private QwenClient client;
    private boolean picking;
    private volatile String activeOperation,activeRequest;private volatile AiRequestLifecycle.Token activeToken;
    @Override public void load(){runtime=AiNativeRuntime.get(getContext());try{client=new QwenClient(new AiIntakeContract(getContext().getAssets().open("recipio-ai-intake-contract.json")));}catch(Exception ignored){client=null;}worker.execute(()->{try{runtime.images(getContext()).cleanupAbandoned();}catch(Exception ignored){/* AI cache failure must not block local startup. */}});}
    private static void keys(PluginCall call,String... names)throws AiFailure {Set<String> allowed=new HashSet<>(Arrays.asList(names));if(call.getData().length()!=allowed.size())throw new AiFailure("input_invalid");Iterator<String> actual=call.getData().keys();while(actual.hasNext())if(!allowed.contains(actual.next()))throw new AiFailure("input_invalid");}
    private synchronized String operation(PluginCall call)throws AiFailure {String id=call.getString("operationId");if(!AiRequestLifecycle.uuid(id)||!sessions.contains(id))throw new AiFailure("stale_session");return id;}
    private void reject(PluginCall call,Exception error){AiFailure safe=error instanceof AiFailure?(AiFailure)error:new AiFailure("invalid_output");JSObject data=new JSObject();if(safe.httpStatus!=0)data.put("httpStatus",safe.httpStatus);if(safe.providerCode!=null)data.put("providerCode",safe.providerCode);call.reject(safe.code,safe.code,data);}
    @PluginMethod public void createSession(PluginCall call){try{keys(call);submit(call,()->{synchronized(this){if(sessions.size()+pendingDiscards.size()>=8)throw new AiFailure("busy");UUID id=UUID.randomUUID();runtime.images(getContext()).create(id);sessions.add(id.toString());call.resolve(new JSObject().put("operationId",id.toString()));}});}catch(Exception e){reject(call,e);}}
    @PluginMethod public void discardSession(PluginCall call){
        try{keys(call,"operationId");String id=call.getString("operationId");
            synchronized(this){if(!AiRequestLifecycle.uuid(id)||!sessions.contains(id)&&!pendingDiscards.contains(id)&&!completedDiscards.contains(id))throw new AiFailure("stale_session");
                if(completedDiscards.contains(id)){call.resolve();return;}sessions.remove(id);pendingDiscards.add(id);}
            AiRequestLifecycle.Token token=activeToken;if(token!=null&&id.equals(activeOperation))runtime.lifecycle.cancel(token.id);
            // Queue after decode/request work, so its image pin is released before cleanup is acknowledged.
            submit(call,()->{runtime.images(getContext()).discard(UUID.fromString(id));
                finishDiscard(id);
                call.resolve();});
        }catch(Exception e){reject(call,e);}
    }
    @PluginMethod public void cancel(PluginCall call){try{keys(call,"operationId","requestId");String id=operation(call),request=call.getString("requestId");if(!AiRequestLifecycle.uuid(request))throw new AiFailure("input_invalid");AiRequestLifecycle.Token token=activeToken;if(token!=null&&request.equals(token.id)&&id.equals(activeOperation)){runtime.lifecycle.cancel(request);token.whenFinished(call::resolve);}else call.resolve();}catch(Exception e){reject(call,e);}}
    @PluginMethod public void organize(PluginCall call){
        try{keys(call,"operationId","requestId","text","imageIds");String id=operation(call),request=call.getString("requestId");Object value=call.getData().get("text");if(!(value instanceof String))throw new AiFailure("input_invalid");JSArray handles=call.getArray("imageIds");if(handles==null)throw new AiFailure("input_invalid");
            if(handles.length()>6)throw new AiFailure("image_too_large");List<UUID> ids=new ArrayList<>();for(int i=0;i<handles.length();i++){Object handle=handles.get(i);if(!(handle instanceof String)||!AiRequestLifecycle.uuid((String)handle))throw new AiFailure("image_invalid");ids.add(UUID.fromString((String)handle));}if(new HashSet<>(ids).size()!=ids.size())throw new AiFailure("image_invalid");run(call,id,request,(String)value,ids,false);
        }catch(Exception e){reject(call,e);}
    }
    @PluginMethod public void preflight(PluginCall call){try{keys(call);run(call,null,UUID.randomUUID().toString(),"",Collections.emptyList(),true);}catch(Exception e){reject(call,e);}}
    private synchronized void finishDiscard(String id){pendingDiscards.remove(id);completedDiscards.add(id);if(completedDiscards.size()>32)completedDiscards.remove(completedDiscards.iterator().next());}
    @PluginMethod public void cleanupExpired(PluginCall call){try{keys(call);submit(call,()->{
        List<String> abandoned;synchronized(this){abandoned=new ArrayList<>(pendingDiscards);}
        for(String id:abandoned)try{runtime.images(getContext()).discard(UUID.fromString(id));finishDiscard(id);}catch(Exception ignored){/* Retain ownership and an actionable warning until the private filesystem recovers. */}
        boolean pending=runtime.images(getContext()).cleanupAbandoned();synchronized(this){pending|=!pendingDiscards.isEmpty();}
        call.resolve(new JSObject().put("pendingCleanup",pending));
    });}catch(Exception e){reject(call,e);}}
    @PluginMethod public void removeImage(PluginCall call){try{keys(call,"operationId","imageId");String id=operation(call),image=call.getString("imageId");if(!AiRequestLifecycle.uuid(image))throw new AiFailure("image_invalid");submit(call,()->{operation(call);runtime.images(getContext()).remove(UUID.fromString(id),UUID.fromString(image));call.resolve();});}catch(Exception e){reject(call,e);}}
    @PluginMethod public synchronized void pickImage(PluginCall call){try{keys(call,"operationId");operation(call);if(picking||activeToken!=null)throw new AiFailure("busy");picking=true;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("image/*");intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);try{startActivityForResult(call,intent,"imageSelected");}catch(RuntimeException ignored){picking=false;throw new AiFailure("image_invalid");}}catch(Exception e){reject(call,e);}}
    @ActivityCallback private void imageSelected(PluginCall call,ActivityResult result){
        if(call==null){synchronized(this){picking=false;}return;}
        if(result.getResultCode()!=Activity.RESULT_OK){synchronized(this){picking=false;}call.resolve(new JSObject().put("cancelled",true));return;}
        Uri uri=result.getData()==null?null:result.getData().getData();
        submit(call,()->{try{String id=operation(call);AiTemporaryImages.Image image=runtime.images(getContext()).importSelectedUri(getContext(),UUID.fromString(id),uri);operation(call);call.resolve(new JSObject().put("cancelled",false).put("image",new JSObject().put("id",image.id).put("mimeType","image/jpeg").put("byteSize",image.byteSize).put("width",image.width).put("height",image.height).put("previewUri",image.previewUri)));}finally{synchronized(this){picking=false;}}});
    }
    private interface LocalWork {void run()throws Exception;}
    private void submit(PluginCall call,LocalWork work){try{worker.execute(()->{try{work.run();}catch(Exception e){reject(call,e);}});}catch(RejectedExecutionException ignored){synchronized(this){picking=false;}reject(call,new AiFailure("stale_session"));}}
    private synchronized void run(PluginCall call,String operation,String request,String text,List<UUID> images,boolean preflight)throws Exception {
        if(client==null)throw new AiFailure("native_unavailable");AiRequestLifecycle.Token token=runtime.lifecycle.tryBeginRequest(request);activeOperation=operation;activeRequest=request;activeToken=token;
        try{worker.execute(()->{
            char[] key=null;String output=null;Exception failure=null;
            try{token.check();key=runtime.secrets.readForRequest();final char[] secret=key;if(preflight)output=client.organize(new QwenClient.Request("",Collections.emptyList(),true),key,token);else output=runtime.images(getContext()).withPinnedImages(UUID.fromString(operation),images,selected->{token.check();List<QwenClient.Image> payload=new ArrayList<>();for(AiTemporaryImages.Processed image:selected)payload.add(new QwenClient.Image("image/jpeg",Base64.encodeToString(image.bytes,Base64.NO_WRAP),image.bytes.length));return client.organize(new QwenClient.Request(text,payload,false),secret,token);});token.check();synchronized(this){if(operation!=null&&!sessions.contains(operation))throw new AiFailure("stale_session");}}
            catch(Exception e){failure=e;}
            finally{
                if(key!=null)Arrays.fill(key,'\0');
                String terminal=runtime.lifecycle.finishRequest(request);
                if(terminal!=null)failure=new AiFailure(terminal);
                synchronized(this){if(request.equals(activeRequest)){activeRequest=null;activeOperation=null;activeToken=null;}}
            }
            if(failure!=null)reject(call,failure);else if(preflight)call.resolve(new JSObject().put("available",true).put("model",AiIntakeContract.MODEL).put("region","beijing"));else call.resolve(new JSObject().put("rawJson",output));
        });}catch(RejectedExecutionException ignored){runtime.lifecycle.cancel(request);runtime.lifecycle.finishRequest(request);if(request.equals(activeRequest)){activeRequest=null;activeOperation=null;activeToken=null;}throw new AiFailure("stale_session");}
    }
    @Override protected void handleOnDestroy(){String request=activeRequest;if(request!=null)runtime.lifecycle.cancel(request);synchronized(this){Set<String> owned=new HashSet<>(sessions);owned.addAll(pendingDiscards);for(String id:owned)try{runtime.images(getContext()).discard(UUID.fromString(id));}catch(Exception ignored){/* Registered cache retried at next startup. */}sessions.clear();pendingDiscards.clear();completedDiscards.clear();}worker.shutdown();}
}
