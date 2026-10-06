package app.recipio.local;
import static org.junit.Assert.*;
import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import org.junit.*;

public class ShareMediaCopyTest {
    private File file;
    @Before public void setup()throws Exception{file=Files.createTempFile("generated-share-copy-",".part").toFile();}
    @After public void cleanup(){assertTrue(!file.exists()||file.delete());}
    private void copy(InputStream input)throws Exception{
        Class<?> type=null;try{type=Class.forName("app.recipio.local.ShareMediaCopy");}catch(ClassNotFoundException ignored){}
        assertNotNull("Bounded external attachment copy is missing",type);Method method=type.getDeclaredMethod("copy",InputStream.class,File.class);method.setAccessible(true);
        try{method.invoke(null,input,file);}catch(InvocationTargetException e){throw (Exception)e.getCause();}
    }
    // Catches off-by-one raw-size guards while keeping the documented 15MiB boundary accepted.
    @Test public void exactRawLimitAllowedAndOneAdditionalByteRejected()throws Exception{copy(new ByteArrayInputStream(new byte[15*1024*1024]));assertEquals(15*1024*1024,file.length());assertEquals("image_too_large",assertThrows(AiFailure.class,()->copy(new ByteArrayInputStream(new byte[15*1024*1024+1]))).code);assertTrue(file.length()<=15*1024*1024);}
    // Catches empty input acceptance or turning provider IO failure into valid image bytes.
    @Test public void emptyAndFailingProviderNeverBecomeSuccessfulCopy()throws Exception{assertEquals("image_invalid",assertThrows(AiFailure.class,()->copy(new ByteArrayInputStream(new byte[0]))).code);assertThrows(IOException.class,()->copy(new InputStream(){@Override public int read()throws IOException{throw new IOException();}}));}
}
