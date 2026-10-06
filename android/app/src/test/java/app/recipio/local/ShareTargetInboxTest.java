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
        item = inbox.consume(); assertNull(item.url); assertNull(item.reason); assertEquals("普通文字",item.text); assertFalse(item.replaced);
    }
    @Test public void separateProcessesHaveNoPersistentShare() {
        ShareTargetInbox inbox = new ShareTargetInbox();
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND", "text/plain", "https://generated.example/r"));
        assertNull(new ShareTargetInbox().consume());
    }
    @Test public void stagedMediaIsNotConsumedUntilReadyAndReceiptRemainsLeased() {
        ShareTargetInbox inbox=new ShareTargetInbox();
        ShareTargetInbox.Item receipt=inbox.beginMedia("生成的说明 🍚");
        assertNull(inbox.consume());
        assertTrue(inbox.finishMedia(receipt.id,2,null));
        ShareTargetInbox.Item ready=inbox.consume();
        assertEquals(receipt.id,ready.id);assertEquals(2,ready.imageCount);assertEquals("生成的说明 🍚",ready.text);
        assertNull(inbox.consume());assertTrue(inbox.isLeasedMedia(receipt.id));
        inbox.release(receipt.id);assertFalse(inbox.isLeasedMedia(receipt.id));
    }
    @Test public void lateStagingCannotOverwriteReplacementAndOnlyOwnReceiptIsReleased() {
        ShareTargetInbox inbox=new ShareTargetInbox();
        ShareTargetInbox.Item old=inbox.beginMedia("");
        ShareTargetInbox.Item replaced=inbox.offer(ShareTextParser.parse("android.intent.action.SEND","text/plain","新的文字"));
        assertEquals(old.id,replaced.id);
        assertFalse(inbox.finishMedia(old.id,1,null));
        ShareTargetInbox.Item text=inbox.consume();assertEquals("新的文字",text.text);assertTrue(text.replaced);
        ShareTargetInbox.Item next=inbox.beginMedia("");inbox.release(old.id);
        assertTrue(inbox.finishMedia(next.id,1,null));assertEquals(next.id,inbox.consume().id);
    }
    @Test public void failedStagingReturnsSafeInvalidAndKeepsOwnershipUntilCleanup() {
        ShareTargetInbox inbox=new ShareTargetInbox();ShareTargetInbox.Item media=inbox.beginMedia("private input");
        assertTrue(inbox.finishMedia(media.id,0,"image_unreadable"));ShareTargetInbox.Item result=inbox.consume();
        assertEquals("image_unreadable",result.reason);assertNull(result.text);assertEquals(0,result.imageCount);
        assertFalse(inbox.isLeasedMedia(media.id));inbox.release(media.id);
    }
    @Test public void recreatedBridgeReclaimsOnlyLatestOwnedMediaAndNeverReplaysOpenedUrl(){
        ShareTargetInbox inbox=new ShareTargetInbox();ShareTargetInbox.Item media=inbox.beginMedia("");inbox.finishMedia(media.id,1,null);inbox.consume();
        inbox.requeueLeased();ShareTargetInbox.Item same=inbox.consume();assertEquals(media.id,same.id);assertTrue(same.alreadyLeased);
        inbox.release(media.id);inbox.requeueLeased();assertNull(inbox.consume());
        inbox.offer(ShareTextParser.parse("android.intent.action.SEND","text/plain","https://generated.example/r"));inbox.consume();inbox.requeueLeased();assertNull(inbox.consume());
    }
}
