package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.*;

public class AiLongImageBatchTest {
    private File cache;private UUID operation;
    private AiTemporaryImages.Processed image(int marker){return new AiTemporaryImages.Processed(new byte[]{(byte)marker},1080,2048);}
    private AiTemporaryImages store(AiTemporaryImages.LongProcessor process)throws Exception {AiTemporaryImages result=new AiTemporaryImages(cache,System::currentTimeMillis,(f,m)->image(9),process);result.create(operation);return result;}
    private InputStream input(){return new ByteArrayInputStream(new byte[]{1,2,3});}
    private List<AiTemporaryImages.Image> add(AiTemporaryImages images)throws Exception {return images.importLongStream(operation,input(),"image/png",()->{});}
    @Before public void setup()throws Exception {cache=Files.createTempDirectory("recipio-generated-n2-").toFile();operation=UUID.randomUUID();}
    @After public void cleanup()throws Exception {try(java.util.stream.Stream<Path> walk=Files.walk(cache.toPath())){walk.sorted(Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(IOException e){throw new UncheckedIOException(e);}});}}
    private long jpgs(){return Objects.requireNonNull(new File(cache,"ai-import/"+operation).listFiles((d,n)->n.endsWith(".jpg"))).length;}
    private long sources(){return Objects.requireNonNull(new File(cache,"ai-import/"+operation).listFiles((d,n)->n.endsWith(".source.part"))).length;}
    @Test public void successfulBatchPublishesAllInOrderAndDeletesSource()throws Exception {
        AiTemporaryImages images=store((f,m,left,check,sink)->{assertEquals(6,left);sink.add(image(1));sink.add(image(2));sink.add(image(3));});
        List<AiTemporaryImages.Image> added=add(images);assertEquals(3,added.size());assertEquals(3,jpgs());assertEquals(0,sources());
        images.withPinnedImages(operation,Arrays.asList(UUID.fromString(added.get(2).id),UUID.fromString(added.get(0).id)),selected->{assertEquals(3,selected.get(0).bytes[0]);assertEquals(1,selected.get(1).bytes[0]);return null;});
        images.discard(operation);assertFalse(new File(cache,"ai-import/"+operation).exists());
    }
    @Test public void failingSecondSegmentPreservesExistingImageAndNoBatchFiles()throws Exception {
        AiTemporaryImages images=store((f,m,left,check,sink)->{assertEquals(5,left);sink.add(image(1));throw new AiFailure("image_invalid");});
        AiTemporaryImages.Image old=images.importStream(operation,input(),"image/png");
        assertEquals("image_invalid",assertThrows(AiFailure.class,()->add(images)).code);assertEquals(1,jpgs());assertEquals(0,sources());
        assertEquals(9,(int)images.withPinnedImages(operation,Collections.singletonList(UUID.fromString(old.id)),selected->(int)selected.get(0).bytes[0]));
        images.remove(operation,UUID.fromString(old.id));assertEquals(0,jpgs());
    }
    @Test public void cancellationAfterAStageRollsBackWholeBatchAndReleasesPin()throws Exception {
        AtomicBoolean cancel=new AtomicBoolean();AiTemporaryImages images=store((f,m,left,check,sink)->{sink.add(image(1));cancel.set(true);check.check();sink.add(image(2));});
        assertEquals("cancelled",assertThrows(AiFailure.class,()->images.importLongStream(operation,input(),"image/png",()->{if(cancel.get())throw new AiFailure("cancelled");})).code);
        assertEquals(0,jpgs());assertEquals(0,sources());images.importStream(operation,input(),"image/png");assertEquals(1,jpgs());
    }
    @Test public void insufficientSlotsAndOversizeOutputsDoNotKeepPartialBatch()throws Exception {
        AiTemporaryImages images=store((f,m,left,check,sink)->{for(int i=0;i<left+1;i++)sink.add(image(i));});
        final AiTemporaryImages full=images;assertEquals("long_image_limit",assertThrows(AiFailure.class,()->add(full)).code);assertEquals(0,jpgs());assertEquals(0,sources());
        images.discard(operation);operation=UUID.randomUUID();images=store((f,m,left,check,sink)->sink.add(new AiTemporaryImages.Processed(new byte[1024*1024+1],1080,2048)));
        final AiTemporaryImages large=images;assertEquals("image_too_large",assertThrows(AiFailure.class,()->add(large)).code);assertEquals(0,jpgs());assertEquals(0,sources());
    }
    @Test public void batchReservationBlocksConcurrentMutationsAndStagingCleanup()throws Exception {
        AiTemporaryImages[] owner=new AiTemporaryImages[1];owner[0]=store((f,m,left,check,sink)->{
            sink.add(image(1));assertEquals("busy",assertThrows(AiFailure.class,()->owner[0].importStream(operation,input(),"image/png")).code);
            assertEquals("busy",assertThrows(AiFailure.class,()->owner[0].withPinnedImages(operation,Collections.emptyList(),selected->null)).code);
            assertEquals("busy",assertThrows(AiFailure.class,()->owner[0].remove(operation,UUID.randomUUID())).code);
            assertFalse(owner[0].cleanupAbandoned());assertTrue(f.isFile());assertEquals(1,jpgs());sink.add(image(2));
        });
        assertEquals(2,add(owner[0]).size());assertEquals(2,jpgs());assertEquals(0,sources());
    }
    @Test public void discardDuringProcessingRollsBackOwnedBatchAndKeepsOtherSession()throws Exception {
        AiTemporaryImages[] owner=new AiTemporaryImages[1];owner[0]=store((f,m,left,check,sink)->{sink.add(image(1));owner[0].discard(operation);check.check();});
        UUID other=UUID.randomUUID();owner[0].create(other);AiTemporaryImages.Image old=owner[0].importStream(other,input(),"image/png");
        assertEquals("stale_session",assertThrows(AiFailure.class,()->add(owner[0])).code);
        assertFalse(new File(cache,"ai-import/"+operation).exists());
        assertEquals(9,(int)owner[0].withPinnedImages(other,Collections.singletonList(UUID.fromString(old.id)),selected->(int)selected.get(0).bytes[0]));
        owner[0].discard(other);
    }
    @Test public void sourceByteLimitRejectsBeforeProcessorAndLeavesNothing()throws Exception {
        AtomicBoolean processed=new AtomicBoolean();AiTemporaryImages images=store((f,m,left,check,sink)->processed.set(true));
        InputStream oversized=new InputStream(){int left=15*1024*1024+1;@Override public int read(){if(left==0)return -1;left--;return 0;}@Override public int read(byte[] b,int off,int len){if(left==0)return -1;int n=Math.min(left,len);Arrays.fill(b,off,off+n,(byte)0);left-=n;return n;}};
        assertEquals("image_too_large",assertThrows(AiFailure.class,()->images.importLongStream(operation,oversized,"image/png",()->{})).code);
        assertFalse(processed.get());assertEquals(0,jpgs());assertEquals(0,sources());
    }
    @Test public void threadInterruptionCancelsAndReleasesBatchReservation()throws Exception {
        AiTemporaryImages images=store((f,m,left,check,sink)->{sink.add(image(1));Thread.currentThread().interrupt();check.check();});
        try{assertEquals("cancelled",assertThrows(AiFailure.class,()->add(images)).code);}finally{Thread.interrupted();}
        assertEquals(0,jpgs());assertEquals(0,sources());images.importStream(operation,input(),"image/png");assertEquals(1,jpgs());
    }
}
