package app.recipio.local;

import java.io.*;
import java.util.*;

/** Native-only staging ownership. No URI, source text, or staging path crosses the bridge. */
final class ShareMediaFiles {
    interface Completion {void finished(String reason);}
    static final class Image {
        final File file; final int width,height;
        Image(File file,int width,int height){this.file=file;this.width=width;this.height=height;}
    }
    private static final class Receipt {
        final File dir; List<Image> images; boolean leased,ended; int pins;
        final List<Completion> releases=new ArrayList<>();
        Receipt(File dir){this.dir=dir;}
    }
    private final File root;
    private final Map<UUID,Receipt> owned=new HashMap<>();
    ShareMediaFiles(File cache)throws Exception{
        root=safe(new File(cache.getCanonicalFile(),"share-inbox"));
        if(!root.isDirectory()&&!root.mkdir())throw new AiFailure("storage_error");
    }
    synchronized File begin(UUID id)throws Exception{
        safe(root);if(id==null||owned.containsKey(id))throw new AiFailure("image_invalid");
        File dir=safe(new File(root,id.toString()));if(dir.exists()||!dir.mkdir())throw new AiFailure("storage_error");
        try(OutputStream out=new FileOutputStream(safe(new File(dir,".share")))){out.write(1);}
        catch(IOException failure){File marker=new File(dir,".share");if(!marker.exists()||marker.delete())dir.delete();throw new AiFailure("storage_error");}
        owned.put(id,new Receipt(dir));return dir;
    }
    synchronized void complete(UUID id,String[] names,int[] widths,int[] heights)throws Exception{
        Receipt receipt=required(id);if(receipt.images!=null||names==null||widths==null||heights==null||names.length<1||names.length>6||names.length!=widths.length||names.length!=heights.length)throw new AiFailure("image_invalid");
        List<Image> images=new ArrayList<>();Set<String> unique=new HashSet<>();
        for(int i=0;i<names.length;i++){
            String name=names[i];if(!imageName(name)||!unique.add(name))throw new AiFailure("image_invalid");
            File file=safe(new File(receipt.dir,name));long bytes=file.length();
            if(!file.isFile()||bytes<1||bytes>1024*1024||widths[i]<=10||heights[i]<=10||Math.max(widths[i],heights[i])>2048)throw new AiFailure("image_invalid");
            images.add(new Image(file,widths[i],heights[i]));
        }
        receipt.images=Collections.unmodifiableList(images);
    }
    synchronized boolean lease(UUID id){Receipt receipt=owned.get(id);if(receipt==null||receipt.ended||receipt.images==null||receipt.leased)return false;receipt.leased=true;return true;}
    synchronized List<Image> leasedImages(UUID id)throws Exception{Receipt receipt=required(id);if(!receipt.leased||receipt.images==null)throw new AiFailure("stale_session");return receipt.images;}
    synchronized List<Image> pin(UUID id)throws Exception{List<Image> images=leasedImages(id);Receipt receipt=owned.get(id);if(receipt.pins!=0)throw new AiFailure("busy");receipt.pins++;return images;}
    synchronized void unpin(UUID id)throws Exception{Receipt receipt=owned.get(id);if(receipt==null||receipt.pins<1)throw new AiFailure("stale_session");receipt.pins--;if(receipt.ended&&receipt.pins==0)erase(id,receipt);}
    synchronized void release(UUID id)throws Exception{Receipt receipt=owned.get(id);if(receipt==null)return;receipt.ended=true;if(receipt.pins==0)erase(id,receipt);}
    synchronized void release(UUID id,Completion completion){
        Receipt receipt=owned.get(id);if(receipt==null){completion.finished(null);return;}
        receipt.releases.add(completion);
        try{release(id);}catch(Exception ignored){/* erase delivered the failure; ownership remains available for retry. */}
    }
    synchronized void cleanupAbandoned()throws Exception{
        for(Map.Entry<UUID,Receipt> entry:new ArrayList<>(owned.entrySet()))if(entry.getValue().ended&&entry.getValue().pins==0)erase(entry.getKey(),entry.getValue());
        safe(root);File[] dirs=root.listFiles();if(dirs==null)throw new AiFailure("storage_error");
        for(File dir:dirs){UUID id=parse(dir.getName());if(id==null||owned.containsKey(id))continue;safe(dir);
            File marker=safe(new File(dir,".share"));if(!dir.isDirectory()||!marker.isFile()||marker.length()!=1)continue;
            try(InputStream in=new FileInputStream(marker)){if(in.read()!=1)continue;}
            erase(id,new Receipt(dir));
        }
    }
    private Receipt required(UUID id)throws Exception{Receipt receipt=owned.get(id);if(receipt==null||receipt.ended)throw new AiFailure("stale_session");safe(root);safe(receipt.dir);return receipt;}
    private void erase(UUID id,Receipt receipt)throws Exception{
        try{eraseFiles(id,receipt);}catch(Exception failure){finishReleases(receipt,"storage_error");throw failure;}
        finishReleases(receipt,null);
    }
    private static void finishReleases(Receipt receipt,String reason){List<Completion> callbacks=new ArrayList<>(receipt.releases);receipt.releases.clear();for(Completion callback:callbacks)callback.finished(reason);}
    private void eraseFiles(UUID id,Receipt receipt)throws Exception{
        safe(root);safe(receipt.dir);if(!receipt.dir.exists()){owned.remove(id);return;}
        File[] children=receipt.dir.listFiles();if(children==null)throw new AiFailure("storage_error");
        // Validate every child before deleting any: do not follow symlinks or broad-delete unknown files.
        for(File child:children){safe(child);String name=child.getName();if(!child.isFile()||!(name.equals(".share")||imageName(name)||sourceName(name)))throw new AiFailure("storage_error");}
        for(File child:children)if(!child.getName().equals(".share")&&!child.delete())throw new AiFailure("storage_error");
        File marker=safe(new File(receipt.dir,".share"));if(marker.exists()&&!marker.delete()||!receipt.dir.delete())throw new AiFailure("storage_error");
        owned.remove(id);
    }
    static File safe(File file)throws Exception{if(!file.getCanonicalFile().equals(file.getAbsoluteFile()))throw new AiFailure("storage_error");return file;}
    private static UUID parse(String value){try{UUID id=UUID.fromString(value);return id.toString().equals(value)?id:null;}catch(IllegalArgumentException ignored){return null;}}
    private static boolean imageName(String value){return value!=null&&value.endsWith(".jpg")&&parse(value.substring(0,value.length()-4))!=null;}
    private static boolean sourceName(String value){return value!=null&&value.endsWith(".source.part")&&parse(value.substring(0,value.length()-12))!=null;}
}
