package app.recipio.local;

import android.graphics.*;
import android.media.ExifInterface;
import java.io.*;
import java.util.*;

/** Explicit text-image mode: decode one bounded region of the authorised original at a time. */
final class AiLongImageCodec {
    static void process(File source,String mime,int remaining,AiTemporaryImages.Check check,AiTemporaryImages.SegmentSink sink)throws Exception {
        BitmapRegionDecoder decoder=null;
        try{
            check.check();
            AiImageCodec.validateContainer(AiTemporaryImages.read(source,15*1024*1024),mime);
            BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
            BitmapFactory.decodeFile(source.getAbsolutePath(),bounds);
            List<AiLongImagePlan.Region> regions=AiLongImagePlan.create(bounds.outWidth,bounds.outHeight,remaining);
            int orientation=new ExifInterface(source.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION,1);
            // Screenshots are normally unrotated. Do not silently reorder rotated source content.
            if(orientation!=0&&orientation!=1)throw new AiFailure("long_image_limit");
            check.check();decoder=BitmapRegionDecoder.newInstance(source.getAbsolutePath(),false);
            if(decoder==null||decoder.getWidth()!=bounds.outWidth||decoder.getHeight()!=bounds.outHeight)throw new AiFailure("image_invalid");
            for(AiLongImagePlan.Region region:regions){
                check.check();Bitmap decoded=null,white=null;
                try{
                    long pixels=(long)region.right*(region.bottom-region.top);
                    long available=Runtime.getRuntime().maxMemory()-Runtime.getRuntime().totalMemory()+Runtime.getRuntime().freeMemory();
                    // Two ARGB buffers plus bounded encoding/decoder overhead; never grow the pixel ceiling.
                    AiLongImagePlan.requireDecodeBudget(pixels,available);
                    BitmapFactory.Options options=new BitmapFactory.Options();options.inPreferredConfig=Bitmap.Config.ARGB_8888;options.inSampleSize=1;
                    decoded=decoder.decodeRegion(new Rect(region.left,region.top,region.right,region.bottom),options);
                    if(decoded==null||decoded.getWidth()!=region.right||decoded.getHeight()!=region.bottom-region.top)throw new AiFailure("image_invalid");
                    check.check();white=Bitmap.createBitmap(decoded.getWidth(),decoded.getHeight(),Bitmap.Config.ARGB_8888);
                    Canvas canvas=new Canvas(white);canvas.drawColor(Color.WHITE);canvas.drawBitmap(decoded,0,0,null);
                    AiTemporaryImages.Processed output=null;
                    for(int quality:new int[]{85,75,65})try(ByteArrayOutputStream encoded=new ByteArrayOutputStream()){
                        check.check();if(!white.compress(Bitmap.CompressFormat.JPEG,quality,encoded))throw new AiFailure("image_invalid");
                        if(encoded.size()<=1024*1024){output=new AiTemporaryImages.Processed(encoded.toByteArray(),white.getWidth(),white.getHeight());break;}
                    }
                    if(output==null)throw new AiFailure("long_image_limit");
                    check.check();sink.add(output);
                }finally{if(white!=null&&!white.isRecycled())white.recycle();if(decoded!=null&&!decoded.isRecycled())decoded.recycle();}
            }
            check.check();
        }catch(AiFailure error){throw error;}
        catch(OutOfMemoryError error){throw new AiFailure("long_image_limit");}
        catch(IOException|RuntimeException error){throw new AiFailure("image_invalid");}
        finally{if(decoder!=null&&!decoder.isRecycled())decoder.recycle();}
    }
}
