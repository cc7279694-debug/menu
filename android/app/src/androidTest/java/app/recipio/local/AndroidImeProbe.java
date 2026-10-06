package app.recipio.local;

import android.app.Activity;
import android.app.Instrumentation;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/** Test-only observation of actual platform animations; never guesses a delay. */
final class AndroidImeProbe {
    private final Activity activity;
    private final Set<WindowInsetsAnimationCompat> running = new HashSet<>();

    // Construct on the Activity's UI thread. The Activity owns this test callback.
    AndroidImeProbe(Activity activity) {
        this.activity = activity;
        ViewCompat.setWindowInsetsAnimationCallback(activity.getWindow().getDecorView(),
            new WindowInsetsAnimationCompat.Callback(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                @Override public void onPrepare(WindowInsetsAnimationCompat animation) {
                    if ((animation.getTypeMask() & WindowInsetsCompat.Type.ime()) != 0) running.add(animation);
                }
                @Override public WindowInsetsCompat onProgress(WindowInsetsCompat insets, List<WindowInsetsAnimationCompat> animations) { return insets; }
                @Override public void onEnd(WindowInsetsAnimationCompat animation) { running.remove(animation); }
            });
    }

    boolean settled(Instrumentation instrumentation, boolean shown) {
        AtomicBoolean result = new AtomicBoolean();
        instrumentation.runOnMainSync(() -> {
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());
            result.set(insets != null && insets.isVisible(WindowInsetsCompat.Type.ime()) == shown
                && running.isEmpty() && activity.hasWindowFocus());
        });
        return result.get();
    }
}
