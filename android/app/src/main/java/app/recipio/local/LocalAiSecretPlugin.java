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
    private AiRequestLifecycle lifecycle;
    private final AtomicBoolean dialogBusy=new AtomicBoolean();
    private AlertDialog dialog;
    private EditText input;
    private PluginCall pending;
    @Override public void load(){AiNativeRuntime runtime=AiNativeRuntime.get(getContext());store=runtime.secrets;lifecycle=runtime.lifecycle;}
    @PluginMethod public void hasAiKey(PluginCall call){getBridge().execute(()->{try{call.resolve(new JSObject().put("configured",store.hasKey()));}catch(Exception ignored){call.reject("key_unavailable","key_unavailable");}});}
    @PluginMethod public void deleteAiKey(PluginCall call){getBridge().execute(()->{try{lifecycle.withSecretMutation(()->{store.delete();return null;});call.resolve();}catch(Exception error){String code=error instanceof AiFailure?((AiFailure)error).code:"key_unavailable";call.reject(code,code);}});}
    @PluginMethod public void saveAiKey(PluginCall call){
        if(!dialogBusy.compareAndSet(false,true)){call.reject("busy","busy");return;}
        pending=call;getActivity().runOnUiThread(()->{
            input=new EditText(getActivity());input.setHint("北京区域百炼 API Key");input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);input.setSingleLine(true);input.setSaveEnabled(false);
            if(Build.VERSION.SDK_INT>=26)input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            dialog=new AlertDialog.Builder(getActivity()).setTitle("设置 AI 密钥").setMessage("密钥只保存在本机 Android 安全存储，不会交给网页或进入备份。").setView(input).setNegativeButton("取消",(d,w)->cancel()).setPositiveButton("保存",null).create();
            dialog.setOnCancelListener(d->cancel());dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                final char[] value;
                try{value=AiKeyInput.prepare(input.getText());}
                catch(AiKeyInput.InvalidInput error){input.getText().clear();input.setError(error.getMessage()+"。尚未连接百炼；输入已清空，请重新粘贴。");return;}
                input.getText().clear();
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(false);dialog.setCancelable(false);
                getBridge().execute(()->{String errorCode=null;try{lifecycle.withSecretMutation(()->{store.save(value);return null;});}catch(Exception error){errorCode=error instanceof AiFailure?((AiFailure)error).code:"key_unavailable";}finally{Arrays.fill(value,'\0');}
                    final String failure=errorCode;getActivity().runOnUiThread(()->{PluginCall target=pending;clear();if(target!=null){if(failure==null)target.resolve(new JSObject().put("configured",true).put("cancelled",false));else target.reject(failure,failure);}});
                });
            }));
            dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);dialog.show();
        });
    }
    private void cancel(){PluginCall target=pending;getBridge().execute(()->{boolean configured=false;try{configured=store.hasKey();}catch(Exception ignored){}final boolean has=configured;getActivity().runOnUiThread(()->{clear();if(target!=null)target.resolve(new JSObject().put("configured",has).put("cancelled",true));});});}
    private void clear(){if(input!=null)input.getText().clear();if(dialog!=null)dialog.dismiss();input=null;dialog=null;pending=null;dialogBusy.set(false);}
    @Override protected void handleOnDestroy(){if(input!=null)input.getText().clear();if(pending!=null)pending.reject("cancelled","cancelled");clear();}
}
