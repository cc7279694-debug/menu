package app.recipio.captureprobe.core;

import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;

/** Bugs guarded: over-capture, duplicate/black suggestions, lost selection ordering. */
public class VisualPolicyTest {
    @Test public void visualDeadlineRejectsSampleAt120Seconds() {
        CaptureLifecycle c = new CaptureLifecycle(0, 120000);
        long id=c.beginConsent(); c.grant(id,100); c.started(id);
        assertTrue(c.maySample(id,120099)); assertFalse(c.maySample(id,120100));
    }
    @Test public void samplerNeverBackfillsOrCapturesMoreThanOncePerSecond() {
        VisualSampler s=new VisualSampler(100);
        assertEquals(0,s.take(100)); assertEquals(-1,s.take(101));
        assertEquals(1,s.take(5100)); assertEquals(-1,s.take(5101));
        assertEquals(2,s.take(6100)); assertEquals(-1,s.take(99));
        assertEquals(-1,s.take(120100));
    }
    @Test public void samplerCapsCandidateCountAndReportsRealTime() {
        VisualSampler s=new VisualSampler(100);
        for(int i=0;i<120;i++)assertEquals(i,s.take(100+i*1000));
        assertEquals(-1,s.take(120100)); assertEquals(120,s.count());
    }
    @Test public void blackAndUniformFramesAreNotSuggested() {
        int[] black=new int[64*64], white=new int[64*64]; Arrays.fill(white,0xffffffff);
        assertFalse(FrameScore.measure(black,64,64).useful);
        assertFalse(FrameScore.measure(white,64,64).useful);
        int[] pattern=pattern(); assertTrue(FrameScore.measure(pattern,64,64).useful);
    }
    @Test public void suggestionsCoverSixSegmentsInOrderAndAreDeterministic() {
        List<VisualFrame> frames=new ArrayList<>();
        for(int i=0;i<12;i++) frames.add(frame(i,i*1000,i,10+i));
        List<Integer> expected=Arrays.asList(1,3,5,7,9,11);
        assertEquals(expected,ids(FrameSuggestions.choose(frames)));
        assertEquals(expected,ids(FrameSuggestions.choose(frames)));
    }
    @Test public void adjacentIdenticalScreensAreCollapsedButDistantRevisitIsAllowed() {
        List<VisualFrame> frames=Arrays.asList(frame(0,0,1,10),frame(1,1000,1,20),frame(2,2000,2,10),frame(3,3000,1,10));
        assertEquals(Arrays.asList(0,2,3),ids(FrameSuggestions.choose(frames)));
    }
    @Test public void sharpCandidateWinsSameBucketButBlurIsStillManuallyAvailable() {
        List<VisualFrame> frames=new ArrayList<>();
        for(int i=0;i<12;i++)frames.add(frame(i,i*1000,i,i==1?90:i+1));
        assertEquals(Arrays.asList(1,3,5,7,9,11),ids(FrameSuggestions.choose(frames)));
        assertEquals(12,frames.size());
    }
    @Test public void measuredSharpnessBeatsGeneratedBlurAndDrivesSuggestions() {
        int[] sharp=pattern(),blur=new int[4096];
        for(int y=0;y<64;y++)for(int x=0;x<64;x++){
            int sum=0,count=0;
            for(int dy=-2;dy<=2;dy++)for(int dx=-2;dx<=2;dx++){
                int px=Math.max(0,Math.min(63,x+dx)),py=Math.max(0,Math.min(63,y+dy));
                sum+=sharp[py*64+px]&255;count++;
            }
            int gray=sum/count;blur[y*64+x]=0xff000000|gray<<16|gray<<8|gray;
        }
        FrameScore a=FrameScore.measure(sharp,64,64),b=FrameScore.measure(blur,64,64);
        assertTrue(a.useful&&b.useful);assertTrue(a.clarity>b.clarity);
        List<VisualFrame> frames=new ArrayList<>();
        frames.add(frame(0,0,b.hash,b.clarity));frames.add(frame(1,1000,a.hash,a.clarity));
        for(int i=2;i<12;i++)frames.add(frame(i,i*1000,i,1));
        assertEquals(Integer.valueOf(1),ids(FrameSuggestions.choose(frames)).get(0));
    }
    @Test public void selectionCapsSixRejectsDuplicatesAndPreservesUserOrdering() {
        FrameSelection s=new FrameSelection();
        for(int i=0;i<6;i++)assertTrue(s.add(i));
        assertFalse(s.add(6)); assertFalse(s.add(0)); assertTrue(s.shareable());
        s.move(5,-1); assertEquals(Arrays.asList(0,1,2,3,5,4),s.ids());
        s.remove(2); assertTrue(s.replace(1,9));
        assertEquals(Arrays.asList(0,9,3,5,4),s.ids());
        assertFalse(s.replace(0,9));
    }
    @Test public void emptySelectionCannotShareAndSnapshotCannotMutateSelection() {
        FrameSelection s=new FrameSelection(); assertFalse(s.shareable());
        s.add(7); List<Integer> copy=s.ids();copy.clear(); assertEquals(Arrays.asList(7),s.ids());
        s.remove(7);assertFalse(s.shareable());
    }
    @Test public void invalidDimensionsAreRejectedBeforePixelAllocation() {
        try{FrameScore.measure(new int[1],50000,50000);fail();}catch(IllegalArgumentException expected){}
    }
    private static int[] pattern(){int[] p=new int[4096];for(int y=0;y<64;y++)for(int x=0;x<64;x++)p[y*64+x]=((x+y)%8<4)?0xff222222:0xffeeeeee;return p;}
    private static VisualFrame frame(int id,long t,long hash,double clarity){return new VisualFrame(id,t,hash,clarity,true);}
    private static List<Integer> ids(List<VisualFrame> f){List<Integer> ids=new ArrayList<>();for(VisualFrame v:f)ids.add(v.id);return ids;}
}
