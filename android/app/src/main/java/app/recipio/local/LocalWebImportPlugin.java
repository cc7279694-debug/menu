package app.recipio.local;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;

@CapacitorPlugin(name="LocalWebImport")
public final class LocalWebImportPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private SafeWebFetcher fetcher=new SafeWebFetcher();
    private String activeId;
    private SafeWebFetcher.Token active;
    private boolean destroyed;
    private void reject(PluginCall call,Exception error){String code=error instanceof WebImportFailure?((WebImportFailure)error).code:"page_unreadable";call.reject(code,code);}
    @PluginMethod public void read(PluginCall call){
        try{
            WebImportRequest request=WebImportRequest.read(call.getData());final SafeWebFetcher.Token token=new SafeWebFetcher.Token();
            synchronized(this){if(destroyed)throw new WebImportFailure("stale_session");if(active!=null)throw new WebImportFailure("busy");active=token;activeId=request.requestId;}
            try{worker.execute(()->{
                SafeWebFetcher.Page page=null;Exception failure=null;
                try{page=fetcher.read(request.url,token);token.remaining();}catch(Exception error){failure=error;}
                finally{synchronized(this){if(active==token){active=null;activeId=null;}}}
                // Release ownership before resolving; JS may immediately issue the next request.
                if(failure!=null)reject(call,failure);else call.resolve(new JSObject().put("finalUrl",page.finalUrl).put("contentType",page.contentType).put("html",page.html));
            });}catch(RejectedExecutionException ignored){synchronized(this){if(active==token){active=null;activeId=null;}}throw new WebImportFailure("stale_session");}
        }catch(Exception error){reject(call,error);}
    }
    @PluginMethod public void cancel(PluginCall call){
        try{String id=WebImportRequest.cancel(call.getData());synchronized(this){if(id.equals(activeId)&&active!=null)active.cancel();}call.resolve();}
        catch(Exception error){reject(call,error);}
    }
    @Override protected void handleOnDestroy(){synchronized(this){destroyed=true;if(active!=null)active.cancel();}worker.shutdownNow();}
}
