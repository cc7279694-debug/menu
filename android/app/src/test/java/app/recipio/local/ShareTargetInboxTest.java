package app.recipio.local;

import static org.junit.Assert.*;
import org.junit.Test;

public class ShareTargetInboxTest {
    @Test public void consumeIsOneShotAndKeepsOriginalUrl() {
        ShareTargetInbox inbox = new ShareTargetInbox();
        assertNull(inbox.consume());
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "https://generated.example/r?q=1#s"));
        ShareTargetInbox.Item item = inbox.consume();
        assertEquals("https://generated.example/r?q=1#s", item.url);
        assertNotNull(item.id); assertFalse(item.replaced); assertNull(inbox.consume());
    }
    @Test public void replacementIsExplicitAndUnsupportedIntentsDoNotEvict() {
        ShareTargetInbox inbox = new ShareTargetInbox();
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "https://generated.example/one"));
        inbox.offer(null);
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "https://generated.example/two"));
        ShareTargetInbox.Item item = inbox.consume();
        assertEquals("https://generated.example/two", item.url); assertTrue(item.replaced);
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "普通文字"));
        item = inbox.consume(); assertNull(item.url); assertEquals("no_url", item.reason); assertFalse(item.replaced);
    }
    @Test public void separateProcessesHaveNoPersistentShare() {
        ShareTargetInbox inbox = new ShareTargetInbox();
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "https://generated.example/r"));
        assertNull(new ShareTargetInbox().consume());
    }
}
