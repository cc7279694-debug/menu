package app.recipio.local;

import java.util.*;

/** Bounded, unscaled source rectangles. Never omit the tail to fit a slot budget. */
final class AiLongImagePlan {
    static final int MAX_EDGE=2048,OVERLAP=64,MAX_DECODED_PIXELS=4194304;
    static final class Region {
        final int left=0,top,right,bottom;
        Region(int width,int top,int bottom){this.top=top;right=width;this.bottom=bottom;}
    }
    static void requireDecodeBudget(long pixels,long availableHeap)throws AiFailure {
        if(pixels<=0||pixels>MAX_DECODED_PIXELS||availableHeap<pixels*8+8L*1024*1024)throw new AiFailure("long_image_limit");
    }
    static List<Region> create(int width,int height,int slots)throws AiFailure {
        if(width<=10||height<=10||Math.max(width,height)>(long)Math.min(width,height)*200)throw new AiFailure("image_invalid");
        if((long)width*height>32000000)throw new AiFailure("image_too_large");
        if(slots<1||slots>6||width>MAX_EDGE)throw new AiFailure("long_image_limit");
        List<Region> result=new ArrayList<>();
        for(int top=0;;){
            if(result.size()==slots)throw new AiFailure("long_image_limit");
            int bottom=(int)Math.min((long)height,(long)top+MAX_EDGE);
            if((long)width*(bottom-top)>MAX_DECODED_PIXELS)throw new AiFailure("long_image_limit");
            result.add(new Region(width,top,bottom));
            if(bottom==height)return Collections.unmodifiableList(result);
            top=bottom-OVERLAP;
        }
    }
}
