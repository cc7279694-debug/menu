package app.recipio.captureprobe.core;
import java.io.*;
public final class BoundedBytes extends OutputStream {
    private final int limit;
    private final ByteArrayOutputStream output=new ByteArrayOutputStream();
    private boolean exceeded;
    public BoundedBytes(int limit){if(limit<1)throw new IllegalArgumentException("limit");this.limit=limit;}
    @Override public void write(int value)throws IOException{check(1);output.write(value);}
    @Override public void write(byte[] data,int start,int count)throws IOException{check(count);output.write(data,start,count);}
    private void check(int count)throws IOException{
        if(exceeded||count<0||count>limit-output.size()){exceeded=true;throw new IOException("encoded image limit");}
    }
    public byte[] bytes()throws IOException{if(exceeded)throw new IOException("incomplete encoded image");return output.toByteArray();}
}
