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
        private File file(Uri uri)throws FileNotFoundException {String id=uri.getLastPathSegment();if(!LocalBackupSession.uuid(id))throw new FileNotFoundException("invalid test id");return new File(getContext().getCacheDir(),"backup-provider-"+id);}
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
        @Override public int delete(Uri u,String s,String[] a){try{return file(u).delete()?1:0;}catch(IOException e){return 0;}}
        @Override public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
    }
    @Before public void setup()throws Exception {
        root=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"backup-tests-"+UUID.randomUUID());assertTrue(root.mkdir());
        resolver=InstrumentationRegistry.getInstrumentation().getTargetContext().getContentResolver();uri=Uri.parse("content://app.recipio.local.test.backup-test/"+UUID.randomUUID());
    }
    @After public void cleanup()throws Exception {resolver.delete(uri,null,null);LocalBackupArchive.deleteOwnedTree(root);}
    File source()throws Exception {
        JSONObject empty=new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"settings\":{}}");
        File file=new File(root,"complete.recipio");LocalBackupArchive.write(file,empty,Collections.emptyList(),"test",7,3);return file;
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
}
