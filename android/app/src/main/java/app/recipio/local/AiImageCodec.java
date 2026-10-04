package app.recipio.local;
import java.io.*;
import android.graphics.*;
import android.media.ExifInterface;
final class AiImageCodec {
    static AiTemporaryImages.Processed process(File source,String mime)throws Exception {
        Bitmap decoded=null,oriented=null,scaled=null,white=null;
        try{validateContainer(AiTemporaryImages.read(source,15*1024*1024),mime);BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeFile(source.getAbsolutePath(),bounds);dimensions(bounds.outWidth,bounds.outHeight);
            BitmapFactory.Options options=new BitmapFactory.Options();options.inSampleSize=sampleSize(bounds.outWidth,bounds.outHeight);options.inPreferredConfig=Bitmap.Config.ARGB_8888;decoded=BitmapFactory.decodeFile(source.getAbsolutePath(),options);if(decoded==null||(long)decoded.getWidth()*decoded.getHeight()>4194304)throw new AiFailure("image_invalid");
            int orientation=new ExifInterface(source.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION,1);Matrix matrix=orientation(orientation);oriented=Bitmap.createBitmap(decoded,0,0,decoded.getWidth(),decoded.getHeight(),matrix,true);
            double ratio=Math.min(1.0,2048.0/Math.max(oriented.getWidth(),oriented.getHeight()));int width=(int)Math.floor(oriented.getWidth()*ratio),height=(int)Math.floor(oriented.getHeight()*ratio);if(width<=10||height<=10)throw new AiFailure("image_invalid");scaled=Bitmap.createScaledBitmap(oriented,width,height,true);
            white=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(white);canvas.drawColor(Color.WHITE);canvas.drawBitmap(scaled,0,0,null);
            for(int quality:new int[]{85,75,65})try(ByteArrayOutputStream output=new ByteArrayOutputStream()){if(!white.compress(Bitmap.CompressFormat.JPEG,quality,output))throw new AiFailure("image_invalid");if(output.size()<=1024*1024)return new AiTemporaryImages.Processed(output.toByteArray(),width,height);}
            throw new AiFailure("image_too_large");
        }catch(AiFailure e){throw e;}catch(IOException|RuntimeException ignored){throw new AiFailure("image_invalid");}finally{for(Bitmap bitmap:new Bitmap[]{white,scaled,oriented,decoded})if(bitmap!=null&&!bitmap.isRecycled())bitmap.recycle();}
    }
    static Matrix orientation(int value)throws AiFailure {Matrix matrix=new Matrix();switch(value){case 0:case 1:break;case 2:matrix.setScale(-1,1);break;case 3:matrix.setRotate(180);break;case 4:matrix.setScale(1,-1);break;case 5:matrix.setRotate(90);matrix.postScale(-1,1);break;case 6:matrix.setRotate(90);break;case 7:matrix.setRotate(-90);matrix.postScale(-1,1);break;case 8:matrix.setRotate(-90);break;default:throw new AiFailure("image_invalid");}return matrix;}
    static void dimensions(int width,int height)throws AiFailure {if(width<=10||height<=10||Math.max(width,height)>(long)Math.min(width,height)*200)throw new AiFailure("image_invalid");if((long)width*height>32000000)throw new AiFailure("image_too_large");}
    static int sampleSize(int width,int height){int sample=1;while(((width+(long)sample-1)/sample)*((height+(long)sample-1)/sample)>4194304)sample*=2;return sample;}
    static void validateContainer(byte[] bytes,String mime)throws AiFailure {
        if(mime.equals("image/png")){if(bytes.length<20||!matches(bytes,0,new byte[]{(byte)137,80,78,71,13,10,26,10}))throw new AiFailure("image_invalid");int offset=8;boolean end=false;while(offset+12<=bytes.length){long size=integer(bytes,offset,false);if(size>bytes.length-offset-12)throw new AiFailure("image_invalid");String type=ascii(bytes,offset+4,4);if(type.equals("acTL")||type.equals("fcTL")||type.equals("fdAT"))throw new AiFailure("image_invalid");offset+=(int)size+12;if(type.equals("IEND")){end=true;break;}}if(!end||offset!=bytes.length)throw new AiFailure("image_invalid");}
        else if(mime.equals("image/webp")){if(bytes.length<20||!ascii(bytes,0,4).equals("RIFF")||!ascii(bytes,8,4).equals("WEBP")||integer(bytes,4,true)!=bytes.length-8)throw new AiFailure("image_invalid");int offset=12;while(offset+8<=bytes.length){long size=integer(bytes,offset+4,true);if(size>bytes.length-offset-8)throw new AiFailure("image_invalid");String type=ascii(bytes,offset,4);if(type.equals("ANIM")||type.equals("ANMF")||type.equals("VP8X")&&size>=1&&(bytes[offset+8]&2)!=0)throw new AiFailure("image_invalid");offset+=8+(int)size+((int)size&1);}if(offset!=bytes.length)throw new AiFailure("image_invalid");}
        else if(mime.equals("image/jpeg")){if(bytes.length<4||(bytes[0]&255)!=255||(bytes[1]&255)!=216)throw new AiFailure("image_invalid");int offset=2;boolean scan=false,ended=false;
            while(offset<bytes.length){if((bytes[offset++]&255)!=255){if(scan)continue;throw new AiFailure("image_invalid");}while(offset<bytes.length&&(bytes[offset]&255)==255)offset++;if(offset>=bytes.length)throw new AiFailure("image_invalid");int marker=bytes[offset++]&255;if(scan&&(marker==0||marker>=208&&marker<=215))continue;if(marker==217){if(offset!=bytes.length)throw new AiFailure("image_invalid");ended=true;break;}if(marker==216||marker==0)throw new AiFailure("image_invalid");if(marker==1)continue;if(offset+2>bytes.length)throw new AiFailure("image_invalid");int size=(bytes[offset]&255)*256+(bytes[offset+1]&255);if(size<2||size>bytes.length-offset)throw new AiFailure("image_invalid");if(marker==226&&size>=6&&ascii(bytes,offset+2,4).equals("MPF\0"))throw new AiFailure("image_invalid");offset+=size;scan=marker==218;}
            if(!ended)throw new AiFailure("image_invalid");}
        else throw new AiFailure("image_invalid");
    }
    private static long integer(byte[] bytes,int offset,boolean little){long result=0;for(int i=0;i<4;i++)result=(result<<8)|(bytes[offset+(little?3-i:i)]&255);return result;}
    private static String ascii(byte[] bytes,int offset,int length){return new String(bytes,offset,length,java.nio.charset.StandardCharsets.US_ASCII);}
    private static boolean matches(byte[] bytes,int offset,byte[] wanted){for(int i=0;i<wanted.length;i++)if(bytes[offset+i]!=wanted[i])return false;return true;}
}
