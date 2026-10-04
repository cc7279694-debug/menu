package app.recipio.local;
import android.content.Context;
import android.os.SystemClock;
/** One process-local lifecycle and store; never exposed as a JS capability. */
final class AiNativeRuntime {
    final AiSecretStore secrets;final AiRequestLifecycle lifecycle=new AiRequestLifecycle(SystemClock::elapsedRealtime,90000);
    private static AiNativeRuntime instance;
    private AiNativeRuntime(Context context){secrets=AiSecretStore.open(context.getApplicationContext());}
    static synchronized AiNativeRuntime get(Context context){if(instance==null)instance=new AiNativeRuntime(context);return instance;}
}
