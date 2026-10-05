package app.recipio.local;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalImagePickerPlugin.class);
        registerPlugin(LocalBackupPlugin.class);
        registerPlugin(LocalAiSecretPlugin.class);
        registerPlugin(LocalAiIntakePlugin.class);
        registerPlugin(LocalWebImportPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null) {
                    moveTaskToBack(true);
                    return;
                }
                getBridge().getWebView().evaluateJavascript(
                    "!window.dispatchEvent(new Event('recipio:back', {cancelable:true}))",
                    handled -> {
                        if (!"true".equals(handled)) moveTaskToBack(true);
                    }
                );
            }
        });
    }
}
