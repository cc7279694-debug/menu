package app.recipio.captureprobe.core;
import java.util.*;
public final class FrameSuggestions {
    private FrameSuggestions() { }
    public static List<VisualFrame> choose(List<VisualFrame> frames) {
        List<VisualFrame> ordered=new ArrayList<>(frames);ordered.sort(Comparator.comparingLong(f->f.millis));
        List<VisualFrame> usable=new ArrayList<>();VisualFrame previous=null;
        for(VisualFrame f:ordered){
            if(f.useful && (previous==null || previous.hash!=f.hash))usable.add(f);
            previous=f;
        }
        if(usable.size()<=6)return usable;
        long start=ordered.get(0).millis,span=Math.max(1,ordered.get(ordered.size()-1).millis-start+1);
        VisualFrame[] buckets=new VisualFrame[6];
        for(VisualFrame f:usable){
            int b=(int)Math.min(5,(f.millis-start)*6/span);
            if(buckets[b]==null||f.clarity>buckets[b].clarity)buckets[b]=f;
        }
        List<VisualFrame> result=new ArrayList<>();for(VisualFrame f:buckets)if(f!=null)result.add(f);
        return result;
    }
}
