package app.recipio.local;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Narrow, memory-only Responses boundary. Credentials and candidate ownership stay Native. */
@CapacitorPlugin(name="LocalRecipeFinder")
public final class LocalRecipeFinderPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final RecipeFinderSessions sessions=new RecipeFinderSessions();
    private AiNativeRuntime runtime;private RecipeFinderClient client;
    private String activeSession,activeRequest;private AiRequestLifecycle.Token activeToken;private boolean destroyed;
    private static final Set<String> ERRORS=Set.of("input_invalid","key_missing","network_unavailable","timeout","provider_access","provider_unavailable","search_failed","search_not_triggered","source_missing","source_mismatch","no_candidates","candidate_output_missing","extract_failed","source_unreadable","invalid_output","rate_limited","cancelled","busy","stale_session");
    @Override public void load(){runtime=AiNativeRuntime.get(getContext());try{client=new RecipeFinderClient(new AiIntakeContract(getContext().getAssets().open("recipio-ai-intake-contract.json")));}catch(Exception ignored){client=null;}}
    private static void keys(PluginCall call,String... names)throws AiFailure {try{RecipeFinderSources.exactKeys(call.getData(),names);}catch(AiFailure ignored){throw new AiFailure("input_invalid");}}
    private synchronized String session(PluginCall call)throws AiFailure {if(destroyed)throw new AiFailure("stale_session");String id=call.getString("sessionId");sessions.generation(id);return id;}
    private static String request(PluginCall call)throws AiFailure {String id=call.getString("requestId");if(!AiRequestLifecycle.uuid(id))throw new AiFailure("input_invalid");return id;}
    private static String text(PluginCall call,String name,int min,int max)throws Exception {Object raw=call.getData().get(name);if(!(raw instanceof String))throw new AiFailure("input_invalid");String value=((String)raw).trim();int points=value.codePointCount(0,value.length());if(points<min||points>max)throw new AiFailure("input_invalid");return value;}
    private void reject(PluginCall call,Exception error){String code=error instanceof AiFailure?((AiFailure)error).code:"invalid_output";if("key_unavailable".equals(code))code="key_missing";if(!ERRORS.contains(code))code="invalid_output";call.reject(code,code);}
    @PluginMethod public synchronized void createSession(PluginCall call){try{keys(call);if(destroyed)throw new AiFailure("stale_session");call.resolve(new JSObject().put("sessionId",sessions.create()));}catch(Exception error){reject(call,error);}}
    @PluginMethod public void search(PluginCall call){
        try{keys(call,"sessionId","requestId","dish","preference");String id=session(call),request=request(call),dish=text(call,"dish",1,120),preference=text(call,"preference",0,500);start(call,id,request,dish,preference,null);}catch(Exception error){reject(call,error);}
    }
    @PluginMethod public void extract(PluginCall call){
        try{keys(call,"sessionId","requestId","candidateId");String id=session(call),request=request(call),candidate=call.getString("candidateId");if(!AiRequestLifecycle.uuid(candidate))throw new AiFailure("source_missing");start(call,id,request,null,null,candidate);}catch(Exception error){reject(call,error);}
    }
    @PluginMethod public synchronized void cancel(PluginCall call){
        try{keys(call,"sessionId","requestId");String id=session(call),request=request(call);if(activeToken!=null&&id.equals(activeSession)&&request.equals(activeRequest)){runtime.lifecycle.cancel(request);activeToken.whenFinished(call::resolve);}else call.resolve();}catch(Exception error){reject(call,error);}
    }
    @PluginMethod public synchronized void discardSession(PluginCall call){
        try{keys(call,"sessionId");if(destroyed)throw new AiFailure("stale_session");String id=call.getString("sessionId");sessions.discard(id);if(activeToken!=null&&id.equals(activeSession)){runtime.lifecycle.cancel(activeRequest);activeToken.whenFinished(call::resolve);}else call.resolve();}catch(Exception error){reject(call,error);}
    }
    private synchronized void start(PluginCall call,String id,String request,String dish,String preference,String candidateId)throws Exception {
        if(destroyed)throw new AiFailure("stale_session");sessions.generation(id);if(client==null||runtime==null)throw new AiFailure("invalid_output");
        RecipeFinderSources.Candidate selected=candidateId==null?null:sessions.selected(id,candidateId);
        AiRequestLifecycle.Token token=runtime.lifecycle.tryBeginRequest(request);final long generation;
        try{generation=selected==null?sessions.beginSearch(id):sessions.generation(id);}catch(Exception error){runtime.lifecycle.finishRequest(request);throw error;}
        activeSession=id;activeRequest=request;activeToken=token;
        try{worker.execute(()->run(call,id,request,generation,dish,preference,selected,token));}
        catch(RejectedExecutionException ignored){runtime.lifecycle.cancel(request);clearActive(token);runtime.lifecycle.finishRequest(request);throw new AiFailure("stale_session");}
    }
    private void run(PluginCall call,String id,String request,long generation,String dish,String preference,RecipeFinderSources.Candidate selected,AiRequestLifecycle.Token token){
        char[] key=null;List<RecipeFinderSources.Candidate> candidates=null;RecipeFinderClient.Extraction extraction=null;Exception failure=null;
        try{token.check();key=runtime.secrets.readForRequest();if(key==null)throw new AiFailure("key_missing");if(selected==null)candidates=client.search(dish,preference,key,token);else extraction=client.extract(selected.sourceUrl,key,token);token.check();sessions.current(id,generation);}
        catch(Exception error){failure=error;}
        finally{if(key!=null)Arrays.fill(key,'\0');synchronized(this){clearActive(token);String terminal=runtime.lifecycle.finishRequest(request);if(terminal!=null)failure=new AiFailure(terminal);}}
        synchronized(this){
            try{if(failure!=null)throw failure;if(destroyed)throw new AiFailure("stale_session");sessions.current(id,generation);
                if(selected==null){sessions.publish(id,generation,candidates);JSArray values=new JSArray();for(RecipeFinderSources.Candidate candidate:candidates)values.put(new JSObject(candidate.json().toString()));call.resolve(new JSObject().put("candidates",values));}
                else call.resolve(new JSObject().put("rawJson",extraction.rawJson).put("sourceText",extraction.sourceText));
            }catch(Exception error){reject(call,error);}
        }
    }
    private void clearActive(AiRequestLifecycle.Token token){if(activeToken==token){activeToken=null;activeSession=null;activeRequest=null;}}
    @Override protected synchronized void handleOnDestroy(){destroyed=true;sessions.clear();if(activeToken!=null&&runtime!=null)runtime.lifecycle.cancel(activeRequest);worker.shutdown();}
}
