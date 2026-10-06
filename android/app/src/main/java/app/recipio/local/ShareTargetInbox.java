package app.recipio.local;

import java.util.UUID;

/** A single process-memory slot. Never serialize this object or its input. */
final class ShareTargetInbox {
    static final ShareTargetInbox PROCESS = new ShareTargetInbox();
    static final class Item {
        final String id, url, reason;
        final boolean replaced;
        Item(ShareTextParser.Result result, boolean replaced) {
            id = UUID.randomUUID().toString(); url = result.url; reason = result.reason;
            this.replaced = replaced;
        }
    }
    private Item pending;
    synchronized void offer(ShareTextParser.Result result) {
        if (result != null) pending = new Item(result, pending != null);
    }
    synchronized Item consume() {
        Item result = pending;
        pending = null;
        return result;
    }
}
