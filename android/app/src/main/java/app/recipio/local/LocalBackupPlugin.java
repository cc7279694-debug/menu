package app.recipio.local;

import android.app.Activity;
import android.content.*;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

@CapacitorPlugin(name="LocalBackup")
public class LocalBackupPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private LocalBackupSession active;
    private boolean busy, choosing;
    private String phase="idle";
    private Uri exportUri;
    private String exportName;
    private LocalBackupExportState exportState;
    private List<LocalBackupArchive.Asset> sourceAssets;
    private LocalBackupArchive.Validated restore;
    private interface Work { JSObject run(LocalBackupSession session)throws Exception; }
    private File root(){return getContext().getFilesDir();}
    private synchronized boolean reserve(PluginCall call) {
        if(busy||choosing||active!=null){call.reject("已有备份操作正在进行");return false;}
        try{if(!LocalBackupSession.pending(root()).isEmpty()){call.reject("存在未完成操作，请重新打开应用完成安全核查");return false;}}
        catch(IOException e){call.reject(e.getMessage());return false;}
        choosing=true;phase="choosing";return true;
    }
    private synchronized LocalBackupSession require(PluginCall call)throws IOException {
        String token=call.getString("token");if(active==null||!active.token.equals(token))throw new IOException("无效或过期的备份操作");return active;
    }
    // Publish only after releasing the completed operation. A JS reply can start
    // the next bridge call immediately; no post-reply finally may reset its lock.
    private synchronized void releaseWork() {
        busy=false;
        phase=active==null?"idle":"ready";
    }
    private void run(PluginCall call,String next,Work action) {
        final LocalBackupSession session;
        synchronized(this){try{session=require(call);}catch(IOException e){call.reject(e.getMessage());return;}if(busy){call.reject("备份操作正在进行，请勿重复操作");return;}busy=true;phase=next;}
        worker.execute(()->{
            final JSObject result;
            try { result=action.run(session); }
            catch(Exception e) {
                releaseWork();
                call.reject(e.getMessage()==null?"备份操作失败，请检查设备空间与文件":e.getMessage());
                return;
            }
            releaseWork();
            call.resolve(result);
        });
    }
    @PluginMethod public void chooseExport(PluginCall call) {
        if(!reserve(call))return;String name=call.getString("suggestedName");if(name==null||name.length()>150||!name.endsWith(".recipio")||name.contains("/")||name.contains("\\")){synchronized(this){choosing=false;phase="idle";}call.reject("备份文件名无效");return;}
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE,name).putExtra(Intent.EXTRA_LOCAL_ONLY,true).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try{startActivityForResult(call,intent,"exportChosen");}catch(RuntimeException e){synchronized(this){choosing=false;phase="idle";}call.reject("无法打开系统保存器");}
    }
    @ActivityCallback private void exportChosen(PluginCall call,ActivityResult result) {
        if(call==null)return;synchronized(this){choosing=false;}
        if(result.getResultCode()!=Activity.RESULT_OK){phase="idle";call.resolve(new JSObject().put("cancelled",true));return;}
        Uri uri=result.getData()==null?null:result.getData().getData();
        boolean uriChecked=false;
        try{checkUri(uri);uriChecked=true;synchronized(this){active=LocalBackupSession.create(root(),"export");exportUri=uri;exportState=new LocalBackupExportState();exportName=call.getString("suggestedName");phase="ready";}call.resolve(new JSObject().put("token",active.token));}catch(IOException e){phase="idle";try{if(uriChecked)new LocalBackupExportState().discard(()->DocumentsContract.deleteDocument(getContext().getContentResolver(),uri));}catch(IOException cleanup){e.addSuppressed(cleanup);call.reject(e.getMessage()+"；"+cleanup.getMessage());return;}call.reject(e.getMessage());}
    }
    @PluginMethod public void chooseRestore(PluginCall call) {
        if(!reserve(call))return;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_LOCAL_ONLY,true).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try{startActivityForResult(call,intent,"restoreChosen");}catch(RuntimeException e){synchronized(this){choosing=false;phase="idle";}call.reject("无法打开系统文件选择器");}
    }
    @ActivityCallback private void restoreChosen(PluginCall call,ActivityResult result) {
        if(call==null)return;synchronized(this){choosing=false;}
        if(result.getResultCode()!=Activity.RESULT_OK){phase="idle";call.resolve(new JSObject().put("cancelled",true));return;}
        Uri uri=result.getData()==null?null:result.getData().getData();
        try{checkUri(uri);synchronized(this){active=LocalBackupSession.create(root(),"restore");busy=true;phase="validating";}}catch(IOException e){phase="idle";call.reject(e.getMessage());return;}
        final LocalBackupSession session=active;
        worker.execute(()->{
            final JSObject resultData;
            try {
                File input=new File(session.directory,"input.recipio");
                LocalBackupArchive.copyInput(getContext().getContentResolver().openInputStream(uri),input,Math.min(LocalBackupArchive.MAX_BYTES,Math.max(0,root().getUsableSpace()-33554432L)));
                restore=LocalBackupArchive.validate(input);
                resultData=new JSObject().put("token",session.token).put("manifest",restore.manifest).put("data",restore.data);
            } catch(Exception e) {
                try { session.cleanup(Collections.emptySet(),null,false); synchronized(this){active=null;} }
                catch(IOException cleanup) { e.addSuppressed(cleanup); }
                releaseWork();
                call.reject(e.getMessage()==null?"无法读取备份":e.getMessage());
                return;
            }
            releaseWork();
            call.resolve(resultData);
        });
    }
    private void checkUri(Uri uri)throws IOException {if(uri==null||!"content".equals(uri.getScheme())||(getContext().getPackageName()+".fileprovider").equals(uri.getAuthority()))throw new IOException("请选择设备中的有效文件");}
    private List<String> paths(PluginCall call)throws JSONException,IOException {JSArray array=call.getArray("paths");if(array==null)throw new IOException("图片引用缺失");List<String> result=new ArrayList<>();for(int i=0;i<array.length();i++){Object value=array.get(i);if(!(value instanceof String))throw new IOException("图片路径无效");result.add((String)value);}return result;}
    @PluginMethod public void inspectMedia(PluginCall call) {run(call,"media",s->{sourceAssets=LocalBackupArchive.inspect(root(),paths(call));JSONArray assets=new JSONArray();for(LocalBackupArchive.Asset a:sourceAssets)assets.put(a.json().put("sourcePath",a.sourcePath));if(assets.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>LocalBackupArchive.MAX_DATA)throw new IOException("媒体引用超过本版本处理上限");return new JSObject().put("assets",assets);});}
    private int schema()throws IOException {File file=getContext().getDatabasePath("recipioSQLite.db");if(!file.isFile())throw new IOException("数据库未就绪");try(SQLiteDatabase db=SQLiteDatabase.openDatabase(file.getPath(),null,SQLiteDatabase.OPEN_READONLY);Cursor c=db.rawQuery("PRAGMA user_version",null)){if(!c.moveToFirst()||c.getInt(0)!=4)throw new IOException("数据库版本不支持备份");return c.getInt(0);}catch(RuntimeException e){throw new IOException("数据库读取失败，不进行数据清理",e);}}
    private PackageInfo version()throws Exception{return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0);}
    private void writeArchive(File target,JSONObject data,List<LocalBackupArchive.Asset> assets,PluginCall call)throws Exception {int requested=call.getInt("sourceSchemaVersion",0);if(requested!=schema())throw new IOException("备份源版本不匹配");if(data==null||assets==null)throw new IOException("备份数据未准备");PackageInfo p=version();long code=Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;if(code>Integer.MAX_VALUE)throw new IOException("应用版本超出范围");LocalBackupArchive.write(target,data,assets,p.versionName,(int)code,requested);}
    @PluginMethod public void writeExport(PluginCall call) {run(call,"writing",s->{if(!s.mode.equals("export")||exportUri==null)throw new IOException("导出操作无效");File complete=new File(s.directory,"output.recipio");writeArchive(complete,call.getObject("data"),sourceAssets,call);LocalBackupArchive.Validated expected=LocalBackupArchive.validate(complete);
        try{LocalBackupDocuments.export(getContext().getContentResolver(),exportUri,complete,new File(s.directory,"readback.recipio"));
            exportState.markVerified();
            try(Cursor c=getContext().getContentResolver().query(exportUri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())exportName=c.getString(0);}
            return new JSObject().put("manifest",expected.manifest).put("fileName",exportName).put("size",expected.size).put("sha256",expected.sha256);
        }catch(Exception e){throw new IOException("备份保存未完成；请选择本地位置重试。",e);}});}
    @PluginMethod public void stageMedia(PluginCall call) {run(call,"staging",s->{if(!s.mode.equals("restore")||restore==null)throw new IOException("恢复文件未校验");String generation=UUID.randomUUID().toString();s.registerGeneration(generation,restore.manifest.getJSONObject("dataFile").getString("sha256"));Map<String,String> mapped=LocalBackupArchive.stage(restore,root(),generation);s.journal("staged",generation,s.dataHash);return new JSObject().put("generationId",generation).put("paths",new JSONObject(mapped));});}
    @PluginMethod public void createSafetySnapshot(PluginCall call) {run(call,"safety",s->{if(!s.mode.equals("restore")||s.generation==null)throw new IOException("恢复未暂存");JSONObject mappings=call.getObject("paths");if(mappings==null)throw new IOException("安全副本图片引用缺失");List<String> paths=new ArrayList<>();Iterator<String> keys=mappings.keys();while(keys.hasNext())paths.add(mappings.getString(keys.next()));List<LocalBackupArchive.Asset> assets=LocalBackupArchive.inspect(root(),paths);File backups=new File(root(),"backups");if(!backups.exists()&&!backups.mkdir())throw new IOException("安全副本目录不可写");File target=new File(backups,"safety-"+s.token+".recipio");writeArchive(target,call.getObject("data"),assets,call);LocalBackupArchive.Validated validated=LocalBackupArchive.validate(target);return new JSObject().put("size",validated.size).put("sha256",validated.sha256);});}
    @PluginMethod public void writeJournal(PluginCall call) {run(call,"journal",s->{s.journal(call.getString("phase"),call.getString("generationId"),call.getString("dataSha256"));return new JSObject();});}
    @PluginMethod public void readJournal(PluginCall call) {synchronized(this){if(busy||choosing){call.reject("操作正在进行");return;}}worker.execute(()->{try{JSONObject journal=null;for(LocalBackupSession s:LocalBackupSession.pending(root())){JSONObject next=s.readJournal();if(next!=null){if(journal!=null)throw new IOException("存在多个恢复记录，需要核查");journal=next;synchronized(this){active=s;}}}call.resolve(new JSObject().put("journal",journal==null?JSONObject.NULL:journal));}catch(Exception e){call.reject(e.getMessage());}});}
    private static final class DatabaseFacts {final Set<String> references=new HashSet<>();String generation,operation,hash;}
    private DatabaseFacts facts()throws IOException {schema();File file=getContext().getDatabasePath("recipioSQLite.db");DatabaseFacts facts=new DatabaseFacts();try(SQLiteDatabase db=SQLiteDatabase.openDatabase(file.getPath(),null,SQLiteDatabase.OPEN_READONLY)){
        for(String sql:new String[]{"SELECT cover_path FROM recipes WHERE cover_path IS NOT NULL","SELECT image_path FROM recipe_steps WHERE image_path IS NOT NULL","SELECT finished_photo_path FROM cooking_records WHERE finished_photo_path IS NOT NULL"})try(Cursor c=db.rawQuery(sql,null)){while(c.moveToNext())facts.references.add(c.getString(0));}
        try(Cursor c=db.rawQuery("SELECT before_json,after_json FROM recipe_changes",null)){while(c.moveToNext())for(int column=0;column<2;column++){JSONObject snapshot=new JSONObject(c.getString(column));Object cover=snapshot.get("coverPath");if(cover!=JSONObject.NULL){if(!(cover instanceof String))throw new IOException("历史图片引用损坏");facts.references.add((String)cover);}JSONArray steps=snapshot.getJSONArray("steps");for(int i=0;i<steps.length();i++){Object path=steps.getJSONObject(i).get("imagePath");if(path!=JSONObject.NULL){if(!(path instanceof String))throw new IOException("历史步骤引用损坏");facts.references.add((String)path);}}}}
        try(Cursor c=db.rawQuery("SELECT operation_id,generation_id,data_sha256 FROM backup_restore_state WHERE id=1",null)){if(c.moveToFirst()){facts.operation=c.getString(0);facts.generation=c.getString(1);facts.hash=c.getString(2);if(!LocalBackupSession.uuid(facts.operation)||!LocalBackupSession.uuid(facts.generation)||!facts.hash.matches("[a-f0-9]{64}"))throw new IOException("恢复提交记录损坏");}}
        return facts;
    }catch(JSONException|RuntimeException e){throw new IOException("数据库或历史记录无法核查，不删除任何图片",e);}}
    @PluginMethod public void verifyPaths(PluginCall call) {worker.execute(()->{try{for(String path:paths(call))LocalBackupArchive.mediaFile(root(),path);call.resolve();}catch(Exception e){call.reject("图片引用无法读取，请保留数据并重试核查");}});}
    @PluginMethod public void discard(PluginCall call) {finish(call,false);}
    @PluginMethod public void finishOperation(PluginCall call) {finish(call,Boolean.TRUE.equals(call.getBoolean("committed",false)));}
    private void finish(PluginCall call,boolean committed) {run(call,"cleanup",s->{IOException incomplete=null;if(s.mode.equals("export")&&exportUri!=null&&exportState!=null)try{exportState.discard(()->DocumentsContract.deleteDocument(getContext().getContentResolver(),exportUri));}catch(IOException e){incomplete=e;}DatabaseFacts f=facts();if(committed&&(!s.token.equals(f.operation)||!Objects.equals(s.generation,f.generation)||!Objects.equals(s.dataHash,f.hash)))throw new IOException("尚不能确认恢复提交，保留全部文件");s.cleanup(f.references,f.generation,s.mode.equals("export")&&!committed);synchronized(this){active=null;restore=null;sourceAssets=null;exportUri=null;exportState=null;}if(incomplete!=null)throw incomplete;return new JSObject();});}
    @PluginMethod public void cleanupOrphans(PluginCall call) {
        synchronized(this){if(busy||choosing){call.reject("操作正在进行");return;}busy=true;phase="reconciling";}
        worker.execute(()->{
            try {
                DatabaseFacts f=facts();
                for(LocalBackupSession s:LocalBackupSession.pending(root()))s.cleanup(f.references,f.generation,s.mode.equals("export"));
                synchronized(this){active=null;}
            } catch(Exception e) {
                releaseWork();
                call.reject(e.getMessage());
                return;
            }
            releaseWork();
            call.resolve();
        });
    }
    @PluginMethod public void status(PluginCall call) {synchronized(this){JSObject out=new JSObject().put("phase",phase);if(active!=null)out.put("token",active.token);call.resolve(out);}}
    @Override protected void handleOnDestroy(){worker.shutdown();}
}
