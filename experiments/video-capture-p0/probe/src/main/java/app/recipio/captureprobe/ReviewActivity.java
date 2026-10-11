package app.recipio.captureprobe;

import android.app.*;
import android.content.Intent;
import android.graphics.*;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import app.recipio.captureprobe.core.*;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Six selected frames above a recycled chronological gallery; no full-size bitmap collection. */
public final class ReviewActivity extends Activity {
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final List<Bitmap> selectedBitmaps=new ArrayList<>();
    private final Set<Bitmap> rowBitmaps=Collections.newSetFromMap(new IdentityHashMap<>());
    private List<VisualFrame> frames;
    private VisualFiles files;
    private LinearLayout chosen;
    private TextView summary;
    private Button share;
    private Gallery gallery;
    private boolean sending;
    private final Map<Dialog,Bitmap> previews=new IdentityHashMap<>();
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        frames=ProbeRuntime.candidates();
        try{files=new VisualFiles(getCacheDir());}catch(IOException e){finish();return;}
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);ProbeActivity.insets(root);
        ProbeActivity.text(root,"从视频中提取的关键画面",22);
        ProbeActivity.text(root,"本次只采集到了视频画面，未采集平台内部声音。口播中未出现在画面上的食材用量、时间和火候可能无法识别。",14);
        summary=ProbeActivity.text(root,"",14);
        ScrollView selectedScroll=new ScrollView(this);chosen=new LinearLayout(this);chosen.setOrientation(LinearLayout.VERTICAL);selectedScroll.addView(chosen);
        root.addView(selectedScroll,new LinearLayout.LayoutParams(-1,0,1));
        share=ProbeActivity.button(root,"发送到谱序（1～6 张）",v->send());
        ProbeActivity.text(root,"候选画面（按时间排序，点击可放大；推荐并非烹饪步骤识别）",14);
        ListView list=new ListView(this);gallery=new Gallery();list.setAdapter(gallery);root.addView(list,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);renderSelection();
    }
    private VisualFrame find(int id){for(VisualFrame f:frames)if(f.id==id)return f;return null;}
    private String time(int id){VisualFrame f=find(id);long seconds=f==null?0:f.millis/1000;return String.format(Locale.ROOT,"%02d:%02d",seconds/60,seconds%60);}
    private void renderSelection(){
        chosen.removeAllViews();for(Bitmap b:selectedBitmaps)b.recycle();selectedBitmaps.clear();
        List<Integer> ids=ProbeRuntime.selection.ids();summary.setText("已选 "+ids.size()+" / 6 张；可移除、替换并用 ↑ ↓ 调整发送顺序");
        for(int id:ids){
            LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.HORIZONTAL);
            ImageView image=new ImageView(this);Bitmap bitmap=thumbnail(id);if(bitmap!=null){selectedBitmaps.add(bitmap);image.setImageBitmap(bitmap);}
            image.setOnClickListener(v->preview(id));row.addView(image,new LinearLayout.LayoutParams(dp(72),dp(72)));
            LinearLayout controls=new LinearLayout(this);controls.setOrientation(LinearLayout.VERTICAL);ProbeActivity.text(controls,time(id),14);
            LinearLayout actions=new LinearLayout(this);actions.setOrientation(LinearLayout.HORIZONTAL);
            compact(actions,"↑",v->{if(!sending){ProbeRuntime.selection.move(id,-1);renderSelection();}});
            compact(actions,"↓",v->{if(!sending){ProbeRuntime.selection.move(id,1);renderSelection();}});
            compact(actions,"移除",v->{if(!sending){ProbeRuntime.selection.remove(id);renderSelection();}});
            controls.addView(actions);row.addView(controls);chosen.addView(row);
        }
        share.setEnabled(!sending&&ProbeRuntime.selection.shareable());if(gallery!=null)gallery.notifyDataSetChanged();
    }
    private void compact(LinearLayout root,String label,View.OnClickListener listener){Button b=new Button(this);b.setText(label);b.setTextSize(12);b.setMinWidth(0);b.setMinimumWidth(0);b.setOnClickListener(listener);root.addView(b,new LinearLayout.LayoutParams(dp(64),dp(48)));}
    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density);}
    private Bitmap thumbnail(int id){try{return BitmapFactory.decodeFile(files.thumbnail(id).getAbsolutePath());}catch(IOException e){return null;}}
    private void preview(int id){
        if(sending)return;
        try{
            Bitmap bitmap=BitmapFactory.decodeFile(files.candidate(id).getAbsolutePath());if(bitmap==null){message("画面已失效");return;}
            ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setImageBitmap(bitmap);
            ScrollView scroll=new ScrollView(this);scroll.addView(image);
            AlertDialog dialog=new AlertDialog.Builder(this).setTitle(time(id)+" — 请检查字幕清晰度").setView(scroll)
                    .setNegativeButton("关闭",null).setPositiveButton("添加",(d,w)->add(id))
                    .setNeutralButton("替换已选",(d,w)->replace(id)).create();
            previews.put(dialog,bitmap);dialog.setOnDismissListener(d->{Bitmap b=previews.remove(dialog);image.setImageDrawable(null);if(b!=null)b.recycle();});dialog.show();
        }catch(IOException|RuntimeException e){message("画面读取失败");}
    }
    private void add(int id){if(sending)return;if(!ProbeRuntime.selection.add(id))message("最多 6 张，同一画面不能重复添加");renderSelection();}
    private void replace(int replacement){
        if(sending)return;List<Integer> ids=ProbeRuntime.selection.ids();if(ids.isEmpty()){add(replacement);return;}
        String[] labels=new String[ids.size()];for(int i=0;i<ids.size();i++)labels[i]=(i+1)+". "+time(ids.get(i));
        new AlertDialog.Builder(this).setTitle("替换哪一张？").setItems(labels,(d,index)->{
            if(!ProbeRuntime.selection.replace(ids.get(index),replacement))message("该画面已在选择中");renderSelection();
        }).setNegativeButton("取消",null).show();
    }
    private void send(){
        if(sending||!ProbeRuntime.selection.shareable())return;
        List<Integer> ids=ProbeRuntime.selection.ids();sending=true;renderSelection();
        io.execute(()->{
            try{
                Intent intent=FrameShare.prepare(this,ids);
                runOnUiThread(()->{
                    if(isFinishing()||isDestroyed())return;
                    sending=false;renderSelection();
                    try{startActivity(Intent.createChooser(intent,"请选择谱序 RECIPIO"));message("分享副本暂留 6 小时；请在谱序中主动开始 AI");}
                    catch(RuntimeException e){message("未找到可用分享入口，候选图仍保留");}
                });
            }catch(IOException|RuntimeException e){runOnUiThread(()->{if(!isDestroyed()){sending=false;renderSelection();message("分享准备失败：可能达到缓存上限。请完成读取后删除旧结果。");}});}
        });
    }
    private void message(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    private final class Gallery extends BaseAdapter {
        @Override public int getCount(){return frames.size();}
        @Override public Object getItem(int position){return frames.get(position);}
        @Override public long getItemId(int position){return frames.get(position).id;}
        @Override public View getView(int position,View recycled,ViewGroup parent){
            LinearLayout row;
            if(recycled instanceof LinearLayout){row=(LinearLayout)recycled;ImageView old=(ImageView)row.getChildAt(0);Bitmap b=(Bitmap)old.getTag();old.setImageDrawable(null);old.setTag(null);if(b!=null){rowBitmaps.remove(b);b.recycle();}row.removeAllViews();}
            else{row=new LinearLayout(ReviewActivity.this);row.setOrientation(LinearLayout.HORIZONTAL);}
            VisualFrame frame=frames.get(position);ImageView image=new ImageView(ReviewActivity.this);Bitmap b=thumbnail(frame.id);
            if(b!=null){rowBitmaps.add(b);image.setImageBitmap(b);image.setTag(b);}row.addView(image,new LinearLayout.LayoutParams(dp(64),dp(72)));
            TextView label=new TextView(ReviewActivity.this);label.setText(time(frame.id)+(frame.useful?"":"\n疑似无内容"));row.addView(label,new LinearLayout.LayoutParams(0,dp(72),1));
            boolean selected=ProbeRuntime.selection.ids().contains(frame.id);
            compact(row,selected?"移除":"添加",v->{if(sending)return;if(selected){ProbeRuntime.selection.remove(frame.id);renderSelection();}else add(frame.id);});
            row.setOnClickListener(v->preview(frame.id));image.setOnClickListener(v->preview(frame.id));return row;
        }
    }
    @Override protected void onDestroy(){
        for(Dialog d:new ArrayList<>(previews.keySet()))d.dismiss();
        for(Bitmap b:selectedBitmaps)b.recycle();for(Bitmap b:rowBitmaps)b.recycle();selectedBitmaps.clear();rowBitmaps.clear();
        io.shutdown();super.onDestroy();
    }
}
