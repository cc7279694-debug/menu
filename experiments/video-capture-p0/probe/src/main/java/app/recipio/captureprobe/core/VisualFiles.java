package app.recipio.captureprobe.core;
import java.io.*;
import java.util.*;
public final class VisualFiles {
    public static final long LEASE_MILLIS=6*60*60*1000;
    public static final long MAX_BYTES=40L*1024*1024;
    // Retain capacity for a first six-image export, including its bounded lease manifest.
    public static final long SHARE_RESERVE_BYTES=6L*1024*1024+1024;
    private static final Object LOCK=new Object();
    private final File root,candidates,exports;
    private final long limit;
    public VisualFiles(File cache)throws IOException{this(cache,MAX_BYTES);}
    public VisualFiles(File cache,long limit)throws IOException{
        if(limit<1||limit>MAX_BYTES)throw new IllegalArgumentException("limit");this.limit=limit;
        root=directory(cache.getCanonicalFile(),"video-visual-p1");
        candidates=directory(root,"candidates");exports=directory(root,"exports");
    }
    private static File directory(File parent,String name)throws IOException{
        File dir=safe(parent,name);
        if((!dir.exists()&&!dir.mkdir())||!dir.isDirectory())throw new IOException("cache directory");return dir;
    }
    private static File safe(File dir,String name)throws IOException{
        if(name==null||!name.matches("[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}")||name.contains(".."))throw new IOException("cache path");
        File f=new File(dir,name);
        if(!f.getCanonicalFile().equals(f)||!f.getParentFile().equals(dir))throw new IOException("cache containment");return f;
    }
    public File candidate(int id)throws IOException{checkId(id);return safe(candidates,"c-"+id+".jpg");}
    public File thumbnail(int id)throws IOException{checkId(id);return safe(candidates,"t-"+id+".jpg");}
    public File exportFile(String name)throws IOException{return safe(exports,name);}
    private static void checkId(int id)throws IOException{if(id<0||id>=120)throw new IOException("candidate id");}
    private static File[] entries(File dir)throws IOException{
        File[] found=dir.listFiles();if(found==null)throw new IOException("cache list");
        for(File f:found)if(!safe(dir,f.getName()).isFile())throw new IOException("unexpected cache entry");
        return found;
    }
    public long bytes()throws IOException{synchronized(LOCK){long n=0;for(File dir:new File[]{candidates,exports})for(File f:entries(dir))n+=f.length();return n;}}
    public void storeCandidate(int id,byte[] jpeg,byte[] thumbnail)throws IOException{
        synchronized(LOCK){
            if(jpeg.length<1||jpeg.length>1024*1024||thumbnail.length<1||thumbnail.length>128*1024)throw new IOException("image bytes");
            File full=candidate(id),thumb=thumbnail(id);
            if(full.exists()||thumb.exists())throw new IOException("candidate already exists");
            long added=(long)jpeg.length+thumbnail.length;
            if(added>limit-SHARE_RESERVE_BYTES-bytes())throw new IOException("candidate budget reached; share capacity retained");
            try{write(full,jpeg);write(thumb,thumbnail);}catch(IOException e){delete(full);delete(thumb);throw e;}
        }
    }
    private void reserve(long size)throws IOException{if(size<0||size>limit-bytes())throw new IOException("cache budget reached");}
    private static void write(File destination,byte[] data)throws IOException{
        File part=safe(destination.getParentFile(),destination.getName()+".part");
        if(destination.exists()||part.exists())throw new IOException("file exists");
        try{
            try(FileOutputStream out=new FileOutputStream(part)){out.write(data);out.getFD().sync();}
            if(!part.renameTo(destination))throw new IOException("publish failed");
        }finally{delete(part);}
    }
    private static void delete(File file)throws IOException{if(file.exists()&&!file.delete())throw new IOException("cache cleanup");}
    public List<File> share(List<Integer> ids,long now)throws IOException{
        synchronized(LOCK){
            if(now<0||now>Long.MAX_VALUE-LEASE_MILLIS||ids.isEmpty()||ids.size()>6||new HashSet<>(ids).size()!=ids.size())throw new IOException("share selection");
            prune(now);
            List<File> originals=new ArrayList<>();long needed=0;
            for(int id:ids){File f=candidate(id);if(!f.isFile()||f.length()<1||f.length()>1024*1024)throw new IOException("missing candidate");originals.add(f);needed+=f.length();}
            String lease=UUID.randomUUID().toString();List<File> copies=new ArrayList<>();
            StringBuilder metadata=new StringBuilder().append(now).append('\n');
            for(int i=0;i<ids.size();i++){File f=safe(exports,lease+"-"+i+".jpg");copies.add(f);metadata.append(f.getName()).append('\n');}
            byte[] manifest=metadata.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            reserve(needed+manifest.length);
            File record=safe(exports,lease+".lease");
            try{
                for(int i=0;i<copies.size();i++){
                    File f=originals.get(i);byte[] data=new byte[(int)f.length()];
                    try(DataInputStream input=new DataInputStream(new FileInputStream(f))){input.readFully(data);}
                    write(copies.get(i),data);
                }
                write(record,manifest);return copies;
            }catch(IOException e){for(File f:copies)delete(f);delete(record);throw e;}
        }
    }
    private Set<String> leased(long now)throws IOException{
        Set<String> keep=new HashSet<>();
        for(File f:entries(exports)){
            if(!f.getName().endsWith(".lease")||f.length()>1024||f.length()==0)continue;
            List<String> lines=java.nio.file.Files.readAllLines(f.toPath(),java.nio.charset.StandardCharsets.UTF_8);
            try{
                long created=Long.parseLong(lines.get(0));
                if(created<0||now<created||now-created>=LEASE_MILLIS||lines.size()<2||lines.size()>7)continue;
                String prefix=f.getName().substring(0,f.getName().length()-6);
                boolean valid=true;
                for(int i=1;i<lines.size();i++){
                    String name=lines.get(i);
                    if(!name.equals(prefix+"-"+(i-1)+".jpg")||!safe(exports,name).isFile()){valid=false;break;}
                }
                if(valid){keep.add(f.getName());keep.addAll(lines.subList(1,lines.size()));}
            }catch(NumberFormatException|IndexOutOfBoundsException malformed){/* Invalid manifests are not capabilities. */}
        }
        return keep;
    }
    public boolean readAllowed(String name,long now)throws IOException{
        synchronized(LOCK){
            if(name==null||!name.matches("[0-9a-f-]{36}-[0-5]\\.jpg"))return false;
            return leased(now).contains(name)&&safe(exports,name).isFile();
        }
    }
    public void prune(long now)throws IOException{synchronized(LOCK){Set<String> keep=leased(now);for(File f:entries(exports))if(!keep.contains(f.getName()))delete(f);}}
    public void clearCandidates()throws IOException{synchronized(LOCK){for(File f:entries(candidates))delete(f);}}
    public void coldStart(long now)throws IOException{synchronized(LOCK){clearCandidates();prune(now);}}
    public void clearAll()throws IOException{synchronized(LOCK){clearCandidates();for(File f:entries(exports))delete(f);}}
}
