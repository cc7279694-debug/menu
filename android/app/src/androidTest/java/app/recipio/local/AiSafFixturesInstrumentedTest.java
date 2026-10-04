package app.recipio.local;
import static org.junit.Assert.*;
import android.graphics.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.util.UUID;
import org.junit.Test;
import org.junit.runner.RunWith;
/** Generates a dedicated cache namespace for actual SAF UI verification; no business data or HTTP. */
@RunWith(AndroidJUnit4.class)
public class AiSafFixturesInstrumentedTest {
    @Test public void generateOwnedJpegPngWebpAndInvalidSelectionFixtures()throws Exception {
        File root=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"recipio-ai-fixture-"+UUID.randomUUID());assertTrue(root.mkdir());
        Bitmap bitmap=Bitmap.createBitmap(240,160,Bitmap.Config.ARGB_8888);
        try{Canvas canvas=new Canvas(bitmap);canvas.drawColor(Color.WHITE);Paint paint=new Paint();paint.setColor(Color.RED);canvas.drawRect(20,20,120,100,paint);
            Bitmap.CompressFormat[] formats={Bitmap.CompressFormat.JPEG,Bitmap.CompressFormat.PNG,Bitmap.CompressFormat.WEBP_LOSSLESS};String[] extensions={"jpg","png","webp"};
            for(int i=0;i<formats.length;i++)try(OutputStream out=new FileOutputStream(new File(root,"generated."+extensions[i]))){assertTrue(bitmap.compress(formats[i],90,out));}
            try(OutputStream out=new FileOutputStream(new File(root,"corrupt.png"))){out.write(new byte[]{1,2,3});}
            try(OutputStream out=new FileOutputStream(new File(root,"oversize.png"))){byte[] block=new byte[8192];for(int i=0;i<2048;i++)out.write(block);}
        }finally{bitmap.recycle();}
        assertEquals(5,root.list().length);
    }
}
