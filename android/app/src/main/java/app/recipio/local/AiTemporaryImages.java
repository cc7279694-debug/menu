package app.recipio.local;

import android.content.Context;
import android.net.Uri;
import java.io.*;
import java.util.*;

/** Private, session-owned cache; never a Recipe asset or a business database. */
final class AiTemporaryImages {
    interface Clock { long now(); }
    interface Processor { Processed process(File source,String mime)throws Exception; }
    interface Work<T> { T run(List<Processed> images)throws Exception; }
    static final class Processed {
        final byte[] bytes;final int width,height;
        Processed(byte[] bytes,int width,int height){this.bytes=bytes;this.width=width;this.height=height;}
    }
    static final class Image {
        final String id,previewUri;final int byteSize,width,height;
        Image(String id,File file,Processed result){this.id=id;previewUri="file://"+file.toURI().getRawPath();byteSize=result.bytes.length;width=result.width;height=result.height;}
    }
    private final File root;private final Clock clock;private final Processor processor;
    private final Map<UUID,Session> sessions=new HashMap<>();
    private static final class Session {final File dir;final long created;final Map<UUID,Image> images=new LinkedHashMap<>();int pins;boolean ended;Session(File dir,long created){this.dir=dir;this.created=created;}}
    private boolean pendingCleanup;
    AiTemporaryImages(File cache,Clock clock,Processor processor)throws Exception {root=new File(cache.getCanonicalFile(),"ai-import");safe(root);if(!root.isDirectory()&&!root.mkdir())throw new AiFailure("storage_error");this.clock=clock;this.processor=processor;}
    static AiTemporaryImages forContext(Context context)throws Exception {return new AiTemporaryImages(context.getCacheDir(),System::currentTimeMillis,AiImageCodec::process);}
    synchronized void create(UUID operation)throws Exception {safe(root);if(sessions.size()>=8)throw new AiFailure("busy");File dir=safe(new File(root,operation.toString()));if(dir.exists()||!dir.mkdir())throw new AiFailure("storage_error");long created=clock.now();try(DataOutputStream out=new DataOutputStream(new FileOutputStream(safe(new File(dir,".session"))))){out.writeInt(1);out.writeLong(created);}sessions.put(operation,new Session(dir,created));}
    Image importSelectedUri(Context context,UUID operation,Uri uri)throws Exception {
        if(uri==null||!"content".equals(uri.getScheme())||uri.getAuthority()==null||uri.getFragment()!=null||(context.getPackageName()+".fileprovider").equals(uri.getAuthority()))throw new AiFailure("image_invalid");
        try{return importStream(operation,context.getContentResolver().openInputStream(uri),context.getContentResolver().getType(uri));}catch(AiFailure e){throw e;}catch(Exception ignored){throw new AiFailure("image_invalid");}
    }
    Image importStream(UUID operation,InputStream stream,String mime)throws Exception {
        Session session=null;File original=null,output=null;boolean pinned=false,registered=false;
        try(InputStream input=stream){
            if(input==null||!Arrays.asList("image/jpeg","image/png","image/webp").contains(mime))throw new AiFailure("image_invalid");
            UUID id=UUID.randomUUID();
            synchronized(this){session=owned(operation);if(session.images.size()+session.pins>=6)throw new AiFailure("image_too_large");session.pins++;pinned=true;original=safe(new File(session.dir,id+".source.part"));output=safe(new File(session.dir,id+".jpg"));}
            int bytes=0;byte[] buffer=new byte[8192];
            try(OutputStream out=new FileOutputStream(original)){int n;while((n=input.read(buffer))!=-1){if(n==0)continue;if(bytes+n>15*1024*1024)throw new AiFailure("image_too_large");out.write(buffer,0,n);bytes+=n;}if(bytes==0)throw new AiFailure("image_invalid");}
            Processed result=processor.process(original,mime);if(result==null||result.bytes==null||result.bytes.length==0)throw new AiFailure("image_invalid");
            if(result.bytes.length>1024*1024)throw new AiFailure("image_too_large");if(result.width<=10||result.height<=10||Math.max(result.width,result.height)>2048)throw new AiFailure("image_invalid");
            synchronized(this){owned(operation);safe(session.dir);safe(output);try(OutputStream out=new FileOutputStream(output)){out.write(result.bytes);}Image image=new Image(id.toString(),output,result);session.images.put(id,image);registered=true;return image;}
        }catch(AiFailure e){throw e;}catch(Exception ignored){throw new AiFailure("storage_error");}
        finally{synchronized(this){if(original!=null&&!unlink(original))pendingCleanup=true;if(!registered&&output!=null&&!unlink(output))pendingCleanup=true;if(pinned){session.pins--;if(session.ended)cleanup(session);}}}
    }
    <T>T withPinnedImages(UUID operation,List<UUID> ids,Work<T> work)throws Exception {
        Session session;List<Image> selected=new ArrayList<>();
        synchronized(this){session=owned(operation);if(ids.size()>6||new HashSet<>(ids).size()!=ids.size())throw new AiFailure("image_invalid");for(UUID id:ids){Image image=session.images.get(id);if(image==null)throw new AiFailure("image_invalid");selected.add(image);}session.pins++;}
        try{List<Processed> data=new ArrayList<>();int total=0;for(Image image:selected){File file=safe(new File(session.dir,image.id+".jpg"));byte[] bytes=read(file,1024*1024);if(bytes.length!=image.byteSize)throw new AiFailure("image_invalid");total+=bytes.length;if(total>6*1024*1024)throw new AiFailure("image_too_large");data.add(new Processed(bytes,image.width,image.height));}return work.run(Collections.unmodifiableList(data));}
        finally{synchronized(this){session.pins--;if(session.ended)cleanup(session);}}
    }
    synchronized void remove(UUID operation,UUID image)throws Exception {Session session=owned(operation);if(session.pins!=0)throw new AiFailure("busy");if(!session.images.containsKey(image))throw new AiFailure("image_invalid");if(!unlink(safe(new File(session.dir,image+".jpg")))){pendingCleanup=true;throw new AiFailure("storage_error");}session.images.remove(image);}
    synchronized void discard(UUID operation)throws Exception {Session session=sessions.get(operation);if(session==null)return;session.ended=true;if(session.pins==0&&!cleanup(session))throw new AiFailure("storage_error");}
    synchronized boolean cleanupAbandoned(){
        pendingCleanup=false;
        try{safe(root);File[] directories=root.listFiles();if(directories==null)throw new IOException();for(File directory:directories){if(!AiRequestLifecycle.uuid(directory.getName()))continue;safe(directory);File marker=safe(new File(directory,".session"));if(!marker.isFile())continue;long created;try(DataInputStream input=new DataInputStream(new FileInputStream(marker))){if(marker.length()!=12||input.readInt()!=1)continue;created=input.readLong();}
                UUID id=UUID.fromString(directory.getName());Session session=sessions.get(id);if(session!=null){if(session.pins==0&&(session.ended||clock.now()>=session.created&&clock.now()-session.created>=86400000L)){session.ended=true;cleanup(session);}else if(!knownChildren(directory))pendingCleanup=true;else if(session.pins==0)cleanupOrphans(session);}
                else cleanup(new Session(directory,created));
            }
        }catch(Exception ignored){pendingCleanup=true;}return pendingCleanup;
    }
    private void cleanupOrphans(Session session)throws Exception {
        File[] children=session.dir.listFiles();if(children==null)throw new IOException();
        for(File child:children){String name=child.getName();if(name.equals(".session"))continue;
            boolean selected=name.endsWith(".jpg")&&session.images.containsKey(UUID.fromString(name.substring(0,name.length()-4)));
            if(!selected&&!unlink(child))pendingCleanup=true;
        }
    }
    private Session owned(UUID id)throws Exception {Session session=sessions.get(id);if(session==null||session.ended)throw new AiFailure("stale_session");safe(root);safe(session.dir);return session;}
    private boolean cleanup(Session session){try{if(session.pins!=0)return true;safe(root);safe(session.dir);if(!knownChildren(session.dir))throw new IOException();File[] children=session.dir.listFiles();if(children==null)throw new IOException();for(File child:children){if(child.getName().equals(".session"))continue;if(!unlink(child))throw new IOException();}if(!unlink(new File(session.dir,".session"))||!session.dir.delete())throw new IOException();sessions.remove(UUID.fromString(session.dir.getName()));return true;}catch(Exception ignored){pendingCleanup=true;return false;}}
    private static boolean knownChildren(File dir)throws Exception {File[] children=dir.listFiles();if(children==null)return false;for(File child:children){safe(child);String name=child.getName();if(name.equals(".session"))continue;String suffix=name.endsWith(".source.part")?".source.part":name.endsWith(".jpg")?".jpg":null;if(suffix==null||!AiRequestLifecycle.uuid(name.substring(0,name.length()-suffix.length()))||!child.isFile())return false;}return true;}
    private static File safe(File file)throws Exception {if(!file.getCanonicalFile().equals(file.getAbsoluteFile()))throw new AiFailure("storage_error");return file;}
    private static boolean unlink(File file){try{safe(file);return !file.exists()||file.isFile()&&file.delete();}catch(Exception ignored){return false;}}
    static byte[] read(File file,int max)throws Exception {safe(file);try(InputStream input=new FileInputStream(file);ByteArrayOutputStream output=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){if(n==0)continue;if(output.size()+n>max)throw new AiFailure("image_too_large");output.write(buffer,0,n);}if(output.size()==0)throw new AiFailure("image_invalid");return output.toByteArray();}}
}
