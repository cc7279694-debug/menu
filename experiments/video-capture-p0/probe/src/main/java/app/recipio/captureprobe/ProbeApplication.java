package app.recipio.captureprobe;

import android.app.Application;
import android.app.NotificationManager;
import app.recipio.captureprobe.core.ProbeFiles;
import java.io.IOException;

public final class ProbeApplication extends Application {
    @Override public void onCreate() {
        super.onCreate();
        getSystemService(NotificationManager.class).cancelAll();
        // Cold process start only. Activity rotation must not clear an active session.
        try { new ProbeFiles(getCacheDir()).clear(); }
        catch (IOException error) { ProbeRuntime.cacheError = "实验缓存清理失败；本轮不允许开始"; }
    }
}
