package app.recipio.local;

import static org.junit.Assert.*;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.CRC32;
import java.util.zip.DeflaterOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.*;
import org.junit.rules.TestName;
import org.junit.runner.RunWith;

/** Generated media only. Geometry/lifecycle assertions are not an OCR/readability verdict.
 * This class uses the real Android codec/private image store, but does not automate the Picker. */
@RunWith(AndroidJUnit4.class)
public class XhsR2LongImageInstrumentedTest {
    @Rule public TestName testName = new TestName();
    private Context context;
    private File cache, evidence;
    private AiTemporaryImages images;
    private UUID operation;
    private final List<UUID> operations = new ArrayList<>();

    @Before public void setup() throws Exception {
        assertTrue("Dedicated emulator only", "ranchu".equals(Build.HARDWARE) || "goldfish".equals(Build.HARDWARE));
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        cache = new File(context.getCacheDir(), "xhs-r2-n1-" + UUID.randomUUID()).getCanonicalFile();
        assertTrue(cache.mkdir());
        images = new AiTemporaryImages(cache, System::currentTimeMillis, AiImageCodec::process);
        operation = session();
        File external = context.getExternalFilesDir(null);
        assertNotNull("Generated evidence external directory", external);
        File parent = new File(external, "xhs-r2-n1");
        assertTrue(parent.isDirectory() || parent.mkdir());
        evidence = new File(parent, testName.getMethodName() + "-" + UUID.randomUUID());
        assertTrue(evidence.mkdir());
        writeJson("run-info.json", new JSONObject().put("kind", "GENERATED_NATIVE_CODEC_TEST_ONLY")
            .put("test", testName.getMethodName()).put("androidSdk", Build.VERSION.SDK_INT)
            .put("hardware", Build.HARDWARE).put("package", context.getPackageName())
            .put("realAiCalls", 0).put("nativePicker", "NOT_TESTED_BY_THIS_CLASS")
            .put("automaticReadabilityVerdict", "NOT_ASSESSED"));
    }

    @After public void cleanup() throws Exception {
        if (images != null) for (UUID id : operations) images.discard(id);
        if (cache != null) {
            File root = new File(cache, "ai-import");
            if (root.exists()) assertTrue("Only empty generated image root may be removed", root.delete());
            assertTrue("Only empty generated cache may be removed", cache.delete());
        }
        // External evidence contains only generated media and remains available for adb pull.
    }

    private UUID session() throws Exception {
        UUID id = UUID.randomUUID(); images.create(id); operations.add(id); return id;
    }
    private File folder(UUID id) { return new File(cache, "ai-import/" + id); }
    private File processed(AiTemporaryImages.Image image) { return new File(folder(operation), image.id + ".jpg"); }
    private static String sha(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(file)) {
            byte[] block = new byte[8192]; int n;
            while ((n = in.read(block)) != -1) digest.update(block, 0, n);
        }
        StringBuilder out = new StringBuilder();
        for (byte b : digest.digest()) out.append(String.format(Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }
    private void writeJson(String name, JSONObject value) throws Exception {
        try (Writer out = new OutputStreamWriter(new FileOutputStream(new File(evidence, name)), java.nio.charset.StandardCharsets.UTF_8)) { out.write(value.toString(2)); out.write("\n"); }
    }
    private static void writeBitmap(Bitmap bitmap, File file, Bitmap.CompressFormat format) throws Exception {
        try (OutputStream out = new FileOutputStream(file)) { assertTrue(bitmap.compress(format, 100, out)); }
    }
    private static void copy(File from, File to) throws Exception {
        try (InputStream in = new FileInputStream(from); OutputStream out = new FileOutputStream(to)) {
            byte[] block = new byte[8192]; int n; while ((n = in.read(block)) != -1) out.write(block, 0, n);
        }
    }
    private void crop(Bitmap bitmap, String file, int top, int height) throws Exception {
        int y = Math.max(0, Math.min(bitmap.getHeight() - 1, top));
        Bitmap sample = Bitmap.createBitmap(bitmap, 0, y, bitmap.getWidth(), Math.max(1, Math.min(height, bitmap.getHeight() - y)));
        try { writeBitmap(sample, new File(evidence, file), Bitmap.CompressFormat.PNG); }
        finally { if (sample != bitmap) sample.recycle(); }
    }

    private File generatedRecipe(String name, int width, int height) throws Exception {
        Bitmap source = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        try {
            Canvas canvas = new Canvas(source); canvas.drawColor(Color.rgb(249, 247, 240));
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG); paint.setColor(Color.rgb(30, 35, 30));
            paint.setTextSize(40); canvas.drawText("合成菜谱 · 青菜炒饭", 28, 60, paint);
            paint.setTextSize(28); canvas.drawText("青菜200克 / 米饭1碗 / 盐适量", 28, 120, paint);
            int[] sizes = {14, 24, 36};
            for (int i = 0; i < sizes.length; i++) {
                paint.setTextSize(sizes[i]);
                canvas.drawText(sizes[i] + "px 青菜200克，煮8分钟", 28, 180 + i * 55, paint);
                canvas.drawText(sizes[i] + "px 盐适量，翻炒均匀", 28, height - 165 + i * 55, paint);
            }
            String[] steps = {"洗净青菜。", "青菜切段。", "热锅加少量水。", "放入青菜。", "翻拌均匀。", "加盐适量。", "加入米饭炒匀。", "装盘。"};
            paint.setTextSize(32);
            for (int i = 0; i < steps.length; i++) canvas.drawText((i + 1) + ". " + steps[i], 28, height * .28f + i * height * .065f, paint);
            File file = new File(evidence, name + "-before.png");
            writeBitmap(source, file, Bitmap.CompressFormat.PNG);
            crop(source, name + "-before-top-text.png", 135, 180);
            crop(source, name + "-before-bottom-text.png", height - 210, 190);
            return file;
        } finally { source.recycle(); }
    }

    @Test public void generatedNormalAndLongRecipesExportActualGeometryAndTextCrops() throws Exception {
        int[][] geometry = {{1080,1440}, {600,1800}, {1080,7200}};
        String[] names = {"normal", "long-600x1800", "tall-1080x7200"};
        JSONArray all = new JSONArray();
        for (int i = 0; i < geometry.length; i++) {
            int width = geometry[i][0], height = geometry[i][1]; String name = names[i];
            File before = generatedRecipe(name, width, height);
            AiTemporaryImages.Image result;
            try (InputStream in = new FileInputStream(before)) { result = images.importStream(operation, in, "image/png"); }
            assertTrue(result.width > 10 && result.height > 10);
            assertTrue(result.width <= 2048 && result.height <= 2048);
            assertTrue(result.byteSize > 0 && result.byteSize <= 1024 * 1024);
            if (width == 600) { assertEquals(600, result.width); assertEquals(1800, result.height); }
            File actual = processed(result), after = new File(evidence, name + "-after.jpg");
            assertTrue(actual.isFile()); assertEquals(result.byteSize, actual.length()); copy(actual, after);
            Bitmap decoded = BitmapFactory.decodeFile(after.getAbsolutePath());
            assertNotNull(decoded);
            try {
                assertEquals(result.width, decoded.getWidth()); assertEquals(result.height, decoded.getHeight());
                float scale = result.height / (float) height;
                crop(decoded, name + "-after-top-text.png", (int)(135 * scale), Math.max(1,(int)Math.ceil(180 * scale)));
                crop(decoded, name + "-after-bottom-text.png", (int)((height - 210) * scale), Math.max(1,(int)Math.ceil(190 * scale)));
                JSONArray expectedFontPixels = new JSONArray();
                for (int size : new int[]{14,24,36}) expectedFontPixels.put(size * (double)scale);
                all.put(new JSONObject().put("sample", name).put("before", before.getName())
                    .put("beforeWidth", width).put("beforeHeight", height).put("beforeBytes", before.length()).put("beforeSha256", sha(before))
                    .put("after", after.getName()).put("afterWidth", result.width).put("afterHeight", result.height).put("afterBytes", result.byteSize).put("afterSha256", sha(after))
                    .put("sourceFontPixels", new JSONArray(new int[]{14,24,36}))
                    .put("estimatedScaledFontPixelsNotOcrMeasurement", expectedFontPixels)
                    .put("automaticReadabilityVerdict", "NOT_ASSESSED_REQUIRES_VISUAL_REVIEW")
                    .put("geometryAndByteLimits", "PASS"));
            } finally { decoded.recycle(); }
            assertFalse("No original source fragments retained", Arrays.stream(Objects.requireNonNull(folder(operation).list())).anyMatch(file -> file.endsWith(".source.part")));
        }
        writeJson("image-processing.json", new JSONObject().put("samples", all).put("readability", "NOT_ASSESSED_AUTOMATICALLY"));
        images.discard(operation); assertFalse(folder(operation).exists());
        writeJson("discard-cleanup.json", new JSONObject().put("allGeneratedSessionFilesRemoved", true));
    }

    private static void pngChunk(DataOutputStream out, String name, byte[] payload) throws Exception {
        byte[] type = name.getBytes(java.nio.charset.StandardCharsets.US_ASCII); CRC32 crc = new CRC32(); crc.update(type); crc.update(payload);
        out.writeInt(payload.length); out.write(type); out.write(payload); out.writeInt((int)crc.getValue());
    }
    /** A valid opaque PNG streamed row-by-row: no >32M-pixel Bitmap is allocated. */
    private File generatedOverPixelPng() throws Exception {
        int width = 8001, height = 4000;
        ByteArrayOutputStream compressed = new ByteArrayOutputStream();
        try (DeflaterOutputStream deflater = new DeflaterOutputStream(compressed)) {
            byte[] row = new byte[1 + width * 3]; // PNG filter 0 plus RGB, all black.
            for (int y = 0; y < height; y++) deflater.write(row);
        }
        File file = new File(evidence, "over-32000000-pixels.png");
        try (DataOutputStream out = new DataOutputStream(new FileOutputStream(file))) {
            out.write(new byte[]{(byte)137,80,78,71,13,10,26,10});
            ByteArrayOutputStream header = new ByteArrayOutputStream();
            try (DataOutputStream ihdr = new DataOutputStream(header)) { ihdr.writeInt(width); ihdr.writeInt(height); ihdr.write(new byte[]{8,2,0,0,0}); }
            pngChunk(out,"IHDR",header.toByteArray()); pngChunk(out,"IDAT",compressed.toByteArray()); pngChunk(out,"IEND",new byte[0]);
        }
        return file;
    }

    @Test public void actualByteAndPixelLimitsRejectWithoutRegisteringOrRetainingSources() throws Exception {
        File overPixels = generatedOverPixelPng();
        BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(overPixels.getAbsolutePath(), bounds);
        assertEquals(8001, bounds.outWidth); assertEquals(4000, bounds.outHeight);
        AiFailure pixelFailure = assertThrows(AiFailure.class, () -> images.importStream(operation, new FileInputStream(overPixels), "image/png"));
        assertEquals("image_too_large", pixelFailure.code);
        final int count = 15 * 1024 * 1024 + 1;
        InputStream overBytes = new InputStream() {
            private int remaining = count;
            @Override public int read() { if (remaining == 0) return -1; remaining--; return 0; }
            @Override public int read(byte[] buffer, int off, int length) { if (remaining == 0) return -1; int n = Math.min(remaining,length); Arrays.fill(buffer,off,off+n,(byte)0); remaining -= n; return n; }
        };
        AiFailure byteFailure = assertThrows(AiFailure.class, () -> images.importStream(operation, overBytes, "image/png"));
        assertEquals("image_too_large", byteFailure.code);
        assertArrayEquals(new String[]{".session"}, folder(operation).list());
        writeJson("limit-rejections.json", new JSONObject().put("pixelInputWidth",8001).put("pixelInputHeight",4000)
            .put("pixelInputBytes",overPixels.length()).put("pixelError",pixelFailure.code)
            .put("byteInputLength",count).put("byteInputKind","generated zero stream; rejected before container decoding")
            .put("byteError",byteFailure.code).put("onlySessionMarkerRemains",true));
    }

    private AiTemporaryImages.Image color(int color) throws Exception {
        Bitmap bitmap = Bitmap.createBitmap(64,64,Bitmap.Config.ARGB_8888);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            new Canvas(bitmap).drawColor(color); assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));
            return images.importStream(operation,new ByteArrayInputStream(out.toByteArray()),"image/png");
        } finally { bitmap.recycle(); }
    }

    @Test public void orderedPinnedReadRemoveReselectAndDiscardOnlyAffectOwnedImages() throws Exception {
        AiTemporaryImages.Image red = color(Color.RED), blue = color(Color.BLUE);
        List<UUID> requestOrder = Arrays.asList(UUID.fromString(blue.id),UUID.fromString(red.id));
        images.withPinnedImages(operation,requestOrder,selected -> {
            assertEquals(2,selected.size());
            for (int i=0;i<2;i++) {
                Bitmap bitmap = BitmapFactory.decodeByteArray(selected.get(i).bytes,0,selected.get(i).bytes.length);
                assertNotNull(bitmap);
                try { int pixel=bitmap.getPixel(32,32); if(i==0)assertTrue(Color.blue(pixel)>220&&Color.red(pixel)<40);else assertTrue(Color.red(pixel)>220&&Color.blue(pixel)<40); }
                finally { bitmap.recycle(); }
            }
            return null;
        });
        images.remove(operation,UUID.fromString(red.id)); assertFalse(processed(red).exists()); assertTrue(processed(blue).isFile());
        AiTemporaryImages.Image reselected = color(Color.RED); assertNotEquals(red.id,reselected.id); assertTrue(processed(reselected).isFile());
        UUID other = session(); assertTrue(folder(other).isDirectory());
        images.discard(operation); assertFalse(folder(operation).exists()); assertTrue(folder(other).isDirectory());
        writeJson("ordering-and-cleanup.json", new JSONObject().put("selectedCount",2).put("requestedOrderVerifiedByDecodedPixelColors",true)
            .put("removedOnlySelectedImage",true).put("reselectionHasNewId",true).put("discardRemovedOnlyOwnedSession",true));
    }
}
