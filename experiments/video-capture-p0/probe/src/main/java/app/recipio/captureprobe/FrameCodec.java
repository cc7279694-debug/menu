package app.recipio.captureprobe;

import android.graphics.Bitmap;
import app.recipio.captureprobe.core.BoundedBytes;
import java.io.IOException;

/** Sequential bounded compression. Caller owns the input; no pixel objects retained. */
final class FrameCodec {
    private FrameCodec(){}
    static int[] size(int width,int height,int maximum){
        if(width<1||height<1||maximum<1||maximum>2048)throw new IllegalArgumentException("dimensions");
        double scale=Math.min(1,(double)maximum/Math.max(width,height));
        return new int[]{Math.max(1,(int)(width*scale)),Math.max(1,(int)(height*scale))};
    }
    static byte[] jpeg(Bitmap original,int maximum,int bytes)throws IOException{
        int[] size=size(original.getWidth(),original.getHeight(),maximum);
        Bitmap resized=Bitmap.createScaledBitmap(original,size[0],size[1],true);
        try{
            for(int quality:new int[]{90,80,70,60}){
                BoundedBytes output=new BoundedBytes(bytes);
                try{
                    boolean encoded=resized.compress(Bitmap.CompressFormat.JPEG,quality,output);
                    if(encoded){byte[] result=output.bytes();if(result.length>0)return result;}
                }catch(IOException overflow){/* Discard this entire attempt before trying lower quality. */}
            }
            throw new IOException("image too complex for readable JPEG limit");
        }finally{if(resized!=original)resized.recycle();}
    }
}
