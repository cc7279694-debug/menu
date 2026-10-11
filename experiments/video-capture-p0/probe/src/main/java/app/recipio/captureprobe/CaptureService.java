package app.recipio.captureprobe;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.*;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.*;
import android.os.*;
import android.util.DisplayMetrics;
import app.recipio.captureprobe.core.*;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

/** P1 visual-only owner. Single grant/display, bounded sequential worker, no audio/network. */
public final class CaptureService extends Service {
    static final String START="app.recipio.captureprobe.START",STOP="app.recipio.captureprobe.STOP",CHANNEL="capture-session";
    private final Handler main=new Handler(Looper.getMainLooper());
    private final AtomicBoolean closing=new AtomicBoolean();
    private final OwnedResource<ImageReader> readers=new OwnedResource<>();
    private long session;
    private HandlerThread thread;
    private Handler worker;
    private MediaProjection projection;
    private MediaProjection.Callback callback;
    private VirtualDisplay display;
    private int readerEpoch;
    private VisualFiles files;
    private VisualSampler sampler;
    private final Runnable timeout=()->end("auto_stop_120s");
    static void ensureChannel(NotificationManager manager){manager.createNotificationChannel(new NotificationChannel(CHANNEL,"本次画面采集（可停止）",NotificationManager.IMPORTANCE_LOW));}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null){stopSelf();return START_NOT_STICKY;}
        long incoming=intent.getLongExtra("session",-1);
        if(STOP.equals(intent.getAction())){if(session==0)stopSelf();else if(session==incoming)end("user_stop");return START_NOT_STICKY;}
        if(!START.equals(intent.getAction())||session!=0||incoming!=ProbeRuntime.lifecycle.id()||ProbeRuntime.lifecycle.state()!=CaptureLifecycle.State.STARTING){if(session==0)stopSelf();return START_NOT_STICKY;}
        session=incoming;
        try{
            NotificationManager manager=getSystemService(NotificationManager.class);ensureChannel(manager);
            if(!manager.areNotificationsEnabled()||manager.getNotificationChannel(CHANNEL).getImportance()==0){end("notification_unavailable");return START_NOT_STICKY;}
            Intent stop=new Intent(this,CaptureService.class).setAction(STOP).putExtra("session",session);
            PendingIntent action=PendingIntent.getService(this,1,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,ProbeActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification note=new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_menu_camera)
                    .setContentTitle("RECIPIO P1 正在采集画面").setContentText("只存本机；最长 120 秒；不采集声音")
                    .setOngoing(true).setContentIntent(open).addAction(new Notification.Action.Builder(null,"结束采集",action).build()).build();
            startForeground(1,note,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            Intent grant=Build.VERSION.SDK_INT>=33?intent.getParcelableExtra("grant",Intent.class):intent.getParcelableExtra("grant");
            if(grant==null){end("missing_grant");return START_NOT_STICKY;}
            projection=getSystemService(MediaProjectionManager.class).getMediaProjection(intent.getIntExtra("result",0),grant);
            intent.removeExtra("grant");
            if(projection==null){end("projection_unavailable");return START_NOT_STICKY;}
            thread=new HandlerThread("visual-p1-worker");thread.start();worker=new Handler(thread.getLooper());
            callback=new MediaProjection.Callback(){
                @Override public void onStop(){end("system_projection_stop");}
                @Override public void onCapturedContentResize(int w,int h){if(!closing.get())worker.post(()->resize(w,h));}
            };
            projection.registerCallback(callback,main);
            main.postDelayed(timeout,Math.max(0,ProbeRuntime.lifecycle.deadline()-SystemClock.elapsedRealtime()));
            worker.post(this::begin);
        }catch(Exception e){end("start_failed_"+e.getClass().getSimpleName());}
        return START_NOT_STICKY;
    }
    private void begin(){
        try{
            if(closing.get()||SystemClock.elapsedRealtime()>=ProbeRuntime.lifecycle.deadline()){endAsync("start_deadline");return;}
            files=new VisualFiles(getCacheDir());sampler=new VisualSampler(ProbeRuntime.lifecycle.deadline()-120000);
            DisplayMetrics metrics=getResources().getDisplayMetrics();int[] size=FrameCodec.size(metrics.widthPixels,metrics.heightPixels,2048);
            readers.replace(()->reader(size[0],size[1]),candidate->{
                display=projection.createVirtualDisplay("RECIPIO-P1",size[0],size[1],metrics.densityDpi,DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,candidate.getSurface(),null,worker);
                if(display==null)throw new IOException("display unavailable");
            });
            if(!ProbeRuntime.lifecycle.started(session)){endAsync("display_start_failed");return;}
            ProbeRuntime.everCaptured=true;ProbeRuntime.message="正在采集画面：最长 120 秒，请播放目标视频";
        }catch(Exception e){endAsync("capture_init_"+e.getClass().getSimpleName());}
    }
    private ImageReader reader(int width,int height){
        ImageReader created=ImageReader.newInstance(width,height,PixelFormat.RGBA_8888,2);int epoch=++readerEpoch;
        created.setOnImageAvailableListener(source->frame(source,epoch),worker);return created;
    }
    private void resize(int width,int height){
        if(closing.get()||display==null)return;
        try{
            int[] size=FrameCodec.size(width,height,2048);ImageReader old=readers.get();
            if(old!=null&&old.getWidth()==size[0]&&old.getHeight()==size[1])return;
            readers.replace(()->reader(size[0],size[1]),candidate->{display.resize(size[0],size[1],getResources().getDisplayMetrics().densityDpi);display.setSurface(candidate.getSurface());});
        }catch(Exception e){endAsync("resize_failed");}
    }
    private void frame(ImageReader source,int epoch){
        Image image=null;Bitmap bitmap=null;
        try{
            if(epoch!=readerEpoch||closing.get())return;
            image=source.acquireLatestImage();if(image==null||closing.get()||epoch!=readerEpoch)return;
            long elapsed=SystemClock.elapsedRealtime();
            if(!ProbeRuntime.lifecycle.maySample(session,elapsed))return;
            int id=sampler.take(elapsed);if(id<0)return;
            Image.Plane plane=image.getPlanes()[0];ByteBuffer buffer=plane.getBuffer();
            int w=image.getWidth(),h=image.getHeight(),row=plane.getRowStride(),pixel=plane.getPixelStride();
            if(w>2048||h>2048||pixel<4||row<(long)w*pixel)throw new IOException("RGBA stride");
            int[] colors=new int[w*h];int base=buffer.position(),limit=buffer.limit();
            for(int y=0;y<h;y++)for(int x=0;x<w;x++){
                long offset=(long)base+(long)y*row+(long)x*pixel;if(offset<base||offset+3>=limit)throw new IOException("RGBA bounds");
                int i=(int)offset;colors[y*w+x]=((buffer.get(i+3)&255)<<24)|((buffer.get(i)&255)<<16)|((buffer.get(i+1)&255)<<8)|(buffer.get(i+2)&255);
            }
            image.close();image=null;
            FrameScore score=FrameScore.measure(colors,w,h);bitmap=Bitmap.createBitmap(colors,w,h,Bitmap.Config.ARGB_8888);
            byte[] jpeg=FrameCodec.jpeg(bitmap,2048,1024*1024),thumb=FrameCodec.jpeg(bitmap,240,128*1024);
            if(closing.get()||!ProbeRuntime.lifecycle.maySample(session,SystemClock.elapsedRealtime()))return;
            files.storeCandidate(id,jpeg,thumb);
            ProbeRuntime.add(new VisualFrame(id,elapsed-(ProbeRuntime.lifecycle.deadline()-120000),score.hash,score.clarity,score.useful));
            ProbeRuntime.frames++;if(!score.useful)ProbeRuntime.blackFrames++;
        }catch(IOException e){if(!closing.get())endAsync("frame_or_cache_limit");}
        catch(RuntimeException e){if(!closing.get())endAsync("frame_failed_"+e.getClass().getSimpleName());}
        catch(OutOfMemoryError e){endAsync("memory_limit_stop");}
        finally{if(image!=null)image.close();if(bitmap!=null)bitmap.recycle();}
    }
    private void endAsync(String reason){main.post(()->end(reason));}
    private void end(String reason){
        if(session==0||!ProbeRuntime.lifecycle.stop(session,reason)||!closing.compareAndSet(false,true))return;
        main.removeCallbacks(timeout);ProbeRuntime.message="采集已停止，正在释放资源（"+reason+"）";
        if(projection!=null)try{projection.stop();}catch(RuntimeException e){ProbeRuntime.message="系统采集已中断，正在清理";}
        if(worker==null){finishService();return;}
        worker.post(()->{
            ResourceScope cleanup=new ResourceScope();
            cleanup.own(()->{if(projection!=null&&callback!=null)projection.unregisterCallback(callback);});
            cleanup.own(()->{readerEpoch++;readers.close();});
            cleanup.own(()->{if(display!=null){display.release();display=null;}});
            if(!cleanup.release())ProbeRuntime.cacheError="资源清理异常，请结束并重启实验 App";
            ProbeRuntime.suggest();main.post(this::finishService);
        });
    }
    private void finishService(){
        if(thread!=null){thread.quitSafely();thread=null;}
        ProbeRuntime.lifecycle.released(session);ProbeRuntime.message="采集结束（"+ProbeRuntime.lifecycle.reason()+"）；请检查和调整关键画面";
        stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();
    }
    @Override public void onDestroy(){end("service_destroyed");super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
