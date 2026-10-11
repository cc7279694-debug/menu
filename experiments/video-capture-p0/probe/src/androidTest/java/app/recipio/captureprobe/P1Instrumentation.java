package app.recipio.captureprobe;

import android.app.Instrumentation;
import android.content.*;
import android.content.pm.PackageInfo;
import android.graphics.*;
import android.net.Uri;
import android.os.Bundle;
import app.recipio.captureprobe.core.VisualFiles;
import androidx.core.content.FileProvider;
import java.io.*;
import java.util.*;

/** Real Android codec/provider checks, only generated test pixels; NOT a projection/platform test. */
public final class P1Instrumentation extends Instrumentation {
    private static final int TOTAL=13;
    private int passed,current;
    @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
    private interface Check {void run()throws Exception;}
    private void check(String name,Check body)throws Exception{
        current++;status(1,name,"");
        try{body.run();passed++;status(0,name,".");}
        catch(Exception|AssertionError error){
            Bundle failure=statusBundle(name);failure.putString("stack",error.getClass().getSimpleName());
            failure.putString("stream","\n"+name+" FAIL: "+error.getClass().getSimpleName()+"\n");sendStatus(-2,failure);throw error;
        }
    }
    private Bundle statusBundle(String name){
        Bundle status=new Bundle();status.putString("id","P1Instrumentation");status.putInt("numtests",TOTAL);status.putInt("current",current);
        status.putString("class","app.recipio.captureprobe.P1AndroidBoundary");status.putString("test",name);return status;
    }
    private void status(int code,String name,String stream){Bundle status=statusBundle(name);status.putString("stream",stream);sendStatus(code,status);}
    private static byte[] readBounded(InputStream input)throws IOException{
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] block=new byte[4096];int n;
        while((n=input.read(block))!=-1){if(n>1024*1024-bytes.size())throw new IOException("test image limit");bytes.write(block,0,n);}
        return bytes.toByteArray();
    }
    private static void require(boolean ok){if(!ok)throw new AssertionError("boundary check failed");}
    @Override public void onStart(){
        Bundle result=new Bundle();Bitmap generated=null;Throwable failure=null;
        try{
            Context c=getTargetContext();VisualFiles files=new VisualFiles(c.getCacheDir());files.clearAll();
            generated=Bitmap.createBitmap(2200,1100,Bitmap.Config.ARGB_8888);
            Canvas canvas=new Canvas(generated);canvas.drawColor(Color.WHITE);Paint paint=new Paint();paint.setColor(Color.BLACK);paint.setTextSize(64);canvas.drawText("Generated recipe: 200g, simmer 5 minutes",40,150,paint);
            byte[] jpeg=FrameCodec.jpeg(generated,2048,1024*1024);byte[] thumb=FrameCodec.jpeg(generated,240,128*1024);
            check("jpegDimensionsAndBytes",()->{Bitmap decoded=BitmapFactory.decodeByteArray(jpeg,0,jpeg.length);try{require(decoded!=null&&decoded.getWidth()==2048&&decoded.getHeight()==1024&&jpeg.length<=1024*1024);}finally{if(decoded!=null)decoded.recycle();}});
            check("thumbnailIsBounded",()->{Bitmap decoded=BitmapFactory.decodeByteArray(thumb,0,thumb.length);try{require(decoded!=null&&Math.max(decoded.getWidth(),decoded.getHeight())<=240);}finally{if(decoded!=null)decoded.recycle();}});
            Bitmap input=generated;
            check("jpegOverflowIsRejectedWithoutRecyclingInput",()->{
                try{FrameCodec.jpeg(input,240,16);throw new AssertionError("partial JPEG published");}catch(IOException expected){}
                require(!input.isRecycled());
            });
            for(int i=0;i<6;i++)files.storeCandidate(i,jpeg,thumb);
            List<File> exports=files.share(Arrays.asList(5,3,1,4,0,2),System.currentTimeMillis());
            ArrayList<Uri> uris=new ArrayList<>();for(File f:exports)uris.add(FileProvider.getUriForFile(c,FrameShare.AUTHORITY,f));
            check("multipleShareOrderAndReadOnlyGrant",()->{
                Intent intent=FrameShare.intent(uris);require(Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()));
                require("image/jpeg".equals(intent.getType()));require(intent.getFlags()==Intent.FLAG_GRANT_READ_URI_PERMISSION);
                require(intent.getClipData().getItemCount()==6);
                for(int i=0;i<6;i++)require(uris.get(i).equals(intent.getClipData().getItemAt(i).getUri()));
                require(intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM).equals(uris));
            });
            check("singleShareUsesSend",()->{Intent send=FrameShare.intent(new ArrayList<>(uris.subList(0,1)));require(Intent.ACTION_SEND.equals(send.getAction())&&uris.get(0).equals(send.getParcelableExtra(Intent.EXTRA_STREAM)));});
            check("seventhImageRejected",()->{ArrayList<Uri> seven=new ArrayList<>(uris);seven.add(uris.get(0));try{FrameShare.intent(seven);throw new AssertionError("seventh accepted");}catch(IllegalArgumentException expected){}});
            check("providerReadsSelectedJpegBytes",()->{
                require("image/jpeg".equals(c.getContentResolver().getType(uris.get(0))));
                try(InputStream in=c.getContentResolver().openInputStream(uris.get(0))){require(in!=null&&Arrays.equals(jpeg,readBounded(in)));}
            });
            check("providerRejectsWrite",()->{try{c.getContentResolver().openFileDescriptor(uris.get(0),"rw");throw new AssertionError("write accepted");}catch(SecurityException expected){}});
            check("candidateIsOutsideProviderRoot",()->{try{FileProvider.getUriForFile(c,FrameShare.AUTHORITY,files.candidate(0));throw new AssertionError("candidate exposed");}catch(IllegalArgumentException expected){}});
            check("metadataCannotBeRead",()->{Uri uri=uris.get(0).buildUpon().path("/selected/fake.lease").build();try{c.getContentResolver().openInputStream(uri);throw new AssertionError("manifest exposed");}catch(SecurityException expected){}});
            check("noNetworkOrAudioPermission",()->{
                PackageInfo info=c.getPackageManager().getPackageInfo(c.getPackageName(),android.content.pm.PackageManager.GET_PERMISSIONS);
                List<String> permissions=info.requestedPermissions==null?Collections.emptyList():Arrays.asList(info.requestedPermissions);
                require(!permissions.contains("android.permission.INTERNET")&&!permissions.contains("android.permission.RECORD_AUDIO"));
            });
            check("coldStartKeepsLeaseButNotCandidates",()->{files.coldStart(System.currentTimeMillis());require(!files.candidate(0).exists()&&exports.get(0).isFile());});
            check("explicitCleanupRemovesAllTestFiles",()->{FrameShare.deleteAll(c);require(files.bytes()==0);});
        }catch(Throwable error){failure=error;}
        finally{
            if(generated!=null)generated.recycle();
            try{new VisualFiles(getTargetContext().getCacheDir()).clearAll();}catch(IOException cleanup){if(failure==null)failure=cleanup;}
        }
        if(failure==null&&passed==TOTAL){
            result.putString("stream","\nOK ("+passed+" tests)\nGenerated Android boundaries only; projection/platform/foreign-process receiving NOT tested\n");
            finish(android.app.Activity.RESULT_OK,result);
        }else{
            result.putString("stream","\nFAILURES!!!\nTests run: "+current+", passed: "+passed+"; category "+(failure==null?"IncompleteRun":failure.getClass().getSimpleName())+"\n");
            finish(android.app.Activity.RESULT_CANCELED,result);
        }
    }
}
