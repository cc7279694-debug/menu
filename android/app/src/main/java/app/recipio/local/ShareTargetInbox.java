package app.recipio.local;

import java.util.*;

/** A single process-memory slot. Never serialize this object or its input. */
final class ShareTargetInbox {
    static final ShareTargetInbox PROCESS = new ShareTargetInbox();
    static final class Item {
        final String id, url, reason, text, companionText;
        final boolean replaced;
        final int imageCount;
        final boolean staging;
        boolean alreadyLeased;
        Item(ShareTextParser.Result result, boolean replaced) {
            this(UUID.randomUUID().toString(),result.url,result.reason,result.text,result.companionText,replaced,0,false);
        }
        Item(String id,String url,String reason,String text,String companionText,boolean replaced,int imageCount,boolean staging) {
            this.id=id;this.url=url;this.reason=reason;this.text=text;this.companionText=companionText;this.replaced=replaced;this.imageCount=imageCount;this.staging=staging;
        }
    }
    private Item pending;
    private final Map<String,Item> leasedMedia=new LinkedHashMap<>();
    synchronized Item offer(ShareTextParser.Result result) {
        if(result==null)return null;
        Item previous=pending;pending=new Item(result,previous!=null);return previous;
    }
    synchronized Item beginMedia(String text) {
        pending=new Item(UUID.randomUUID().toString(),null,null,text,null,pending!=null,0,true);return pending;
    }
    synchronized Item peek() {return pending;}
    synchronized boolean finishMedia(String id,int count,String reason) {
        if(pending==null||!pending.id.equals(id)||!pending.staging)return false;
        pending=new Item(id,null,reason,reason==null?pending.text:null,null,pending.replaced,reason==null?count:0,false);return true;
    }
    synchronized Item consume() {
        if(pending!=null&&pending.staging)return null;
        Item result = pending;
        pending = null;
        if(result!=null&&result.imageCount>0)leasedMedia.put(result.id,result);
        return result;
    }
    synchronized boolean isLeasedMedia(String id){return leasedMedia.containsKey(id);}
    synchronized void requeueLeased(){
        if(pending!=null||leasedMedia.isEmpty())return;
        for(Item item:leasedMedia.values())pending=item;
        pending.alreadyLeased=true;
    }
    synchronized void release(String id){leasedMedia.remove(id);if(pending!=null&&pending.id.equals(id))pending=null;}
}
