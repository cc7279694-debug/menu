package app.recipio.local;

import android.content.*;
import android.net.Uri;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "LocalShareTarget")
public final class LocalShareTargetPlugin extends Plugin {
    private static volatile LocalShareTargetPlugin current;
    private static final Set<UUID> pendingCleanup=ConcurrentHashMap.newKeySet();
    private volatile boolean destroyed;
    @Override public void load(){
        current=this;ShareTargetInbox.PROCESS.requeueLeased();
        try{ShareMediaInbox.forContext(getContext()).initialize((count,reason)->signal());}catch(Exception ignored){/* Receipt operations report a safe retryable transport error. */}
        signal();
    }
    @Override protected synchronized void handleOnDestroy(){destroyed=true;if(current==this)current=null;}
    private static void signal(){LocalShareTargetPlugin live=current;if(live!=null&&!live.destroyed)live.notifyListeners("shareAvailable",new JSObject());}
    private static CharSequence text(Intent intent,boolean clipFallback){
        if(intent.hasExtra(Intent.EXTRA_TEXT))return intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        ClipData clip=intent.getClipData();
        if(clipFallback&&clip!=null&&clip.getItemCount()==1)return clip.getItemAt(0).getText();
        return null;
    }
    @SuppressWarnings("deprecation") // Typed overload requires Android 33; minimum remains 23.
    private static List<Uri> images(Intent intent){
        List<Uri> result=new ArrayList<>();
        if(intent.hasExtra(Intent.EXTRA_STREAM)){
            if(Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())){
                ArrayList<android.os.Parcelable> streams=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if(streams==null)return null;
                for(android.os.Parcelable value:streams){if(!(value instanceof Uri))return null;result.add((Uri)value);}
            }else{Object stream=intent.getParcelableExtra(Intent.EXTRA_STREAM);if(!(stream instanceof Uri))return null;result.add((Uri)stream);}
        }else{
            ClipData clip=intent.getClipData();if(clip!=null)for(int i=0;i<clip.getItemCount();i++){Uri uri=clip.getItemAt(i).getUri();if(uri==null)return null;result.add(uri);}
        }
        return result;
    }
    private void release(ShareTargetInbox.Item old){if(old==null)return;release(UUID.fromString(old.id),null);}
    private void release(UUID id,PluginCall call){
            try{ShareMediaInbox.forContext(getContext()).release(id,(count,reason)->{
                if(reason==null){pendingCleanup.remove(id);ShareTargetInbox.PROCESS.release(id.toString());if(call!=null)call.resolve();}
                else{pendingCleanup.add(id);if(call!=null)call.reject("share_unavailable","share_unavailable");else signal();}
            });}catch(Exception ignored){pendingCleanup.add(id);if(call!=null)call.reject("share_unavailable","share_unavailable");else signal();}
    }
    @Override protected synchronized void handleOnNewIntent(Intent intent){
        if(destroyed||intent==null)return;
        boolean ordinary=Intent.ACTION_SEND.equals(intent.getAction())&&"text/plain".equals(intent.getType());
        boolean media=(Intent.ACTION_SEND.equals(intent.getAction())||Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))&&intent.getType()!=null&&intent.getType().startsWith("image/");
        if(!ordinary&&!media)return;
        try{
            if(ordinary){
                CharSequence input=text(intent,true);if(input==null)return;
                release(ShareTargetInbox.PROCESS.offer(ShareTextParser.parse(intent.getAction(),intent.getType(),input)));
                notifyListeners("shareAvailable",new JSObject());
            }else{
                ShareTextParser.Result description=ShareTextParser.imageText(text(intent,false));List<Uri> uris=images(intent);
                if(description.reason!=null||uris==null||uris.isEmpty()){
                    release(ShareTargetInbox.PROCESS.offer(ShareTextParser.invalid(description.reason!=null?description.reason:"image_invalid")));
                    notifyListeners("shareAvailable",new JSObject());
                }else{
                    ShareTargetInbox.Item previous=ShareTargetInbox.PROCESS.peek();
                    ShareTargetInbox.Item receipt=ShareTargetInbox.PROCESS.beginMedia(description.text);release(previous);
                    int flags=intent.getFlags();
                        try{ShareMediaInbox.forContext(getContext()).stage(UUID.fromString(receipt.id),uris,flags,(count,reason)->{
                            if(ShareTargetInbox.PROCESS.finishMedia(receipt.id,count,reason)){
                                signal();
                            }else release(receipt);
                        });}catch(Exception ignored){ShareTargetInbox.PROCESS.finishMedia(receipt.id,0,"storage_error");if(!destroyed)notifyListeners("shareAvailable",new JSObject());}
                }
            }
        }catch(RuntimeException ignored){release(ShareTargetInbox.PROCESS.offer(ShareTextParser.invalid("image_invalid")));notifyListeners("shareAvailable",new JSObject());}
        finally{
            // Recreated activities must not replay an already-owned launch payload.
            intent.removeExtra(Intent.EXTRA_TEXT);intent.removeExtra(Intent.EXTRA_HTML_TEXT);intent.removeExtra(Intent.EXTRA_STREAM);intent.setClipData(null);
        }
    }
    @PluginMethod public synchronized void consume(PluginCall call){
        if(destroyed){call.resolve(new JSObject().put("status","empty"));return;}
        if(!pendingCleanup.isEmpty()){
            List<UUID> retry=new ArrayList<>(pendingCleanup);AtomicInteger remaining=new AtomicInteger(retry.size()),failed=new AtomicInteger();
            for(UUID id:retry)try{ShareMediaInbox.forContext(getContext()).release(id,(count,reason)->{
                if(reason==null){pendingCleanup.remove(id);ShareTargetInbox.PROCESS.release(id.toString());}else failed.incrementAndGet();
                if(remaining.decrementAndGet()==0){if(failed.get()>0)call.reject("share_unavailable","share_unavailable");else consume(call);}
            });}catch(Exception ignored){failed.incrementAndGet();if(remaining.decrementAndGet()==0)call.reject("share_unavailable","share_unavailable");}
            return;
        }
        ShareTargetInbox.Item item=ShareTargetInbox.PROCESS.consume();
        if(item==null){call.resolve(new JSObject().put("status","empty"));return;}
        JSObject reply=new JSObject().put("id",item.id).put("replaced",item.replaced);
        if(item.url!=null){reply.put("status","url").put("url",item.url);if(item.companionText!=null)reply.put("companionText",item.companionText);call.resolve(reply);}
        else if(item.imageCount>0){
            try{
                if(!item.alreadyLeased&&!ShareMediaInbox.forContext(getContext()).lease(UUID.fromString(item.id)))throw new IllegalStateException();
                reply.put("status","media").put("imageCount",item.imageCount);if(item.text!=null&&!item.text.isEmpty())reply.put("text",item.text);call.resolve(reply);
            }catch(Exception ignored){call.resolve(reply.put("status","invalid").put("reason","storage_error"));}
        }else if(item.reason!=null){reply.put("status","invalid").put("reason",item.reason);if("multiple_links".equals(item.reason)&&item.text!=null)reply.put("text",item.text);call.resolve(reply);}
        else call.resolve(reply.put("status","text").put("text",item.text));
    }
    @PluginMethod public synchronized void releaseShare(PluginCall call){
        if(destroyed){call.reject("share_unavailable","share_unavailable");return;}
        String id=call.getString("id");
        if(call.getData().length()!=1||!AiRequestLifecycle.uuid(id)){call.reject("share_unavailable","share_unavailable");return;}
        release(UUID.fromString(id),call);
    }
}
