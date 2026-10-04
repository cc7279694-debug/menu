package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.Files;
import java.util.*;
import org.json.*;
import org.junit.*;
import org.junit.rules.TemporaryFolder;

public class LocalBackupSessionTest {
    @Rule public TemporaryFolder folder=new TemporaryFolder();
    @Test public void committedGenerationAndHistoricalReferencesSurviveCleanup()throws Exception {
        File root=folder.newFolder(); assertTrue(new File(root,"images").mkdir());
        for(boolean committed:new boolean[]{true,false}){
            LocalBackupSession s=LocalBackupSession.create(root,"restore");String g=UUID.randomUUID().toString();s.registerGeneration(g,"a".repeat(64));s.journal("staged",g,s.dataHash);
            File images=new File(root,"images/generation-"+g);assertTrue(images.mkdir());File image=new File(images,"a".repeat(64)+".png");Files.write(image.toPath(),new byte[]{1});
            s.cleanup(committed?Collections.emptySet():Collections.singleton("images/generation-"+g+"/"+image.getName()),committed?g:null,false);
            assertTrue(image.exists());assertFalse(s.directory.exists());
        }
    }
    @Test public void uncommittedStagingIsRemovedButUnrelatedImagesStay()throws Exception {
        File root=folder.newFolder();assertTrue(new File(root,"images").mkdir());File old=new File(root,"images/old.png");Files.write(old.toPath(),new byte[]{9});
        LocalBackupSession s=LocalBackupSession.create(root,"restore");String g=UUID.randomUUID().toString();s.registerGeneration(g,"b".repeat(64));
        File staged=new File(root,"images/generation-"+g);assertTrue(staged.mkdir());s.cleanup(Collections.emptySet(),null,false);
        assertFalse(staged.exists());assertArrayEquals(new byte[]{9},Files.readAllBytes(old.toPath()));
    }
    @Test public void crashBeforePublishingOperationCanBeCleanedWithoutGuessingGeneration()throws Exception {
        File root=folder.newFolder();File base=new File(root,"backup-work");assertTrue(base.mkdir());File dir=new File(base,UUID.randomUUID().toString());assertTrue(dir.mkdir());
        Files.write(new File(dir,"operation.json.part").toPath(),"partial".getBytes());
        for(LocalBackupSession s:LocalBackupSession.pending(root))s.cleanup(Collections.emptySet(),null,true);
        assertFalse(dir.exists());
    }
    @Test public void interruptedExportIsNotRetainedAsAValidBackup()throws Exception {
        File root=folder.newFolder();LocalBackupSession s=LocalBackupSession.create(root,"export");Files.write(new File(s.directory,"output.recipio").toPath(),new byte[]{1,2,3});
        s.cleanup(Collections.emptySet(),null,true);assertFalse(s.directory.exists());
    }
    @Test public void validPrivateExportIsRetainedAndCorruptPublishedJournalFailsClosed()throws Exception {
        File root=folder.newFolder();LocalBackupSession s=LocalBackupSession.create(root,"export");
        JSONObject empty=new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"settings\":{}}");
        LocalBackupArchive.write(new File(s.directory,"output.recipio"),empty,Collections.emptyList(),"test",7,3);s.cleanup(Collections.emptySet(),null,true);
        assertNotNull(LocalBackupArchive.validate(new File(root,"backups/pending-export-"+s.token+".recipio")));
        LocalBackupSession r=LocalBackupSession.create(root,"restore");Files.write(new File(r.directory,"operation.json").toPath(),"bad".getBytes());
        assertThrows(IOException.class,()->LocalBackupSession.pending(root));assertTrue(r.directory.exists());
    }
}
