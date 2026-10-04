package app.recipio.local;
import static org.junit.Assert.*;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.nio.file.Files;
import java.util.*;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
/** Android descriptor/provider boundary; real SAF UI is verified separately. */
@RunWith(AndroidJUnit4.class)
public class LocalBackupPluginTest {
    File root; ContentResolver resolver; Uri uri;
    public static class FileProvider extends ContentProvider {
        // This provider runs in the test APK's own process, without the target APK classloader.
        private File file(Uri uri)throws FileNotFoundException {String id=uri.getLastPathSegment();if(id==null||!id.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))throw new FileNotFoundException("invalid test id");return new File(getContext().getCacheDir(),"backup-provider-"+id);}
        @Override public boolean onCreate(){return true;}
        @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException {
            File file=file(uri);String fault=uri.getQueryParameter("fault");
            if(mode.equals("r")){if("read".equals(fault))throw new FileNotFoundException("read failure");if("corrupt".equals(fault))try{Files.write(file.toPath(),new byte[]{1,2,3});}catch(IOException e){throw new FileNotFoundException(e.getMessage());}}
            else if("write".equals(fault))throw new FileNotFoundException("write failure");
            return ParcelFileDescriptor.open(file,mode.equals("r")?ParcelFileDescriptor.MODE_READ_ONLY:ParcelFileDescriptor.MODE_WRITE_ONLY|ParcelFileDescriptor.MODE_CREATE|ParcelFileDescriptor.MODE_TRUNCATE);
        }
        @Override public Cursor query(Uri u,String[] p,String s,String[] a,String o){return null;}
        @Override public String getType(Uri u){return "application/octet-stream";}
        @Override public Uri insert(Uri u,ContentValues v){return null;}
        @Override public int delete(Uri u,String s,String[] a){if("delete".equals(u.getQueryParameter("fault")))return 0;try{return file(u).delete()?1:0;}catch(IOException e){return 0;}}
        @Override public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
    }
    @Before public void setup()throws Exception {
        root=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"backup-tests-"+UUID.randomUUID());assertTrue(root.mkdir());
        resolver=InstrumentationRegistry.getInstrumentation().getTargetContext().getContentResolver();uri=Uri.parse("content://app.recipio.local.test.backup-test/"+UUID.randomUUID());
    }
    @After public void cleanup()throws Exception {resolver.delete(uri,null,null);LocalBackupArchive.deleteOwnedTree(root);}
    File source()throws Exception {
        JSONObject empty=new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"cookingRecords\":[],\"settings\":{}}");
        File file=new File(root,"complete.recipio");LocalBackupArchive.write(file,empty,Collections.emptyList(),"test",11,4);return file;
    }
    @Test public void realAndroidPrivateDirectoryCanReopenItsOwnOperation()throws Exception {
        LocalBackupSession s=LocalBackupSession.create(root,"export");assertEquals("root="+root+" canonical="+root.getCanonicalPath(),s.token,LocalBackupSession.reopen(root,s.token).token);s.cleanup(Collections.emptySet(),null,false);
    }
    @Test public void actualDocumentStreamsRoundTripAndVerifyHash()throws Exception {
        File file=source();LocalBackupArchive.Validated result=LocalBackupDocuments.export(resolver,uri,file,new File(root,"readback.recipio"));
        assertEquals(LocalBackupArchive.hash(file),result.sha256);assertEquals(file.length(),result.size);
    }
    @Test public void providerReadWriteAndCorruptionFailuresDoNotRemovePrivateBackup()throws Exception {
        File file=source();String hash=LocalBackupArchive.hash(file);
        for(int defect=0;defect<3;defect++){
            Uri failing=uri.buildUpon().appendQueryParameter("fault",new String[]{"write","read","corrupt"}[defect]).build();
            final File readback=new File(root,"readback-"+defect+".recipio");
            assertThrows(IOException.class,()->LocalBackupDocuments.export(resolver,failing,file,readback));assertEquals(hash,LocalBackupArchive.hash(file));
        }
    }
    @Test public void publishedCommitProtectsMediaDespiteStaleJournal()throws Exception {
        LocalBackupSession s=LocalBackupSession.create(root,"restore");String g=UUID.randomUUID().toString();s.registerGeneration(g,"a".repeat(64));s.journal("staged",g,s.dataHash);
        assertTrue(new File(root,"images").mkdir());File dir=new File(root,"images/generation-"+g);assertTrue(dir.mkdir());File image=new File(dir,"a".repeat(64)+".png");Files.write(image.toPath(),new byte[]{9});
        LocalBackupSession.pending(root).get(0).cleanup(Collections.emptySet(),g,false);assertTrue(image.isFile());
    }
    @Test public void actualStagingSpaceFailureKeepsOldMedia()throws Exception {
        assertTrue(new File(root,"images").mkdir());String path="images/"+UUID.randomUUID()+".png";File old=new File(root,path);
        android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(2,2,android.graphics.Bitmap.Config.ARGB_8888);try(FileOutputStream out=new FileOutputStream(old)){assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}finally{bitmap.recycle();}
        String oldHash=LocalBackupArchive.hash(old);JSONObject data=new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"cookingRecords\":[],\"settings\":{}}");File archive=new File(root,"stage.recipio");LocalBackupArchive.write(archive,data,LocalBackupArchive.inspect(root,Collections.singletonList(path)),"test",11,4);
        File limited=new File(root.getPath()){@Override public long getUsableSpace(){return 0;}};String g=UUID.randomUUID().toString();
        assertThrows(IOException.class,()->LocalBackupArchive.stage(LocalBackupArchive.validate(archive),limited,g));assertEquals(oldHash,LocalBackupArchive.hash(old));assertFalse(new File(root,"images/generation-"+g).exists());
    }
    @Test public void realProviderDeletionFailureWarnsAndVerifiedDocumentIsRetained()throws Exception {
        File file=source();LocalBackupDocuments.export(resolver,uri,file,new File(root,"provider-readback.recipio"));
        Uri refusing=uri.buildUpon().appendQueryParameter("fault","delete").build();
        LocalBackupExportState incomplete=new LocalBackupExportState();IOException error=assertThrows(IOException.class,()->incomplete.discard(()->resolver.delete(refusing,null,null)>0));assertTrue(error.getMessage().contains("未完成的备份文件"));
        LocalBackupExportState verified=new LocalBackupExportState();verified.markVerified();verified.discard(()->resolver.delete(uri,null,null)>0);
        try(InputStream in=resolver.openInputStream(uri)){assertTrue(in.read()>=0);}
        incomplete.discard(()->resolver.delete(uri,null,null)>0);assertThrows(FileNotFoundException.class,()->resolver.openInputStream(uri));assertTrue(file.isFile());
    }
}
