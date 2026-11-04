package app.recipio.local;

import static org.junit.Assert.*;
import android.content.Context;
import android.graphics.*;
import android.media.ExifInterface;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.CRC32;
import java.util.zip.DeflaterOutputStream;
import org.json.*;
import org.junit.*;
import org.junit.rules.TestName;
import org.junit.runner.RunWith;

/** Generated source media only. Real Android region decoder; no Provider or Picker in this class. */
@RunWith(AndroidJUnit4.class)
public class XhsR2SegmentedImageInstrumentedTest {
    @Rule public TestName name=new TestName();
    private File cache,evidence;private AiTemporaryImages images;private UUID operation;
    private final List<UUID> sessions=new ArrayList<>();
    @Before public void setup()throws Exception {
        assertTrue("Dedicated emulator only","ranchu".equals(Build.HARDWARE)||"goldfish".equals(Build.HARDWARE));
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        cache=new File(context.getCacheDir(),"xhs-r2-n2-"+UUID.randomUUID()).getCanonicalFile();assertTrue(cache.mkdir());
        images=new AiTemporaryImages(cache,System::currentTimeMillis,AiImageCodec::process);operation=session();
        File parent=new File(context.getExternalFilesDir(null),"xhs-r2-n2");assertTrue(parent.isDirectory()||parent.mkdirs());
        evidence=new File(parent,name.getMethodName()+"-"+UUID.randomUUID());assertTrue(evidence.mkdir());
        json("run-info.json",new JSONObject().put("kind","GENERATED_NATIVE_REGION_DECODE_TEST_ONLY").put("test",name.getMethodName())
            .put("api",Build.VERSION.SDK_INT).put("hardware",Build.HARDWARE).put("realAiCalls",0)
            .put("automaticReadabilityVerdict","NOT_ASSESSED_REQUIRES_VISUAL_REVIEW"));
    }
    @After public void cleanup()throws Exception {
        for(UUID id:sessions)images.discard(id);
        assertTrue(new File(cache,"ai-import").delete());assertTrue(cache.delete());
    }
    private UUID session()throws Exception {UUID id=UUID.randomUUID();images.create(id);sessions.add(id);return id;}
    private File folder(){return new File(cache,"ai-import/"+operation);}
    private static void save(Bitmap bitmap,File file,Bitmap.CompressFormat format)throws Exception {try(OutputStream out=new FileOutputStream(file)){assertTrue(bitmap.compress(format,100,out));}}
    private void json(String file,JSONObject object)throws Exception {try(Writer out=new OutputStreamWriter(new FileOutputStream(new File(evidence,file)),java.nio.charset.StandardCharsets.UTF_8)){out.write(object.toString(2));out.write("\n");}}
    private static String sha(File file)throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)digest.update(b,0,n);}StringBuilder text=new StringBuilder();for(byte b:digest.digest())text.append(String.format(Locale.ROOT,"%02x",b&255));return text.toString();}
    private static void copy(File from,File to)throws Exception {try(InputStream in=new FileInputStream(from);OutputStream out=new FileOutputStream(to)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}}
    private void crop(Bitmap bitmap,String file,int y,int height)throws Exception {Bitmap part=Bitmap.createBitmap(bitmap,0,y,bitmap.getWidth(),height);try{save(part,new File(evidence,file),Bitmap.CompressFormat.PNG);}finally{if(part!=bitmap)part.recycle();}}
    private File generated(String file,int width,int height,boolean extra)throws Exception {
        Bitmap source=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
        try{
            Canvas canvas=new Canvas(source);canvas.drawColor(Color.rgb(249,247,240));Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setColor(Color.rgb(30,35,30));
            paint.setTextSize(40);canvas.drawText("合成菜谱 · 青菜炒饭",28,60,paint);paint.setTextSize(28);canvas.drawText("青菜200克 / 米饭1碗 / 盐适量",28,120,paint);
            int[] sizes={14,24,36};for(int i=0;i<sizes.length;i++){paint.setTextSize(sizes[i]);canvas.drawText(sizes[i]+"px 青菜200克，煮8分钟",28,180+i*55,paint);canvas.drawText(sizes[i]+"px 盐适量，翻炒均匀",28,height-165+i*55,paint);}
            String[] steps={"洗净青菜。","青菜切段。","热锅加少量水。","放入青菜。","翻拌均匀。","加盐适量。","加入米饭炒匀。","装盘。"};paint.setTextSize(32);
            for(int i=0;i<steps.length;i++)canvas.drawText((i+1)+". "+steps[i],28,height*.28f+i*height*.065f,paint);
            if(extra)for(int y:new int[]{1900,3900,5860}){paint.setTextSize(14);canvas.drawText("14px 中段关键步骤：加入青菜，翻拌均匀",28,y+25,paint);paint.setTextSize(24);canvas.drawText("24px 边界关键步骤：盐适量，最后装盘",28,y+65,paint);}
            File result=new File(evidence,file+"-original.png");save(source,result,Bitmap.CompressFormat.PNG);
            crop(source,file+"-original-top-text.png",135,180);crop(source,file+"-original-bottom-text.png",height-210,190);
            if(extra)for(int y:new int[]{1900,3900,5860})crop(source,file+"-original-boundary-"+y+".png",y,120);
            return result;
        }finally{source.recycle();}
    }
    private List<AiTemporaryImages.Image> segment(File source)throws Exception {try(InputStream in=new FileInputStream(source)){return images.importLongStream(operation,in,"image/png",()->{});}}
    @Test public void originalResolutionSegmentsExportAllContentAndTextCrops()throws Exception {
        JSONArray samples=new JSONArray();int[][] geometry={{1080,1440},{600,1800},{1080,7200},{1080,7200}};
        String[] names={"normal","long-600x1800","tall-1080x7200","coverage-1080x7200"};
        for(int sample=0;sample<geometry.length;sample++){
            if(sample>0)operation=session();int width=geometry[sample][0],height=geometry[sample][1];String label=names[sample];
            File source=generated(label,width,height,sample==3);List<AiLongImagePlan.Region> plan=AiLongImagePlan.create(width,height,6);
            List<AiTemporaryImages.Image> result=segment(source);assertEquals(plan.size(),result.size());assertTrue(result.size()<=6);
            JSONArray parts=new JSONArray();int end=0,total=0;
            for(int i=0;i<result.size();i++){
                AiLongImagePlan.Region region=plan.get(i);AiTemporaryImages.Image image=result.get(i);String prefix=label+"-segment-"+(i+1);
                assertEquals(width,image.width);assertEquals(region.bottom-region.top,image.height);assertTrue(image.byteSize<=1024*1024);total+=image.byteSize;
                assertEquals(i==0?0:end-64,region.top);end=region.bottom;
                File output=new File(evidence,prefix+".jpg");copy(new File(folder(),image.id+".jpg"),output);assertEquals(image.byteSize,output.length());
                Bitmap decoded=BitmapFactory.decodeFile(output.getAbsolutePath());assertNotNull(decoded);
                try{
                    assertEquals(width,decoded.getWidth());assertEquals(region.bottom-region.top,decoded.getHeight());
                    if(region.top==0)crop(decoded,prefix+"-top-text.png",135,180);
                    if(region.bottom==height)crop(decoded,prefix+"-bottom-text.png",height-210-region.top,190);
                    if(sample==3)for(int y:new int[]{1900,3900,5860})if(y>=region.top&&y+120<=region.bottom)crop(decoded,prefix+"-boundary-"+y+".png",y-region.top,120);
                }finally{decoded.recycle();}
                parts.put(new JSONObject().put("index",i).put("sourceTop",region.top).put("sourceBottom",region.bottom).put("width",image.width).put("height",image.height)
                    .put("decodedPixelCount",(long)image.width*image.height).put("file",output.getName()).put("bytes",output.length()).put("sha256",sha(output)).put("rescaled",false));
            }
            assertEquals(height,end);assertTrue(total<=6*1024*1024);
            assertFalse(Arrays.stream(Objects.requireNonNull(folder().list())).anyMatch(n->n.endsWith(".source.part")));
            samples.put(new JSONObject().put("sample",label).put("source",source.getName()).put("sourceWidth",width).put("sourceHeight",height).put("sourceBytes",source.length()).put("sourceSha256",sha(source))
                .put("segments",parts).put("totalBytes",total).put("allSourceRowsCovered",true).put("overlapRows",64).put("textPixelScale",1));
            images.discard(operation);assertFalse(folder().exists());
        }
        json("segment-processing.json",new JSONObject().put("samples",samples).put("readability","NOT_ASSESSED_AUTOMATICALLY").put("ownedSessionCleanup","PASS"));
    }
    @Test public void existingImagesConsumeSlotsWithoutTailTruncation()throws Exception {
        File normal=generated("normal",1080,1440,false);List<AiTemporaryImages.Image> old=new ArrayList<>();
        for(int i=0;i<3;i++)try(InputStream in=new FileInputStream(normal)){old.add(images.importStream(operation,in,"image/png"));}
        Map<String,String> before=new LinkedHashMap<>();for(AiTemporaryImages.Image image:old)before.put(image.id,sha(new File(folder(),image.id+".jpg")));
        File tall=generated("tall",1080,7200,false);assertEquals("long_image_limit",assertThrows(AiFailure.class,()->segment(tall)).code);
        assertEquals(3,Objects.requireNonNull(folder().listFiles((d,n)->n.endsWith(".jpg"))).length);
        for(AiTemporaryImages.Image image:old)assertEquals(before.get(image.id),sha(new File(folder(),image.id+".jpg")));
        images.remove(operation,UUID.fromString(old.get(2).id));assertEquals(4,segment(tall).size());
        json("slot-limit.json",new JSONObject().put("threeExistingImagesRejectFourSegmentsWithoutChange",true).put("twoExistingImagesAllowFourSegments",true));
    }
    @Test public void actualRegionCancellationRollsBackAndRetainsOtherImages()throws Exception {
        File source=generated("tall",1080,7200,false);AiTemporaryImages.Image old;try(InputStream in=new FileInputStream(source)){old=images.importStream(operation,in,"image/png");}
        String before=sha(new File(folder(),old.id+".jpg"));AtomicInteger checks=new AtomicInteger();
        try(InputStream in=new FileInputStream(source)){assertEquals("cancelled",assertThrows(AiFailure.class,()->images.importLongStream(operation,in,"image/png",()->{
            checks.incrementAndGet();File[] parts=folder().listFiles((d,n)->n.endsWith(".jpg"));if(parts!=null&&parts.length>=2)throw new AiFailure("cancelled");
        })).code);}
        assertEquals(1,Objects.requireNonNull(folder().listFiles((d,n)->n.endsWith(".jpg"))).length);assertEquals(before,sha(new File(folder(),old.id+".jpg")));
        assertFalse(Arrays.stream(Objects.requireNonNull(folder().list())).anyMatch(n->n.endsWith(".source.part")));
        json("cancellation.json",new JSONObject().put("cancelAfterStagedSegment",true).put("checks",checks.get()).put("oldImageSha256Unchanged",true).put("partialSegmentsRemoved",true));
    }
    @Test public void rotatedSourceAndOversizePixelsAreRejectedBeforePublishing()throws Exception {
        File png=generated("normal",1080,1440,false);Bitmap decoded=BitmapFactory.decodeFile(png.getAbsolutePath());File jpeg=new File(evidence,"rotated-original.jpg");try{save(decoded,jpeg,Bitmap.CompressFormat.JPEG);}finally{decoded.recycle();}
        ExifInterface exif=new ExifInterface(jpeg.getAbsolutePath());exif.setAttribute(ExifInterface.TAG_ORIENTATION,"6");exif.saveAttributes();
        try(InputStream in=new FileInputStream(jpeg)){assertEquals("long_image_limit",assertThrows(AiFailure.class,()->images.importLongStream(operation,in,"image/jpeg",()->{})).code);}
        File over=overPixelPng();assertEquals("image_too_large",assertThrows(AiFailure.class,()->segment(over)).code);
        assertEquals(0,Objects.requireNonNull(folder().listFiles((d,n)->n.endsWith(".jpg")||n.endsWith(".source.part"))).length);
        json("native-limits.json",new JSONObject().put("rotatedExif6","long_image_limit").put("sourcePixels",32004000).put("overPixels","image_too_large").put("partialFiles",0));
    }
    private static void chunk(DataOutputStream out,String name,byte[] payload)throws Exception {byte[] type=name.getBytes(java.nio.charset.StandardCharsets.US_ASCII);CRC32 crc=new CRC32();crc.update(type);crc.update(payload);out.writeInt(payload.length);out.write(type);out.write(payload);out.writeInt((int)crc.getValue());}
    private File overPixelPng()throws Exception {
        ByteArrayOutputStream compressed=new ByteArrayOutputStream();try(DeflaterOutputStream deflater=new DeflaterOutputStream(compressed)){byte[] row=new byte[1+8001*3];for(int y=0;y<4000;y++)deflater.write(row);}
        File result=new File(evidence,"over-32000000-pixels.png");try(DataOutputStream out=new DataOutputStream(new FileOutputStream(result))){out.write(new byte[]{(byte)137,80,78,71,13,10,26,10});ByteArrayOutputStream header=new ByteArrayOutputStream();try(DataOutputStream h=new DataOutputStream(header)){h.writeInt(8001);h.writeInt(4000);h.write(new byte[]{8,2,0,0,0});}chunk(out,"IHDR",header.toByteArray());chunk(out,"IDAT",compressed.toByteArray());chunk(out,"IEND",new byte[0]);}return result;
    }
}
