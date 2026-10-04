package app.recipio.local;

import android.app.AlertDialog;
import android.os.Build;
import android.text.InputType;
import android.view.View;
import android.view.WindowManager;
import android.widget.EditText;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name="LocalAiSecret")
public class LocalAiSecretPlugin extends Plugin {
    private AiSecretStore store;
    private final AtomicBoolean dialogBusy=new AtomicBoolean();
    private AlertDialog dialog;
    private EditText input;
    private PluginCall pending;
    @Override public void load(){store=AiSecretStore.open(getContext());}
    @PluginMethod public void hasAiKey(PluginCall call){getBridge().execute(()->{try{call.resolve(new JSObject().put("configured",store.hasKey()));}catch(Exception ignored){call.reject("key_unavailable","key_unavailable");}});}
    @PluginMethod public void deleteAiKey(PluginCall call){getBridge().execute(()->{try{store.delete();call.resolve();}catch(Exception ignored){call.reject("key_unavailable","key_unavailable");}});}
    @PluginMethod public void saveAiKey(PluginCall call){
        if(!dialogBusy.compareAndSet(false,true)){call.reject("busy","busy");return;}
        pending=call;getActivity().runOnUiThread(()->{
            input=new EditText(getActivity());input.setHint("北京区域百炼 API Key");input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);input.setSingleLine(true);input.setSaveEnabled(false);
            if(Build.VERSION.SDK_INT>=26)input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            dialog=new AlertDialog.Builder(getActivity()).setTitle("设置 AI 密钥").setMessage("密钥只保存在本机 Android 安全存储，不会交给网页或进入备份。").setView(input).setNegativeButton("取消",(d,w)->cancel()).setPositiveButton("保存",null).create();
            dialog.setOnCancelListener(d->cancel());dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                char[] value=input.getText().toString().trim().toCharArray();input.getText().clear();
                try{AiSecretEnvelope.validate(value);}catch(Exception ignored){Arrays.fill(value,'\0');input.setError("请输入有效的 sk- 开头 API Key");return;}
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(false);dialog.setCancelable(false);
                getBridge().execute(()->{boolean success=false;try{store.save(value);success=true;}catch(Exception ignored){}finally{Arrays.fill(value,'\0');}
                    final boolean saved=success;getActivity().runOnUiThread(()->{PluginCall target=pending;clear();if(target!=null){if(saved)target.resolve(new JSObject().put("configured",true).put("cancelled",false));else target.reject("key_unavailable","key_unavailable");}});
                });
            }));
            dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);dialog.show();
        });
    }
    private void cancel(){PluginCall target=pending;getBridge().execute(()->{boolean configured=false;try{configured=store.hasKey();}catch(Exception ignored){}final boolean has=configured;getActivity().runOnUiThread(()->{clear();if(target!=null)target.resolve(new JSObject().put("configured",has).put("cancelled",true));});});}
    private void clear(){if(input!=null)input.getText().clear();if(dialog!=null)dialog.dismiss();input=null;dialog=null;pending=null;dialogBusy.set(false);}
    @Override protected void handleOnDestroy(){if(input!=null)input.getText().clear();if(pending!=null)pending.reject("cancelled","cancelled");clear();}
}
