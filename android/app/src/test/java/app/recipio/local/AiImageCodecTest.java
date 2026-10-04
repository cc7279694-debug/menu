package app.recipio.local;
import static org.junit.Assert.*;
import java.io.*;
import org.junit.Test;
public class AiImageCodecTest {
    private byte[] png(String... types)throws Exception {ByteArrayOutputStream out=new ByteArrayOutputStream();out.write(new byte[]{(byte)137,80,78,71,13,10,26,10});for(String type:types){out.write(new byte[4]);out.write(type.getBytes("US-ASCII"));out.write(new byte[4]);}return out.toByteArray();}
    @Test public void rejectsAnimatedPngAndDeclaredChunkTruncation()throws Exception {AiImageCodec.validateContainer(png("IEND"),"image/png");for(String chunk:new String[]{"acTL","fcTL","fdAT"})assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(png(chunk,"IEND"),"image/png"));byte[] truncated=png("IEND");truncated[8]=100;assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(truncated,"image/png"));}
    @Test public void rejectsAnimatedWebPAndFalseMime()throws Exception {byte[] webp={'R','I','F','F',12,0,0,0,'W','E','B','P','A','N','I','M',0,0,0,0};assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(webp,"image/webp"));byte[] still=webp.clone();still[12]='V';still[13]='P';still[14]='8';still[15]=' ';AiImageCodec.validateContainer(still,"image/webp");assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(still,"image/png"));}
    @Test public void rejectsJpegMpoAndConcatenatedJpegs() {byte[] mpo={(byte)255,(byte)216,(byte)255,(byte)226,0,6,'M','P','F',0,(byte)255,(byte)217};assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(mpo,"image/jpeg"));byte[] multiple={(byte)255,(byte)216,(byte)255,(byte)218,0,2,10,(byte)255,(byte)217,(byte)255,(byte)216,(byte)255,(byte)217};assertThrows(AiFailure.class,()->AiImageCodec.validateContainer(multiple,"image/jpeg"));}
}
