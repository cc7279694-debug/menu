package app.recipio.local;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** Immutable operation records; cleanup accepts only generations this operation created. */
final class LocalBackupSession {
    final File root, directory; final String token, mode;
    String generation; String dataHash;
    private LocalBackupSession(File root,File directory,String token,String mode){this.root=root;this.directory=directory;this.token=token;this.mode=mode;}
    static boolean uuid(String value){return value!=null&&value.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}");}
    static LocalBackupSession create(File root,String mode)throws IOException {
        root=root.getCanonicalFile();
        if(!mode.equals("export")&&!mode.equals("restore"))throw new IOException("操作类型无效");
        File base=workDirectory(root);if(!base.exists()&&!base.mkdir())throw new IOException("无法创建备份工作目录");
        String token=UUID.randomUUID().toString();File dir=new File(base,token);if(!dir.mkdir())throw new IOException("无法创建备份操作");
        LocalBackupSession session=new LocalBackupSession(root,dir,token,mode);
        try{writeNew(new File(dir,"operation.json"),new JSONObject().put("token",token).put("mode",mode));return session;}catch(JSONException|IOException e){LocalBackupArchive.deleteOwnedTree(dir);throw new IOException("操作记录创建失败",e);}
    }
    static LocalBackupSession reopen(File root,String token)throws IOException {
        root=root.getCanonicalFile();
        if(!uuid(token))throw new IOException("操作标识无效");File dir=new File(workDirectory(root),token);
        if(!dir.getCanonicalFile().equals(dir.getAbsoluteFile()))throw new IOException("操作目录无效");
        File published=new File(dir,"operation.json");
        if(!published.exists()){
            // Publication is the first action. No generation or SQL switch can exist yet.
            File[] files=dir.listFiles();if(files==null)throw new IOException("无法核查未发布操作");
            for(File file:files)if(!file.getName().equals("operation.json.part")||!file.isFile()||!file.getCanonicalFile().equals(file.getAbsoluteFile()))throw new IOException("未发布操作含未知文件，保留核查");
            return new LocalBackupSession(root,dir,token,"abandoned");
        }
        try{JSONObject op=read(published);String mode=op.getString("mode");if(!token.equals(op.getString("token"))||!(mode.equals("restore")||mode.equals("export")))throw new IOException("操作记录无效");LocalBackupSession s=new LocalBackupSession(root,dir,token,mode);
            File generation=new File(dir,"generation.json");if(generation.exists()){JSONObject g=read(generation);s.generation=g.getString("generationId");s.dataHash=g.getString("dataSha256");if(!uuid(s.generation)||!s.dataHash.matches("[a-f0-9]{64}"))throw new IOException("图片暂存记录无效");}return s;
        }catch(JSONException e){throw new IOException("操作记录损坏",e);}
    }
    void registerGeneration(String id,String hash)throws IOException {
        if(!mode.equals("restore")||generation!=null||!uuid(id)||!hash.matches("[a-f0-9]{64}"))throw new IOException("暂存操作无效");
        try{writeNew(new File(directory,"generation.json"),new JSONObject().put("generationId",id).put("dataSha256",hash));generation=id;dataHash=hash;}catch(JSONException e){throw new IOException(e);}
    }
    void journal(String phase,String id,String hash)throws IOException {
        if(!Objects.equals(id,generation)||!Objects.equals(hash,dataHash)||!(phase.equals("staged")||phase.equals("committing")))throw new IOException("恢复操作不匹配");
        try{JSONObject j=new JSONObject().put("operationId",token).put("generationId",generation).put("dataSha256",dataHash).put("phase",phase);File target=new File(directory,phase+".json");if(target.exists()){if(!read(target).toString().equals(j.toString()))throw new IOException("已有恢复记录不匹配");return;}writeNew(target,j);}catch(JSONException e){throw new IOException(e);}
    }
    JSONObject readJournal()throws IOException {File committing=new File(directory,"committing.json"),staged=new File(directory,"staged.json");return committing.exists()?read(committing):staged.exists()?read(staged):null;}
    void cleanup(Set<String> references,String committedGeneration,boolean preserveExport)throws IOException {
        if(generation!=null){String prefix="images/generation-"+generation+"/";boolean referenced=references.stream().anyMatch(p->p.startsWith(prefix));if(!generation.equals(committedGeneration)&&!referenced)LocalBackupArchive.deleteOwnedTree(new File(root,"images/generation-"+generation));}
        File complete=new File(directory,"output.recipio");
        if(preserveExport&&complete.isFile()) {
            boolean valid;
            try{LocalBackupArchive.validate(complete);valid=true;}catch(IOException e){
                // Interrupted private output is not a backup. Source data is untouched.
                if(!(e instanceof java.util.zip.ZipException)&&!e.getMessage().startsWith("备份文件无效"))throw e;
                valid=false;
            }
            if(valid){File backups=new File(root,"backups");if(!backups.exists()&&!backups.mkdir())throw new IOException("无法保留安全文件");File target=new File(backups,"pending-export-"+token+".recipio");if(target.exists()||!complete.renameTo(target))throw new IOException("完整备份保留失败");}
        }
        LocalBackupArchive.deleteOwnedTree(directory);
    }
    static List<LocalBackupSession> pending(File root)throws IOException {
        File base=workDirectory(root.getCanonicalFile());File[] dirs=base.listFiles();List<LocalBackupSession> result=new ArrayList<>();if(dirs!=null)for(File dir:dirs){if(!uuid(dir.getName())||!dir.isDirectory())throw new IOException("备份工作目录需要人工核查");result.add(reopen(root,dir.getName()));}return result;
    }
    private static File workDirectory(File root)throws IOException {File base=new File(root,"backup-work");if(!base.getCanonicalFile().equals(base.getAbsoluteFile()))throw new IOException("备份工作目录不能是符号链接");return base;}
    static JSONObject read(File file)throws IOException {if(!file.isFile()||file.length()>1048576)throw new IOException("操作记录缺失或过大");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=new FileInputStream(file)){LocalBackupArchive.transfer(in,out,1048576);}return LocalBackupArchive.parseJson(out.toByteArray());}
    private static void writeNew(File target,JSONObject data)throws IOException {
        File part=new File(target.getParentFile(),target.getName()+".part");boolean created=false;
        try{if(target.exists()||!part.createNewFile())throw new IOException("禁止覆盖操作记录");created=true;try(FileOutputStream out=new FileOutputStream(part)){out.write(data.toString().getBytes(StandardCharsets.UTF_8));out.getFD().sync();}if(!part.renameTo(target))throw new IOException("操作记录发布失败");}
        catch(IOException e){if(created&&part.exists()&&!part.delete())e.addSuppressed(new IOException("记录清理失败"));throw e;}
    }
}
