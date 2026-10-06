package app.recipio.local;

import android.app.Service;
import android.app.Application;
import android.app.ActivityManager;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/** One disposable same-UID process. An uncooperative provider is terminated by the parent deadline. */
public final class ShareMediaReadService extends Service {
    static final int HELLO=1,READ=2,RESULT=3;
    private final CancellationSignal cancellation=new CancellationSignal();
    private final ScheduledExecutorService guardian=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"share-reader-guardian");t.setDaemon(true);return t;});
    private boolean started;
    private final Messenger messenger=new Messenger(new Handler(Looper.getMainLooper(),message->{
        if(message.replyTo==null)return true;
        if(message.what==HELLO){Message response=Message.obtain(null,HELLO);response.arg1=android.os.Process.myPid();send(message.replyTo,response);}
        else if(message.what==READ&&!started){
            started=true;Bundle data=message.getData();Messenger receiver=message.replyTo;
            try{receiver.getBinder().linkToDeath(this::killReader,0);}catch(RemoteException ignored){killReader();return true;}
            guardian.schedule(this::killReader,Math.max(1,data.getLong("deadline")-SystemClock.elapsedRealtime()),TimeUnit.MILLISECONDS);
            new Thread(()->read(data,receiver),"share-attachment-read").start();
        }
        return true;
    }));
    @Override public IBinder onBind(Intent intent){return messenger.getBinder();}
    @Override public boolean onUnbind(Intent intent){killReader();return false;}
    @Override public void onDestroy(){killReader();guardian.shutdownNow();super.onDestroy();}
    private void killReader(){
        // Misconfigured Manifest must never turn this into termination of the app's main process.
        String expected=getPackageName()+":sharemedia";
        if(Build.VERSION.SDK_INT>=28){if(expected.equals(Application.getProcessName()))android.os.Process.killProcess(android.os.Process.myPid());return;}
        ActivityManager manager=(ActivityManager)getSystemService(Context.ACTIVITY_SERVICE);List<ActivityManager.RunningAppProcessInfo> processes=manager.getRunningAppProcesses();
        if(processes!=null)for(ActivityManager.RunningAppProcessInfo process:processes)if(process.pid==android.os.Process.myPid()&&process.uid==android.os.Process.myUid()&&expected.equals(process.processName)){android.os.Process.killProcess(process.pid);return;}
    }
    private void read(Bundle input,Messenger receiver){
        Bundle result=new Bundle();String reason=null;
        try{
            UUID id=UUID.fromString(input.getString("id",""));ArrayList<Uri> uris=input.getParcelableArrayList("uris");
            if(uris==null||uris.size()<1||uris.size()>6)throw new AiFailure("image_invalid");
            File root=ShareMediaFiles.safe(new File(getCacheDir().getCanonicalFile(),"share-inbox"));
            File dir=ShareMediaFiles.safe(new File(root,id.toString()));File marker=ShareMediaFiles.safe(new File(dir,".share"));
            if(!dir.isDirectory()||!marker.isFile()||marker.length()!=1)throw new AiFailure("storage_error");
            String[] names=new String[uris.size()];int[] widths=new int[uris.size()],heights=new int[uris.size()];
            for(int index=0;index<uris.size();index++){
                Uri uri=uris.get(index);
                if(!ShareMediaInbox.validUri(uri,getPackageName()))throw new AiFailure("image_invalid");
                if(checkUriPermission(uri,android.os.Process.myPid(),android.os.Process.myUid(),Intent.FLAG_GRANT_READ_URI_PERMISSION)!=PackageManager.PERMISSION_GRANTED)throw new AiFailure("image_unreadable");
                // Both MIME and open occur here; even a provider blocking Binder indefinitely cannot pin the main process.
                String mime=getContentResolver().getType(uri);
                if(!Arrays.asList("image/jpeg","image/png","image/webp").contains(mime))throw new AiFailure("unsupported_media");
                String stem=UUID.randomUUID().toString();File source=ShareMediaFiles.safe(new File(dir,stem+".source.part"));
                File output=ShareMediaFiles.safe(new File(dir,stem+".jpg"));
                try{
                    try(android.content.res.AssetFileDescriptor descriptor=getContentResolver().openAssetFileDescriptor(uri,"r",cancellation)){
                        if(descriptor==null)throw new AiFailure("image_unreadable");
                        long declared=descriptor.getLength();if(declared>15L*1024*1024)throw new AiFailure("image_too_large");
                        try(InputStream stream=descriptor.createInputStream()){ShareMediaCopy.copy(stream,source);}
                    }
                    AiTemporaryImages.Processed image=AiImageCodec.process(source,mime);
                    if(image.bytes.length<1||image.bytes.length>1024*1024||image.width<=10||image.height<=10||Math.max(image.width,image.height)>2048)throw new AiFailure("image_invalid");
                    try(OutputStream out=new FileOutputStream(output)){out.write(image.bytes);}
                    names[index]=output.getName();widths[index]=image.width;heights[index]=image.height;
                }finally{if(source.exists()&&!source.delete())throw new AiFailure("storage_error");}
            }
            result.putStringArray("names",names);result.putIntArray("widths",widths);result.putIntArray("heights",heights);
        }catch(AiFailure failure){reason="image_too_large".equals(failure.code)?"oversized":failure.code;}
        catch(SecurityException|IOException ignored){reason="image_unreadable";}
        catch(Exception|OutOfMemoryError ignored){reason="image_invalid";}
        if(reason!=null)result.putString("reason",reason);
        Message response=Message.obtain(null,RESULT);response.setData(result);send(receiver,response);
    }
    private static void send(Messenger receiver,Message message){try{receiver.send(message);}catch(RemoteException ignored){/* The parent owns timeout cleanup; no sensitive logs. */}}
}
