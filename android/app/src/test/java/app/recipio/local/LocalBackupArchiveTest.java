package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.Files;
import java.util.*;
import java.util.zip.*;
import org.json.*;
import org.junit.*;
import org.junit.rules.TemporaryFolder;

public class LocalBackupArchiveTest {
    @Test public void writesStrictV2WithCookingCountAndKeepsActualV1Import() throws Exception {
        JSONObject data=empty().put("cookingRecords",new JSONArray());
        File output=new File(folder.newFolder(),"v2.recipio");
        LocalBackupArchive.write(output,data,Collections.emptyList(),"cooking",11,4);
        LocalBackupArchive.Validated checked=LocalBackupArchive.validate(output);
        assertEquals(2,checked.manifest.getInt("formatVersion"));
        assertEquals(0,checked.manifest.getJSONObject("counts").getInt("cookingRecords"));
        File golden=new File(folder.newFolder(),"v1.recipio");
        try(InputStream in=getClass().getResourceAsStream("/golden-v1.recipio")){assertNotNull(in);Files.copy(in,golden.toPath());}
        assertEquals("6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313",LocalBackupArchive.hash(golden));
        LocalBackupArchive.Validated old=LocalBackupArchive.validate(golden);
        assertEquals(1,old.manifest.getInt("formatVersion"));assertEquals(2,old.data.getJSONArray("changes").length());
    }
    @Rule public TemporaryFolder folder = new TemporaryFolder();
    private static final byte[] PNG = new byte[] {(byte)137,80,78,71,13,10,26,10,1,2,3};
    private JSONObject empty() throws Exception {
        return new JSONObject("{\"recipes\":[],\"ingredients\":[],\"steps\":[],\"preparations\":[],\"keyTips\":[],\"changes\":[],\"cookingRecords\":[],\"settings\":{}}");
    }
    private File write(JSONObject data, List<LocalBackupArchive.Asset> assets) throws Exception {
        File output = new File(folder.newFolder(), "test.recipio");
        LocalBackupArchive.write(output, data, assets, "test-version", 11, 4);
        return output;
    }
    private Map<String,byte[]> entries(File file) throws Exception {
        Map<String,byte[]> map = new LinkedHashMap<>();
        try (ZipFile zip = new ZipFile(file)) {
            Enumeration<? extends ZipEntry> all = zip.entries();
            while (all.hasMoreElements()) { ZipEntry entry = all.nextElement(); try(InputStream in=zip.getInputStream(entry)) { map.put(entry.getName(), in.readAllBytes()); } }
        }
        return map;
    }
    private File repack(Map<String,byte[]> entries) throws Exception {
        File file = new File(folder.newFolder(), "bad.recipio");
        try (ZipOutputStream zip = new ZipOutputStream(new FileOutputStream(file))) {
            for (Map.Entry<String,byte[]> e : entries.entrySet()) { zip.putNextEntry(new ZipEntry(e.getKey())); zip.write(e.getValue()); zip.closeEntry(); }
        }
        return file;
    }
    @Test public void writesAndRereadsEmptyArchiveAndActualMetadata() throws Exception {
        File file = write(empty(), Collections.emptyList());
        LocalBackupArchive.Validated v = LocalBackupArchive.validate(file);
        assertEquals(0, v.manifest.getJSONObject("counts").getInt("recipes"));
        assertEquals("test-version", v.manifest.getString("appVersionName"));
        assertEquals(4, v.manifest.getInt("databaseSchemaVersion"));
        assertEquals(file.length(), v.size); assertEquals(LocalBackupArchive.hash(file), v.sha256);
    }
    @Test public void hashesActualMediaAndStagesNewGenerationWithoutChangingOldFile() throws Exception {
        File root = folder.newFolder(); File images = new File(root,"images"); assertTrue(images.mkdir());
        File old = new File(images,"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png"); Files.write(old.toPath(), PNG);
        List<LocalBackupArchive.Asset> assets = LocalBackupArchive.inspect(root, Collections.singletonList("images/"+old.getName()));
        assertEquals(LocalBackupArchive.hash(old), assets.get(0).assetId);
        JSONObject data = empty(); data.getJSONArray("recipes").put(new JSONObject().put("coverAssetId",assets.get(0).assetId));
        File file = write(data, assets); LocalBackupArchive.Validated v = LocalBackupArchive.validate(file);
        String generation = UUID.randomUUID().toString();
        Map<String,String> paths = LocalBackupArchive.stage(v, root, generation);
        assertArrayEquals(PNG, Files.readAllBytes(new File(root,paths.get(assets.get(0).assetId)).toPath()));
        assertArrayEquals(PNG, Files.readAllBytes(old.toPath()));
        assertThrows(IOException.class, () -> LocalBackupArchive.stage(v,root,generation));
    }
    @Test public void completeV2ArchiveStagesCurrentHistoricalAndSharedCookingMediaIntoIndependentRoot() throws Exception {
        // Frozen, generated v1 fixture: two recipes, complete details, two changes
        // and three distinct PNGs. No user archive or Android app directory is used.
        File golden = new File(folder.newFolder(), "golden-v1.recipio");
        try (InputStream in = getClass().getResourceAsStream("/golden-v1.recipio")) {
            assertNotNull(in); Files.copy(in, golden.toPath());
        }
        assertEquals("6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313", LocalBackupArchive.hash(golden));
        LocalBackupArchive.Validated legacy = LocalBackupArchive.validate(golden);
        JSONObject data = new JSONObject(legacy.data.toString());
        JSONObject recipe = data.getJSONArray("recipes").getJSONObject(1);
        String coverId = recipe.getString("coverAssetId");
        String stepId = data.getJSONArray("steps").getJSONObject(1).getString("imageAssetId");
        String historicalId = data.getJSONArray("changes").getJSONObject(1)
            .getJSONObject("before").getString("coverAssetId");
        assertEquals(3, new HashSet<>(Arrays.asList(coverId, stepId, historicalId)).size());
        data.put("cookingRecords", new JSONArray().put(new JSONObject()
            .put("id", "00000000-0000-4000-8000-000000000001")
            .put("recipeId", recipe.getString("id"))
            .put("cookedAt", "2026-10-26T00:00:00.000Z")
            .put("finishedPhotoAssetId", coverId)
            .put("evaluation", "tasty")
            .put("note", "合成成品记录\n与封面共用图片 🍗")));

        File sourceRoot = folder.newFolder(), destinationRoot = folder.newFolder();
        assertNotEquals(sourceRoot.getCanonicalPath(), destinationRoot.getCanonicalPath());
        File sourceImages = new File(sourceRoot, "images"); assertTrue(sourceImages.mkdir());
        Map<String, byte[]> goldenEntries = entries(golden);
        Map<String, byte[]> originalBytes = new LinkedHashMap<>();
        List<String> sourcePaths = new ArrayList<>();
        String sharedCoverPath = null;
        for (LocalBackupArchive.Asset asset : legacy.assets) {
            String sourcePath = "images/" + UUID.randomUUID() + ".png";
            byte[] bytes = goldenEntries.get(asset.path); assertNotNull(bytes);
            Files.write(new File(sourceRoot, sourcePath).toPath(), bytes);
            sourcePaths.add(sourcePath); originalBytes.put(asset.assetId, bytes);
            if (asset.assetId.equals(coverId)) sharedCoverPath = sourcePath;
        }
        // A shared reference must not create another physical media member.
        assertNotNull(sharedCoverPath); sourcePaths.add(sharedCoverPath);
        List<LocalBackupArchive.Asset> assets = LocalBackupArchive.inspect(sourceRoot, sourcePaths);
        assertEquals(3, assets.size());
        File archive = write(data, assets);
        LocalBackupArchive.Validated checked = LocalBackupArchive.validate(archive);
        JSONObject counts = checked.manifest.getJSONObject("counts");
        assertEquals(2, checked.manifest.getInt("formatVersion"));
        assertEquals(4, checked.manifest.getInt("databaseSchemaVersion"));
        assertEquals(2, counts.getInt("recipes")); assertEquals(3, counts.getInt("ingredients"));
        assertEquals(3, counts.getInt("steps")); assertEquals(1, counts.getInt("preparations"));
        assertEquals(1, counts.getInt("keyTips")); assertEquals(2, counts.getInt("changes"));
        assertEquals(1, counts.getInt("cookingRecords")); assertEquals(3, counts.getInt("media"));
        assertEquals(5, entries(archive).size());
        assertJsonValueEquals("data", data, checked.data);
        assertEquals(coverId, checked.data.getJSONArray("cookingRecords")
            .getJSONObject(0).getString("finishedPhotoAssetId"));

        File destinationImages = new File(destinationRoot, "images"); assertTrue(destinationImages.mkdir());
        File retainedImage = new File(destinationImages, "ffffffff-ffff-ffff-ffff-ffffffffffff.png");
        byte[] retainedBytes = new byte[] {9, 8, 7}; Files.write(retainedImage.toPath(), retainedBytes);
        String generation = UUID.randomUUID().toString();
        Map<String, String> paths = LocalBackupArchive.stage(checked, destinationRoot, generation);
        assertEquals(new HashSet<>(Arrays.asList(coverId, stepId, historicalId)), paths.keySet());
        for (LocalBackupArchive.Asset asset : assets) {
            File staged = new File(destinationRoot, paths.get(asset.assetId));
            assertTrue(paths.get(asset.assetId).startsWith("images/generation-" + generation + "/"));
            assertArrayEquals(originalBytes.get(asset.assetId), Files.readAllBytes(staged.toPath()));
            assertEquals(asset.assetId, LocalBackupArchive.hash(staged));
            assertEquals(asset.size, staged.length());
            assertArrayEquals(originalBytes.get(asset.assetId), Files.readAllBytes(asset.source.toPath()));
        }
        assertArrayEquals(retainedBytes, Files.readAllBytes(retainedImage.toPath()));
        assertEquals("6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313", LocalBackupArchive.hash(golden));
    }
    @Test public void rejectsTruncatedCentralDirectoryNonZipAndTrailingBytes() throws Exception {
        byte[] valid = Files.readAllBytes(write(empty(), Collections.emptyList()).toPath());
        for (byte[] bad : new byte[][] {new byte[0],{1,2,3},Arrays.copyOf(valid,valid.length-10),Arrays.copyOf(valid,valid.length+1)}) {
            File file = folder.newFile(); Files.write(file.toPath(),bad);
            assertThrows(IOException.class, () -> LocalBackupArchive.validate(file));
        }
    }
    @Test public void rejectsUnknownTraversalAbsoluteBackslashAndMissingEntries() throws Exception {
        Map<String,byte[]> original = entries(write(empty(),Collections.emptyList()));
        for (String name : new String[] {"../evil","/evil","media\\evil","media/extra.png","other.json","x\u0000y"}) {
            Map<String,byte[]> map = new LinkedHashMap<>(original); map.put(name,new byte[]{1});
            File file = repack(map); assertThrows(IOException.class, () -> LocalBackupArchive.validate(file));
        }
        for (String name : new String[]{"manifest.json","data.json"}) { Map<String,byte[]> map=new LinkedHashMap<>(original); map.remove(name); File file=repack(map); assertThrows(IOException.class, () -> LocalBackupArchive.validate(file)); }
    }
    @Test public void rejectsWrongHashSizeCountsAndFutureFormat() throws Exception {
        Map<String,byte[]> original = entries(write(empty(),Collections.emptyList()));
        for (String defect : new String[]{"hash","size","counts","version"}) {
            JSONObject manifest = new JSONObject(new String(original.get("manifest.json"),"UTF-8"));
            if(defect.equals("hash"))manifest.getJSONObject("dataFile").put("sha256","f".repeat(64));
            if(defect.equals("size"))manifest.getJSONObject("dataFile").put("size",1);
            if(defect.equals("counts"))manifest.getJSONObject("counts").put("recipes",1);
            if(defect.equals("version"))manifest.put("formatVersion",3);
            Map<String,byte[]> map=new LinkedHashMap<>(original); map.put("manifest.json",manifest.toString().getBytes("UTF-8")); File file=repack(map);
            assertThrows(IOException.class, () -> LocalBackupArchive.validate(file));
        }
    }
    // Android's JSONObject does not expose the desktop library's similar().
    // Compare object keys without ordering them; array order remains significant.
    private static void assertJsonValueEquals(String path, Object expected, Object actual) throws Exception {
        if (expected instanceof JSONObject) {
            assertTrue(path, actual instanceof JSONObject);
            JSONObject left = (JSONObject) expected, right = (JSONObject) actual;
            assertEquals(path, left.length(), right.length());
            for (Iterator<String> keys = left.keys(); keys.hasNext();) {
                String key = keys.next();
                assertTrue(path + "." + key, right.has(key));
                assertJsonValueEquals(path + "." + key, left.get(key), right.get(key));
            }
        } else if (expected instanceof JSONArray) {
            assertTrue(path, actual instanceof JSONArray);
            JSONArray left = (JSONArray) expected, right = (JSONArray) actual;
            assertEquals(path, left.length(), right.length());
            for (int i = 0; i < left.length(); i++) {
                assertJsonValueEquals(path + "[" + i + "]", left.get(i), right.get(i));
            }
        } else if (expected instanceof Number) {
            assertTrue(path, actual instanceof Number);
            assertEquals(path, 0, new java.math.BigDecimal(expected.toString())
                .compareTo(new java.math.BigDecimal(actual.toString())));
        } else {
            assertEquals(path, expected, actual);
        }
    }
    @Test public void rejectsUnsafeSourceFilesAndDisguisedMime() throws Exception {
        File root = folder.newFolder(); assertTrue(new File(root,"images").mkdir()); Files.write(new File(root,"images/aaaa.png").toPath(),new byte[]{1,2,3});
        for(String path:new String[]{"../x","images/../x","images/aaaa.png"}) assertThrows(IOException.class, () -> LocalBackupArchive.inspect(root,Collections.singletonList(path)));
    }
    @Test public void strictJsonRejectsDuplicateFieldsInvalidUtf8AndDepthBombs() throws Exception {
        for(byte[] bytes:new byte[][] {"{\"x\":1,\"x\":2}".getBytes("UTF-8"),"{'x':1}".getBytes("UTF-8"),"{\"x\":NaN}".getBytes("UTF-8"),new byte[]{(byte)0xc0,(byte)0x80},("{\"x\":"+"[".repeat(33)+"0"+"]".repeat(33)+"}").getBytes("UTF-8")}) assertThrows(IOException.class, () -> LocalBackupArchive.parseJson(bytes));
    }
    @Test public void enforcesActualStreamSizeAndCleansPartialCopies() throws Exception {
        File target = new File(folder.newFolder(),"input.part");
        assertThrows(IOException.class, () -> LocalBackupArchive.copyInput(new ByteArrayInputStream(new byte[5]),target,4)); assertFalse(target.exists());
        InputStream broken=new InputStream(){ @Override public int read()throws IOException{throw new IOException("lost source");} };
        assertThrows(IOException.class, () -> LocalBackupArchive.copyInput(broken,target,100)); assertFalse(target.exists());
        InputStream closeFails=new ByteArrayInputStream(new byte[]{1}){ @Override public void close()throws IOException{throw new IOException("close failed");} };
        assertThrows(IOException.class, () -> LocalBackupArchive.copyInput(closeFails,target,100)); assertFalse(target.exists());
    }
    @Test public void externalWriteOrCloseFailureNeverReportsSuccess() throws Exception {
        File source=write(empty(),Collections.emptyList());
        OutputStream failed=new OutputStream(){ @Override public void write(int b)throws IOException{throw new IOException("full");} };
        assertThrows(IOException.class, () -> LocalBackupArchive.copyToOutput(source,failed));
        OutputStream closeFails=new ByteArrayOutputStream(){ @Override public void close()throws IOException{throw new IOException("close");} };
        assertThrows(IOException.class, () -> LocalBackupArchive.copyToOutput(source,closeFails));
        assertNotNull(LocalBackupArchive.validate(source));
    }
    @Test public void neverDeletesOrOverwritesAnExistingBackup() throws Exception {
        File existing=folder.newFile();byte[] old=new byte[]{9,8,7};Files.write(existing.toPath(),old);
        assertThrows(IOException.class, () -> LocalBackupArchive.write(existing,empty(),Collections.emptyList(),"test",11,4));
        assertArrayEquals(old,Files.readAllBytes(existing.toPath()));
    }
    @Test public void rejectsDuplicateCentralNamesWrongCrcAndFalseLength()throws Exception {
        byte[] original=Files.readAllBytes(write(empty(),Collections.emptyList()).toPath());
        for(int defect=0;defect<3;defect++){
            byte[] bad=original.clone();List<Integer> central=new ArrayList<>();
            for(int i=0;i<bad.length-4;i++)if(bad[i]==80&&bad[i+1]==75&&bad[i+2]==1&&bad[i+3]==2)central.add(i);
            assertEquals(2,central.size());int at=central.get(1);
            if(defect==0){byte[] name="data.json".getBytes("UTF-8");System.arraycopy(name,0,bad,central.get(0)+46,name.length);bad[central.get(0)+28]=9;bad[central.get(0)+29]=0;}
            if(defect==1)bad[at+16]^=1;
            if(defect==2)bad[at+24]^=1;
            File file=folder.newFile();Files.write(file.toPath(),bad);assertThrows(IOException.class,()->LocalBackupArchive.validate(file));
        }
    }
    @Test public void mediaMissingCorruptionMimeAndOversizeAreRejected()throws Exception {
        File root=folder.newFolder();assertTrue(new File(root,"images").mkdir());File image=new File(root,"images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png");Files.write(image.toPath(),PNG);
        List<LocalBackupArchive.Asset> assets=LocalBackupArchive.inspect(root,Collections.singletonList("images/"+image.getName()));Map<String,byte[]> original=entries(write(empty(),assets));String path=assets.get(0).path;
        for(int defect=0;defect<4;defect++){
            Map<String,byte[]> map=new LinkedHashMap<>(original);JSONObject manifest=new JSONObject(new String(map.get("manifest.json"),"UTF-8"));
            if(defect==0)map.remove(path);if(defect==1)map.put(path,new byte[]{1,2,3});
            if(defect==2)manifest.getJSONArray("media").getJSONObject(0).put("mimeType","image/jpeg");
            if(defect==3)manifest.getJSONArray("media").getJSONObject(0).put("size",LocalBackupArchive.MAX_BYTES+1);
            map.put("manifest.json",manifest.toString().getBytes("UTF-8"));File file=repack(map);assertThrows(IOException.class,()->LocalBackupArchive.validate(file));assertArrayEquals(PNG,Files.readAllBytes(image.toPath()));
        }
    }
    @Test public void acceptedImageSignaturesPreserveExactBytes()throws Exception {
        byte[][] bytes={PNG,new byte[]{(byte)255,(byte)216,(byte)255,1},"RIFF0000WEBP1234".getBytes("US-ASCII"),new byte[]{0,0,0,16,'f','t','y','p','a','v','i','f',0,0,0,0}};
        String[] extensions={"png","jpg","webp","avif"};File root=folder.newFolder();assertTrue(new File(root,"images").mkdir());
        for(int i=0;i<bytes.length;i++){
            String path="images/"+UUID.randomUUID()+"."+extensions[i];File image=new File(root,path);Files.write(image.toPath(),bytes[i]);List<LocalBackupArchive.Asset> assets=LocalBackupArchive.inspect(root,Collections.singletonList(path));File archive=write(empty(),assets);
            Map<String,String> staged=LocalBackupArchive.stage(LocalBackupArchive.validate(archive),root,UUID.randomUUID().toString());assertEquals(LocalBackupArchive.hash(image),LocalBackupArchive.hash(new File(root,staged.get(assets.get(0).assetId))));
        }
    }
}
