package app.recipio.local;
import java.io.*;

final class ShareMediaCopy {
    private ShareMediaCopy(){}
    static void copy(InputStream input,File output)throws Exception{
        if(input==null)throw new AiFailure("image_unreadable");int total=0;byte[] buffer=new byte[8192];
        try(OutputStream out=new FileOutputStream(ShareMediaFiles.safe(output))){int n;while((n=input.read(buffer))!=-1){
            if(Thread.currentThread().isInterrupted())throw new IOException();if(n==0)continue;
            if(n>15*1024*1024-total)throw new AiFailure("image_too_large");out.write(buffer,0,n);total+=n;
        }}if(total==0)throw new AiFailure("image_invalid");
    }
}
