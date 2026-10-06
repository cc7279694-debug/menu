package app.recipio.local;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocalShareTarget")
public final class LocalShareTargetPlugin extends Plugin {
    private boolean destroyed;

    // Bridge.quitSafely drains queued calls. Destruction and consumption must share
    // one monitor so an old WebView cannot claim the next Activity's process slot.
    @Override protected synchronized void handleOnDestroy() { destroyed = true; }

    @Override protected synchronized void handleOnNewIntent(Intent intent) {
        if (destroyed) return;
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction()) || !"text/plain".equals(intent.getType())) return;
        if (!intent.hasExtra(Intent.EXTRA_TEXT)) return;
        CharSequence text;
        try { text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT); }
        catch (RuntimeException ignored) { text = null; }
        ShareTargetInbox.PROCESS.offer(ShareTextParser.parse(intent.getAction(), intent.getType(), text));
        // Capacitor dispatches the launch intent during load. Mark only this in-memory
        // instance consumed by removing its payload, so Activity recreation cannot
        // replay it. Keep the action unchanged for Android lifecycle identity.
        intent.removeExtra(Intent.EXTRA_TEXT);
        intent.setClipData(null);
        notifyListeners("shareAvailable", new JSObject());
    }

    @PluginMethod public synchronized void consume(PluginCall call) {
        if (destroyed) { call.resolve(new JSObject().put("status", "empty")); return; }
        ShareTargetInbox.Item item = ShareTargetInbox.PROCESS.consume();
        if (item == null) { call.resolve(new JSObject().put("status", "empty")); return; }
        JSObject reply = new JSObject().put("id", item.id).put("replaced", item.replaced);
        if (item.url != null) reply.put("status", "url").put("url", item.url);
        else reply.put("status", "invalid").put("reason", item.reason);
        call.resolve(reply);
    }
}
