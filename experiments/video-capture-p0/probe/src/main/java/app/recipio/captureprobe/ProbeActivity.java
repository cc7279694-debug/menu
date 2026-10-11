package app.recipio.captureprobe;

import android.Manifest;
import android.app.*;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.*;
import android.view.View;
import android.widget.*;
import app.recipio.captureprobe.core.*;
import java.io.IOException;

public final class ProbeActivity extends Activity {
    private static final int PERMISSION=40,PROJECTION=41;
    private static final String[] LABELS={"受控六步骤测试源（先测这个）","抖音","小红书","哔哩哔哩"};
    private static final String[] PACKAGES={"app.recipio.captureprobesource","com.ss.android.ugc.aweme","com.xingin.xhs","tv.danmaku.bili"};
    private final Handler ui=new Handler(Looper.getMainLooper());
    private long pending=-1;
    private Spinner target;
    private Button start,stop,review,delete;
    private TextView status;
    private final Runnable update=new Runnable(){public void run(){render();ui.postDelayed(this,500);}};
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);if(saved!=null)pending=saved.getLong("pending",-1);
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);insets(root);
        text(root,"RECIPIO Video P1 Probe",24);
        text(root,"仅本次系统授权的画面；不采集声音、不联网、不调用 AI。最长 120 秒，每秒最多一张，最多 120 张；缓存上限 40 MiB。\nAndroid 14+ 请优先选择【单个应用】，选下方对应目标；旧系统全屏采集时请避开私人内容与通知。",16);
        target=new Spinner(this);target.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,LABELS));
        if(saved!=null)target.setSelection(saved.getInt("target",0));root.addView(target);
        start=button(root,"开始本次采集（系统授权）",v->request());
        stop=button(root,"取消授权 / 结束采集",v->{
            if(ProbeRuntime.lifecycle.state()==CaptureLifecycle.State.CONSENT)cancel("user_cancel_consent");
            else startService(new Intent(this,CaptureService.class).setAction(CaptureService.STOP).putExtra("session",ProbeRuntime.lifecycle.id()));
        });
        status=text(root,"尚未采集",16);
        review=button(root,"检查关键画面 / 发送到谱序",v->startActivity(new Intent(this,ReviewActivity.class)));
        delete=button(root,"删除本次全部结果",v->new AlertDialog.Builder(this).setMessage("删除候选画面和仍有效的分享副本？请先等待谱序完成读取。删除后不能再读取。")
                .setNegativeButton("取消",null).setPositiveButton("删除",(d,w)->{
                    try{FrameShare.deleteAll(this);ProbeRuntime.reset("");ProbeRuntime.cacheError="";}catch(IOException e){ProbeRuntime.message="缓存清理失败，请重试";}render();
                }).show());
        text(root,"采集结束后：检查推荐画面 → 手动增删、替换、排序 → 发送到谱序 → 在谱序中主动开始 AI 整理。\n本实验不是完整视频识别。采集失败会停止，不会绕过平台保护。",16);
        scroll.addView(root);setContentView(scroll);render();
    }
    static void insets(View root){
        int pad=(int)(16*root.getResources().getDisplayMetrics().density);
        root.setPadding(pad,pad,pad,pad);
        root.setOnApplyWindowInsetsListener((v,i)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());v.setPadding(pad+bars.left,pad+bars.top,pad+bars.right,pad+bars.bottom);}
            else v.setPadding(pad+i.getSystemWindowInsetLeft(),pad+i.getSystemWindowInsetTop(),pad+i.getSystemWindowInsetRight(),pad+i.getSystemWindowInsetBottom());
            return i;
        });
    }
    static TextView text(LinearLayout root,String value,int size){TextView t=new TextView(root.getContext());t.setText(value);t.setTextSize(size);t.setPadding(0,8,0,8);root.addView(t);return t;}
    static Button button(LinearLayout root,String label,View.OnClickListener click){Button b=new Button(root.getContext());b.setText(label);b.setOnClickListener(click);root.addView(b);return b;}
    private boolean busy(){var s=ProbeRuntime.lifecycle.state();return s!=CaptureLifecycle.State.IDLE&&s!=CaptureLifecycle.State.DONE;}
    private void request(){
        if(busy()||!ProbeRuntime.cacheError.isEmpty())return;
        try{
            getPackageManager().getApplicationInfo(PACKAGES[target.getSelectedItemPosition()],0);
            VisualFiles files=new VisualFiles(getCacheDir());files.clearCandidates();files.prune(System.currentTimeMillis());
        }catch(PackageManager.NameNotFoundException e){ProbeRuntime.message="请先安装所选测试 App";render();return;}
        catch(IOException e){ProbeRuntime.message="上次缓存清理失败，不开始采集";render();return;}
        pending=ProbeRuntime.lifecycle.beginConsent();if(pending<0)return;
        ProbeRuntime.reset(LABELS[target.getSelectedItemPosition()]);
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION);
        else consent();render();
    }
    private void consent(){
        if(pending!=ProbeRuntime.lifecycle.id()||ProbeRuntime.lifecycle.state()!=CaptureLifecycle.State.CONSENT)return;
        NotificationManager manager=getSystemService(NotificationManager.class);CaptureService.ensureChannel(manager);
        if(!manager.areNotificationsEnabled()||manager.getNotificationChannel(CaptureService.CHANNEL).getImportance()==0){cancel("notification_denied");return;}
        try{startActivityForResult(getSystemService(MediaProjectionManager.class).createScreenCaptureIntent(),PROJECTION);}
        catch(RuntimeException e){cancel("consent_unavailable");}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==PERMISSION)consent();}
    @Override public void onActivityResult(int request,int code,Intent data){
        super.onActivityResult(request,code,data);if(request!=PROJECTION)return;
        if(code!=RESULT_OK||data==null){cancel("consent_denied");return;}
        if(!ProbeRuntime.lifecycle.grant(pending,SystemClock.elapsedRealtime()))return;
        try{startForegroundService(new Intent(this,CaptureService.class).setAction(CaptureService.START).putExtra("session",pending).putExtra("result",code).putExtra("grant",data));}
        catch(RuntimeException e){cancel("foreground_start_failed");}render();
    }
    private void cancel(String reason){if(ProbeRuntime.lifecycle.stop(pending,reason))ProbeRuntime.lifecycle.released(pending);ProbeRuntime.message="本次未采集（"+reason+"）；重新开始需重新授权";render();}
    private void render(){
        boolean active=busy();start.setEnabled(!active&&ProbeRuntime.cacheError.isEmpty());target.setEnabled(!active);stop.setEnabled(active&&ProbeRuntime.lifecycle.state()!=CaptureLifecycle.State.STOPPING);
        review.setEnabled(!active&&ProbeRuntime.frames>0);delete.setEnabled(!active);
        status.setText(ProbeRuntime.target+"\n"+ProbeRuntime.message+"\n已保存 "+ProbeRuntime.frames+" 张；疑似黑屏 / 无内容 "+ProbeRuntime.blackFrames+" 张\n"+ProbeRuntime.cacheError);
    }
    @Override protected void onSaveInstanceState(Bundle state){state.putLong("pending",pending);state.putInt("target",target.getSelectedItemPosition());super.onSaveInstanceState(state);}
    @Override protected void onResume(){super.onResume();ui.post(update);}
    @Override protected void onPause(){ui.removeCallbacks(update);super.onPause();}
    @Override protected void onDestroy(){if(ProbeRuntime.lifecycle.ownerFinished(pending,isFinishing()))ProbeRuntime.message="已放弃本次授权";super.onDestroy();}
}
