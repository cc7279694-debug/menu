package app.recipio.local;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;

@CapacitorPlugin(name = "LocalImagePicker")
public class LocalImagePickerPlugin extends Plugin {
    @PluginMethod
    public void pickImage(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {"image/jpeg", "image/png", "image/webp", "image/avif"});
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "imageSelected");
        } catch (RuntimeException error) {
            call.reject("无法打开系统选图，请稍后重试");
        }
    }

    @ActivityCallback
    private void imageSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null || !"content".equals(uri.getScheme()) ||
            (getContext().getPackageName() + ".fileprovider").equals(uri.getAuthority())) {
            call.reject("请选择有效的本地图片");
            return;
        }
        getBridge().execute(() -> {
            try {
                String mime = getContext().getContentResolver().getType(uri);
                InputStream input = getContext().getContentResolver().openInputStream(uri);
                if (input == null) throw new IOException("Image unavailable");
                String path = LocalImageCopy.copy(getContext().getFilesDir(), input, mime);
                JSObject response = new JSObject();
                response.put("path", path);
                call.resolve(response);
            } catch (IOException | RuntimeException error) {
                call.reject("图片保存失败，请选择 JPG、PNG、WebP 或 AVIF 图片，并检查设备空间后重试");
            }
        });
    }
}
