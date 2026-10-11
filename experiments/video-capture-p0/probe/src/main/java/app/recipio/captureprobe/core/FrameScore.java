package app.recipio.captureprobe.core;
public final class FrameScore {
    public final boolean useful;
    public final double clarity;
    public final long hash;
    private FrameScore(boolean useful,double clarity,long hash){this.useful=useful;this.clarity=clarity;this.hash=hash;}
    public static FrameScore measure(int[] pixels,int width,int height) {
        if(width<8||height<8||width>2048||height>2048||(long)width*height!=pixels.length)throw new IllegalArgumentException("pixels");
        double sum=0,squared=0,edge=0; int dark=0;
        // Only 64x64 luma samples; no duplicate full-size working array.
        int[] small=new int[4096];
        for(int y=0;y<64;y++)for(int x=0;x<64;x++){
            int color=pixels[(y*(height-1)/63)*width+x*(width-1)/63];
            int l=(77*((color>>>16)&255)+150*((color>>>8)&255)+29*(color&255))>>>8;
            small[y*64+x]=l;sum+=l;squared+=(double)l*l;if(l<=8)dark++;
            if(x>0)edge+=Math.abs(l-small[y*64+x-1]);
            if(y>0)edge+=Math.abs(l-small[(y-1)*64+x]);
        }
        double variance=squared/4096-Math.pow(sum/4096,2);
        // Conservative exact-pixel fingerprint: even small caption changes remain candidates.
        long hash=0xcbf29ce484222325L;
        for(int color:pixels){hash^=color;hash*=0x100000001b3L;}
        return new FrameScore(dark<4014 && variance>=4,edge/8064,hash);
    }
}
