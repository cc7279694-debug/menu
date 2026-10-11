package app.recipio.captureprobe.core;
import org.junit.*;
import org.junit.rules.TemporaryFolder;
import java.io.*;
import java.util.*;
import static org.junit.Assert.*;

/** Bugs guarded: cache overflow, path escape, early deletion, exposing unselected frames. */
public class VisualStorageTest {
    @Rule public TemporaryFolder tmp=new TemporaryFolder();
    @Test public void overBudgetWritePublishesNeitherFile() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot(),VisualFiles.SHARE_RESERVE_BYTES+20);
        f.storeCandidate(0,new byte[10],new byte[5]);
        try{f.storeCandidate(1,new byte[5],new byte[1]);fail();}catch(IOException expected){}
        assertTrue(f.candidate(0).isFile());assertFalse(f.candidate(1).exists());assertEquals(15,f.bytes());
    }
    @Test public void candidateWriteCannotOverwriteAnEarlierFrame() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());f.storeCandidate(0,new byte[]{1},new byte[]{2});
        try{f.storeCandidate(0,new byte[]{9},new byte[]{9});fail();}catch(IOException expected){}
        assertEquals(1,firstByte(f.candidate(0)));
    }
    @Test public void shareCopiesOnlyChosenImagesInUserOrderAndSurvivesColdStart() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());
        for(int i=0;i<3;i++)f.storeCandidate(i,new byte[]{(byte)(i+1)},new byte[]{0});
        List<File> shared=f.share(Arrays.asList(2,0),1000);
        assertEquals(2,shared.size()); assertEquals(3,firstByte(shared.get(0)));
        assertEquals(1,firstByte(shared.get(1)));
        VisualFiles restarted=new VisualFiles(tmp.getRoot());restarted.coldStart(1001);
        assertFalse(restarted.candidate(0).exists());
        assertTrue(restarted.readAllowed(shared.get(0).getName(),1001));
        assertFalse(restarted.readAllowed("c-1.jpg",1001));
        restarted.prune(1000+VisualFiles.LEASE_MILLIS);
        assertFalse(shared.get(0).exists()); assertEquals(0,restarted.bytes());
    }
    @Test public void shareRejectsEmptySevenDuplicateAndMissingImages() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());f.storeCandidate(0,new byte[]{1},new byte[]{2});
        for(List<Integer> ids:Arrays.asList(Collections.<Integer>emptyList(),Arrays.asList(0,0),Arrays.asList(9),Arrays.asList(0,1,2,3,4,5,6))) {
            try{f.share(ids,1);fail();}catch(IOException expected){}
        }
        assertEquals(2,f.bytes());
    }
    @Test public void shareFailureKeepsCandidatesAndRemovesPartialExports() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot(),VisualFiles.SHARE_RESERVE_BYTES+20);f.storeCandidate(0,new byte[10],new byte[]{1});
        // Simulate unrelated cache pressure after collection; export failure must remain non-destructive.
        File pressure=new File(f.candidate(0).getParentFile(),"budget-pressure.bin");
        try(FileOutputStream out=new FileOutputStream(pressure)){out.write(new byte[(int)VisualFiles.SHARE_RESERVE_BYTES+5]);}
        long before=f.bytes();
        try{f.share(Arrays.asList(0),1);fail();}catch(IOException expected){}
        assertEquals(before,f.bytes());assertTrue(f.candidate(0).isFile());
    }
    @Test public void metadataAndTraversalCannotBeShared() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());
        assertFalse(f.readAllowed("../secret.jpg",1));assertFalse(f.readAllowed("anything.lease",1));
        try{f.candidate(-1);fail();}catch(IOException expected){}
        try{f.candidate(120);fail();}catch(IOException expected){}
    }
    @Test public void explicitDeleteRemovesExportsButNotOtherAppsOrCacheFolders() throws Exception {
        File sentinel=new File(tmp.getRoot(),"other-cache.txt");try(FileOutputStream o=new FileOutputStream(sentinel)){o.write(3);}
        VisualFiles f=new VisualFiles(tmp.getRoot());f.storeCandidate(0,new byte[]{1},new byte[]{2});
        File shared=f.share(Arrays.asList(0),1).get(0);f.clearAll();
        assertFalse(shared.exists());assertTrue(sentinel.isFile());assertEquals(0,f.bytes());
    }
    @Test public void timeRollbackDoesNotExtendALease() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());f.storeCandidate(0,new byte[]{1},new byte[]{2});
        File shared=f.share(Arrays.asList(0),1000).get(0);
        assertFalse(f.readAllowed(shared.getName(),999));assertTrue(f.readAllowed(shared.getName(),1000));
        assertFalse(f.readAllowed(shared.getName(),1000+VisualFiles.LEASE_MILLIS));
    }
    @Test public void compressionBufferFailsBeforeGrowingPastHardLimit() throws Exception {
        BoundedBytes b=new BoundedBytes(4);b.write(new byte[]{1,2,3,4});
        assertArrayEquals(new byte[]{1,2,3,4},b.bytes());
        try{b.write(5);fail();}catch(IOException expected){}
        assertThrows(IOException.class,()->b.bytes());
    }
    @Test public void overflowedEncoderCannotPublishItsPartialPayload() throws Exception {
        BoundedBytes b=new BoundedBytes(4);b.write(new byte[]{1,2});
        try{b.write(new byte[]{3,4,5});fail();}catch(IOException expected){}
        assertThrows(IOException.class,()->b.bytes());
    }
    @Test public void fullCandidateBudgetStillAllowsSixOrderedExportsWithPreviousLiveLease() throws Exception {
        VisualFiles f=new VisualFiles(tmp.getRoot());
        byte[] jpeg=new byte[1024*1024],thumb=new byte[1024];
        int saved=fillUntilBudget(f,jpeg,thumb);
        assertTrue(saved>=6&&saved<120);
        List<Integer> order=Arrays.asList(5,3,1,4,0,2);
        List<File> first=f.share(order,1000);
        assertEquals(6,first.size());assertTrue(f.bytes()<=VisualFiles.MAX_BYTES);
        f.clearCandidates();
        assertTrue(fillUntilBudget(f,jpeg,thumb)>=6);
        List<File> second=f.share(order,1001);
        assertEquals(6,second.size());assertTrue(f.bytes()<=VisualFiles.MAX_BYTES);
        for(File file:first)assertTrue(f.readAllowed(file.getName(),1001));
    }
    private static int fillUntilBudget(VisualFiles f,byte[] jpeg,byte[] thumb)throws IOException{
        int saved=0;
        for(int id=0;id<120;id++){
            jpeg[0]=(byte)id;
            try{f.storeCandidate(id,jpeg,thumb);saved++;}catch(IOException budget){break;}
        }
        return saved;
    }
    private static int firstByte(File file)throws IOException{try(FileInputStream in=new FileInputStream(file)){return in.read();}}
}
