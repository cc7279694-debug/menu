package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;
import org.junit.*;

public class ShareMediaFilesTest {
    private File cache;
    @Before public void before() throws Exception { cache=Files.createTempDirectory("recipio-share-fixture-").toFile(); }
    @After public void after() throws Exception {try(java.util.stream.Stream<Path> paths=Files.walk(cache.toPath())){for(Path p:paths.sorted(Comparator.reverseOrder()).toArray(Path[]::new))Files.deleteIfExists(p);}}
    private Object store() throws Exception {
        Class<?> type=null;try{type=Class.forName("app.recipio.local.ShareMediaFiles");}catch(ClassNotFoundException ignored){}
        assertNotNull("Native share staging ownership implementation is missing",type);
        Constructor<?> c=type.getDeclaredConstructor(File.class);c.setAccessible(true);return c.newInstance(cache);
    }
    private Object call(Object target,String name,Class<?>[] args,Object... values) throws Exception {
        Method m=target.getClass().getDeclaredMethod(name,args);m.setAccessible(true);
        try{return m.invoke(target,values);}catch(InvocationTargetException e){Throwable cause=e.getCause();if(cause instanceof Exception)throw (Exception)cause;throw e;}
    }
    private File begin(Object target,UUID id) throws Exception {return (File)call(target,"begin",new Class[]{UUID.class},id);}
    private boolean lease(Object target,UUID id)throws Exception{return (boolean)call(target,"lease",new Class[]{UUID.class},id);}
    private void release(Object target,UUID id)throws Exception{call(target,"release",new Class[]{UUID.class},id);}
    private void ready(Object target,UUID id,int count)throws Exception{
        String[] names=new String[count];int[] widths=new int[count],heights=new int[count];
        File dir=new File(cache,"share-inbox/"+id);
        for(int i=0;i<count;i++){names[i]=UUID.randomUUID()+".jpg";widths[i]=200;heights[i]=100;Files.write(new File(dir,names[i]).toPath(),new byte[]{(byte)255,(byte)216,(byte)255,(byte)217});}
        call(target,"complete",new Class[]{UUID.class,String[].class,int[].class,int[].class},id,names,widths,heights);
    }
    // Catches missing process ownership or an early lease that exposes unfinished bytes.
    @Test public void pendingMustBeCompleteBeforeLeaseAndReleaseDeletesOnlyThatReceipt()throws Exception{
        Object target=store();UUID first=UUID.randomUUID(),second=UUID.randomUUID();File a=begin(target,first),b=begin(target,second);
        assertFalse(lease(target,first));ready(target,first,1);assertTrue(lease(target,first));assertFalse(lease(target,first));
        release(target,first);assertFalse(a.exists());assertTrue(b.exists());release(target,first);
    }
    // Catches deleting active staging during Activity recreation / repeated cleanup.
    @Test public void cleanupPreservesCurrentOwnershipAndDeletesMarkedCrashOrphan()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();File owned=begin(target,id);ready(target,id,1);
        File orphan=new File(cache,"share-inbox/"+UUID.randomUUID());assertTrue(orphan.mkdir());Files.write(new File(orphan,".share").toPath(),new byte[]{1});
        Files.write(new File(orphan,UUID.randomUUID()+".source.part").toPath(),new byte[]{1});
        call(target,"cleanupAbandoned",new Class[]{});assertTrue(owned.exists());assertFalse(orphan.exists());
    }
    // Catches unsafe broad cleanup of unrecognized directories or files.
    @Test public void cleanupNeverFollowsSymlinkOrDeletesUnknownFiles()throws Exception{
        Object target=store();File unrelated=new File(cache,"images");assertTrue(unrelated.mkdir());
        File unknown=new File(cache,"share-inbox/"+UUID.randomUUID());assertTrue(unknown.mkdir());Files.write(new File(unknown,"keep.txt").toPath(),new byte[]{1});
        call(target,"cleanupAbandoned",new Class[]{});assertTrue(unknown.exists());assertTrue(unrelated.exists());
        UUID id=UUID.randomUUID();File owned=begin(target,id);Files.write(new File(owned,"keep.txt").toPath(),new byte[]{1});
        assertThrows(AiFailure.class,()->release(target,id));assertTrue(new File(owned,"keep.txt").exists());
    }
    // Catches accepting zero/seven images or path traversal from an IPC response.
    @Test public void completeRejectsOutOfBoundsAndUnownedNames()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();begin(target,id);
        assertThrows(AiFailure.class,()->ready(target,id,0));assertThrows(AiFailure.class,()->ready(target,id,7));
        assertThrows(AiFailure.class,()->call(target,"complete",new Class[]{UUID.class,String[].class,int[].class,int[].class},id,new String[]{"../outside.jpg"},new int[]{200},new int[]{100}));
        assertFalse(lease(target,id));
    }
    // Catches dropping sender ordering or exposing rejected image dimensions.
    @Test public void sixOrderedImagesAcceptedButOversizedOutputsAndTinyDimensionsRejected()throws Exception{
        Object target=store();UUID valid=UUID.randomUUID();begin(target,valid);ready(target,valid,6);assertTrue(lease(target,valid));
        List<?> images=(List<?>)call(target,"leasedImages",new Class[]{UUID.class},valid);assertEquals(6,images.size());
        UUID id=UUID.randomUUID();File dir=begin(target,id);String name=UUID.randomUUID()+".jpg";Files.write(new File(dir,name).toPath(),new byte[1024*1024+1]);
        assertThrows(AiFailure.class,()->call(target,"complete",new Class[]{UUID.class,String[].class,int[].class,int[].class},id,new String[]{name},new int[]{200},new int[]{100}));
        Files.write(new File(dir,name).toPath(),new byte[]{1});assertThrows(AiFailure.class,()->call(target,"complete",new Class[]{UUID.class,String[].class,int[].class,int[].class},id,new String[]{name},new int[]{10},new int[]{100}));
    }
    // Catches concurrent consumers duplicating one receipt, or release deleting pinned bytes mid-transfer.
    @Test public void oneTransferPinOnlyAndReleaseDefersDeletionUntilUnpin()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();File dir=begin(target,id);ready(target,id,1);assertTrue(lease(target,id));
        call(target,"pin",new Class[]{UUID.class},id);assertEquals("busy",assertThrows(AiFailure.class,()->call(target,"pin",new Class[]{UUID.class},id)).code);
        release(target,id);assertTrue(dir.exists());call(target,"unpin",new Class[]{UUID.class},id);assertFalse(dir.exists());
    }
    // Catches leaking ignored/replaced receipts after a temporary cleanup failure has recovered.
    @Test public void cleanupRetriesReleasedOwnershipAfterTransientFailure()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();File dir=begin(target,id);File unexpected=new File(dir,"protected-fixture.txt");assertTrue(unexpected.createNewFile());
        assertThrows(AiFailure.class,()->release(target,id));assertTrue(unexpected.delete());call(target,"cleanupAbandoned",new Class[]{});assertFalse(dir.exists());
    }
    private void releaseAcknowledged(Object target,UUID id,List<String> outcomes)throws Exception{
        Class<?> completion=null;try{completion=Class.forName("app.recipio.local.ShareMediaFiles$Completion");}catch(ClassNotFoundException ignored){}
        assertNotNull("Pinned release completion must be acknowledged after actual cleanup",completion);
        Object callback=Proxy.newProxyInstance(completion.getClassLoader(),new Class[]{completion},(proxy,method,args)->{if(method.getName().equals("finished"))outcomes.add((String)args[0]);return null;});
        call(target,"release",new Class[]{UUID.class,completion},id,callback);
    }
    // Catches acknowledging release while a transfer still owns bytes that have not been erased.
    @Test public void releaseAcknowledgementWaitsForLastPinActualDeletion()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();File dir=begin(target,id);ready(target,id,1);assertTrue(lease(target,id));call(target,"pin",new Class[]{UUID.class},id);
        List<String> outcomes=new ArrayList<>();releaseAcknowledged(target,id,outcomes);assertTrue(outcomes.isEmpty());assertTrue(dir.exists());
        call(target,"unpin",new Class[]{UUID.class},id);assertEquals(Collections.singletonList(null),outcomes);assertFalse(dir.exists());
    }
    // Catches losing the JS cleanup obligation when deletion fails only after the final transfer pin releases.
    @Test public void lastUnpinReportsDelayedCleanupFailureAndReleaseRetryCanRecover()throws Exception{
        Object target=store();UUID id=UUID.randomUUID();File dir=begin(target,id);ready(target,id,1);assertTrue(lease(target,id));call(target,"pin",new Class[]{UUID.class},id);
        File protectedFile=new File(dir,"protected-fixture.txt");assertTrue(protectedFile.createNewFile());List<String> outcomes=new ArrayList<>();releaseAcknowledged(target,id,outcomes);assertTrue(outcomes.isEmpty());
        assertEquals("storage_error",assertThrows(AiFailure.class,()->call(target,"unpin",new Class[]{UUID.class},id)).code);assertEquals(Collections.singletonList("storage_error"),outcomes);assertTrue(protectedFile.isFile());
        assertTrue(protectedFile.delete());releaseAcknowledged(target,id,outcomes);assertEquals(Arrays.asList("storage_error",null),outcomes);assertFalse(dir.exists());
    }
}
