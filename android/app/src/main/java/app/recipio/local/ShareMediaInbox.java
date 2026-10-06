package app.recipio.local;

import android.app.ActivityManager;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.system.Os;
import android.system.OsConstants;
import android.system.ErrnoException;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/** Process-memory receipts + private cache bytes. Provider work lives only in a disposable process. */
final class ShareMediaInbox {
    interface Callback {void finished(int imageCount,String reason);}
    private static ShareMediaInbox instance;
    static synchronized ShareMediaInbox forContext(Context context)throws Exception{
        if(instance==null)instance=new ShareMediaInbox(context.getApplicationContext());return instance;
    }
    private final Context context;
    private volatile ShareMediaFiles files;
    private final ExecutorService metadata=Executors.newSingleThreadExecutor(r->{Thread t=new Thread(r,"share-inbox-files");t.setDaemon(true);return t;});
    private final Future<ShareMediaFiles> storage;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ScheduledExecutorService deadlines=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"share-inbox-deadline");t.setDaemon(true);return t;});
    private final Map<UUID,Request> requests=new HashMap<>();
    private final ArrayDeque<Request> queue=new ArrayDeque<>();
    private Request active;
    private ShareMediaInbox(Context context){this.context=context;storage=metadata.submit(()->{retireOrphanReader();ShareMediaFiles initialized=new ShareMediaFiles(context.getCacheDir());initialized.cleanupAbandoned();files=initialized;return initialized;});}
    private void retireOrphanReader()throws Exception{
        ActivityManager manager=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes=manager.getRunningAppProcesses();if(processes==null)throw new AiFailure("storage_error");
        for(ActivityManager.RunningAppProcessInfo process:processes){
            if(process.pid==android.os.Process.myPid()||process.uid!=android.os.Process.myUid()||!(context.getPackageName()+":sharemedia").equals(process.processName))continue;
            if(readerPid(process.pid))android.os.Process.killProcess(process.pid);
            // Before orphan deletion, prove the old writer exited; an AM record disappearing alone is insufficient.
            awaitReaderExit(process.pid);
        }
    }
    private static void awaitReaderExit(int pid)throws Exception{
        if(pid<=0||pid==android.os.Process.myPid())throw new AiFailure("storage_error");
        long deadline=SystemClock.elapsedRealtime()+5000;
        while(true){
            try{Os.kill(pid,0);}catch(ErrnoException error){if(error.errno==OsConstants.ESRCH)return;throw new AiFailure("storage_error");}
            if(SystemClock.elapsedRealtime()>=deadline)throw new AiFailure("storage_error");Thread.sleep(20);
        }
    }
    void stage(UUID id,List<Uri> uris,int flags,Callback callback){
        long received=SystemClock.elapsedRealtime();
        main.post(()->{
            String reason=null;ArrayList<Uri> unique=new ArrayList<>();
            if(id==null||uris==null)reason="image_invalid";
            else if((flags&Intent.FLAG_GRANT_READ_URI_PERMISSION)==0)reason="image_unreadable";
            else{
                LinkedHashSet<Uri> seen=new LinkedHashSet<>();
                for(Uri uri:uris){
                    if(!validUri(uri,context.getPackageName())){reason="image_invalid";break;}
                    seen.add(uri);if(seen.size()>6){reason="too_many_images";break;}
                }
                unique.addAll(seen);if(reason==null&&unique.isEmpty())reason="image_invalid";
            }
            if(reason!=null){callback.finished(0,reason);return;}
            if(requests.containsKey(id)||requests.size()>=8){callback.finished(0,"image_unreadable");return;}
            Request request=new Request(id,unique,callback,received);requests.put(id,request);queue.add(request);
            long remaining=Math.max(0,30000-(SystemClock.elapsedRealtime()-received));
            request.timer=deadlines.schedule(()->expire(request),remaining,TimeUnit.MILLISECONDS);
            metadata.execute(()->{
                String failure=null;
                try{if(!request.cancelled&&!request.expired){ShareMediaFiles owned=storage.get();try{owned.cleanupAbandoned();}catch(Exception cleanup){/* Failed released ownership remains registered for a later retry. */}owned.begin(id);}else failure=request.expired?"timeout":"image_unreadable";}
                catch(Exception ignored){failure="image_unreadable";}
                final String outcome=failure;main.post(()->{request.prepared=true;if(outcome!=null)request.reason=outcome;if(request.cancelled||request.expired||outcome!=null){queue.remove(request);retire(request);}else next();});
            });
        });
    }
    boolean lease(UUID id){ShareMediaFiles ready=files;return ready!=null&&ready.lease(id);}
    void initialize(Callback callback){metadata.execute(()->{String failure=null;try{storage.get();}catch(Exception ignored){failure="storage_error";}final String reason=failure;main.post(()->callback.finished(0,reason));});}
    static boolean validUri(Uri uri,String packageName){
        if(uri==null||!"content".equals(uri.getScheme())||uri.getAuthority()==null||uri.getFragment()!=null)return false;
        String authority=uri.getAuthority();int user=authority.lastIndexOf('@');if(user>=0)authority=authority.substring(user+1);
        return !authority.isEmpty()&&!(packageName+".fileprovider").equals(authority);
    }
    void release(UUID id){release(id,(count,reason)->{});}
    void release(UUID id,Callback callback){
        main.post(()->{Request request=requests.get(id);if(request!=null){request.cancelled=true;request.releaseCallbacks.add(callback);request.reason="image_unreadable";if(!request.prepared)return;if(request==active)terminate(request);else{queue.remove(request);retire(request);}}
            else metadata.execute(()->{try{storage.get().release(id,reason->main.post(()->callback.finished(0,reason)));}catch(Exception ignored){main.post(()->callback.finished(0,"storage_error"));}});});
    }
    List<AiTemporaryImages.Image> transfer(UUID id,AiTemporaryImages ai,UUID operation)throws Exception{
        // Never discard an existing user session if the caller provided the wrong operation.
        ai.requireEmptySession(operation);ShareMediaFiles owned=null;boolean success=false,pinned=false;
        try{
            owned=storage.get();
            List<ShareMediaFiles.Image> staged=owned.pin(id);pinned=true;
            List<AiTemporaryImages.Image> images=new ArrayList<>();
            for(ShareMediaFiles.Image image:staged)images.add(ai.importStream(operation,new FileInputStream(ShareMediaFiles.safe(image.file)),"image/jpeg"));
            owned.release(id);success=true;return Collections.unmodifiableList(images);
        }catch(Exception failure){try{ai.discard(operation);}catch(Exception cleanup){failure.addSuppressed(cleanup);}throw failure;}
        finally{if(pinned)try{owned.unpin(id);}catch(Exception cleanup){if(success){ai.discard(operation);throw cleanup;}}}
    }
    private final class Request implements ServiceConnection {
        final UUID id;final ArrayList<Uri> uris;final Callback callback;final long received;
        final Messenger receiver;
        volatile boolean cancelled,expired,retiring,started;
        volatile int pid;volatile IBinder binder;
        volatile boolean bound;boolean retired,prepared,completionNotified;String reason;Bundle result;ScheduledFuture<?> timer;
        final List<Callback> releaseCallbacks=new ArrayList<>();
        Request(UUID id,ArrayList<Uri> uris,Callback callback,long received){this.id=id;this.uris=uris;this.callback=callback;this.received=received;receiver=new Messenger(new Handler(Looper.getMainLooper(),message->{handle(this,message);return true;}));}
        @Override public void onServiceConnected(ComponentName name,IBinder service){
            if(retired||active!=this){unbind(this);return;}binder=service;
            try{service.linkToDeath(()->main.post(()->retire(this)),0);Message hello=Message.obtain(null,ShareMediaReadService.HELLO);hello.replyTo=receiver;new Messenger(service).send(hello);}
            catch(RemoteException ignored){reason="image_unreadable";retire(this);}
        }
        @Override public void onServiceDisconnected(ComponentName name){retire(this);}
        @Override public void onBindingDied(ComponentName name){retire(this);}
        @Override public void onNullBinding(ComponentName name){reason="image_unreadable";retire(this);}
    }
    private void next(){
        if(active!=null)return;Request request=queue.peek();if(request==null||!request.prepared)return;queue.remove();active=request;
        if(request.expired||request.cancelled||SystemClock.elapsedRealtime()-request.received>=30000){request.reason=request.cancelled?"image_unreadable":"timeout";retire(request);return;}
        try{request.bound=context.bindService(new Intent(context,ShareMediaReadService.class),request,Context.BIND_AUTO_CREATE);if(!request.bound){request.reason="image_unreadable";retire(request);}}
        catch(RuntimeException ignored){request.reason="image_unreadable";retire(request);}
    }
    private void handle(Request request,Message message){
        if(request.retired||active!=request)return;
        if(message.what==ShareMediaReadService.HELLO){
            if(message.sendingUid!=android.os.Process.myUid()||!readerPid(message.arg1)){request.reason="image_unreadable";terminate(request);return;}
            request.pid=message.arg1;
            if(request.expired||request.cancelled||SystemClock.elapsedRealtime()-request.received>=30000){request.reason=request.cancelled?"image_unreadable":"timeout";terminate(request);return;}
            try{Message read=Message.obtain(null,ShareMediaReadService.READ);read.replyTo=request.receiver;Bundle payload=new Bundle();payload.putString("id",request.id.toString());payload.putLong("deadline",request.received+30000);payload.putParcelableArrayList("uris",request.uris);read.setData(payload);request.started=true;new Messenger(request.binder).send(read);}
            catch(RemoteException ignored){request.reason="image_unreadable";terminate(request);}
        }else if(message.what==ShareMediaReadService.RESULT){
            if(message.sendingUid!=android.os.Process.myUid()||!request.started)return;
            request.result=message.getData();request.reason=request.result.getString("reason");terminate(request);
        }
    }
    private boolean readerPid(int pid){
        if(pid<=0||pid==android.os.Process.myPid())return false;
        ActivityManager manager=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes=manager.getRunningAppProcesses();if(processes==null)return false;
        for(ActivityManager.RunningAppProcessInfo process:processes)if(process.pid==pid&&process.uid==android.os.Process.myUid()&&(context.getPackageName()+":sharemedia").equals(process.processName))return true;
        return false;
    }
    private void expire(Request request){
        request.expired=true;
        // The watchdog is independent of Activity/UI delivery. Kill only a freshly verified, same-UID reader.
        if(request.pid>0&&request.binder!=null&&request.binder.isBinderAlive()&&readerPid(request.pid)){unbind(request);android.os.Process.killProcess(request.pid);}
        main.post(()->{if(request.retired)return;request.reason="timeout";if(!request.prepared)return;if(active==request)terminate(request);else{queue.remove(request);retire(request);}});
    }
    private void terminate(Request request){
        if(request.retired)return;request.retiring=true;
        if(request.pid>0){
            if(request.binder!=null&&!request.binder.isBinderAlive()){retire(request);return;}
            if(readerPid(request.pid)){unbind(request);android.os.Process.killProcess(request.pid);return;}
            // A PID absent from our reader process set is never killed (PID reuse / unrelated process).
            if(request.binder==null||!request.binder.isBinderAlive()){retire(request);return;}
            main.postDelayed(()->terminate(request),20);return;
        }
        if(!request.started){unbind(request);retire(request);}
    }
    private synchronized void unbind(Request request){if(request.bound){request.bound=false;try{context.unbindService(request);}catch(IllegalArgumentException ignored){}}}
    private void retire(Request request){
        if(request.retired)return;
        // Never remove bytes while the worker can still write into its staging directory.
        if(request.started&&request.binder!=null&&request.binder.isBinderAlive()){terminate(request);return;}
        if(!request.cancelled&&SystemClock.elapsedRealtime()-request.received>=30000){request.expired=true;request.reason="timeout";}
        request.retired=true;if(request.timer!=null)request.timer.cancel(false);unbind(request);
        metadata.execute(()->{
            // Binder death may arrive before the OS reaps the killed process.
            // Confirm the exact handshaken reader has exited before any file mutation
            // or callback. An unproven exit quarantines this request for release retry;
            // it never deletes bytes or lets a later reader start.
            try{if(request.pid>0||request.started)awaitReaderExit(request.pid);}
            catch(Exception unconfirmed){main.post(()->{
                request.retired=false;request.reason="image_unreadable";
                if(!request.completionNotified){request.completionNotified=true;request.callback.finished(0,"image_unreadable");}
                List<Callback> failed=new ArrayList<>(request.releaseCallbacks);request.releaseCallbacks.clear();
                for(Callback released:failed)released.finished(0,"storage_error");
            });return;}
            int count=0;String reason=request.reason,cleanupError=null;
            try{
                ShareMediaFiles owned=storage.get();
                if(reason==null&&!request.cancelled&&!request.expired&&request.result!=null){String[] names=request.result.getStringArray("names");owned.complete(request.id,names,request.result.getIntArray("widths"),request.result.getIntArray("heights"));count=names.length;}
                else{if(reason==null)reason=request.expired?"timeout":"image_unreadable";owned.release(request.id);}
            }catch(Exception ignored){reason="image_unreadable";try{storage.get().release(request.id);}catch(Exception cleanup){cleanupError="storage_error";}}
            final int readyCount=count;final String outcome=reason,cleanup=cleanupError;
            main.post(()->finish(request,readyCount,outcome,cleanup));
        });
    }
    private void finish(Request request,int count,String reason,String cleanupError){
        if(request.cancelled&&count>0){metadata.execute(()->{String failure=null;try{storage.get().release(request.id);}catch(Exception ignored){failure="storage_error";}final String cleanup=failure;main.post(()->finish(request,0,"image_unreadable",cleanup));});return;}
        requests.remove(request.id);if(active==request)active=null;
        if(!request.completionNotified){request.completionNotified=true;request.callback.finished(count,reason);}
        for(Callback released:request.releaseCallbacks)released.finished(0,cleanupError);next();
    }
}
