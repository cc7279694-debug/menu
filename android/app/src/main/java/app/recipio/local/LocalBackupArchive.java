package app.recipio.local;

import com.google.gson.Strictness;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.security.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.zip.*;
import org.json.*;

/** No database writes. Bounded ZIP/JSON validation and immutable media staging. */
final class LocalBackupArchive {
    static final long MAX_BYTES = 4294967296L;
    static final int BUFFER = 65536, MAX_DATA = 16777216, MAX_MANIFEST = 1048576;
    static final String SOURCE_PATH = "images/(?:[a-fA-F0-9-]+|generation-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/[a-fA-F0-9]{64})\\.(jpg|png|webp|avif)";
    static final String[] DATA_KEYS = {"recipes","ingredients","steps","preparations","keyTips","changes"};
    static class Asset {
        final String assetId, path, mimeType, sha256, sourcePath;
        final long size; final File source;
        Asset(String hash, String extension, long length, String local, File file) {
            assetId=hash; sha256=hash; path="media/"+hash+"."+extension; size=length; sourcePath=local; source=file;
            mimeType=extension.equals("jpg")?"image/jpeg":"image/"+extension;
        }
        JSONObject json() throws JSONException { return new JSONObject().put("assetId",assetId).put("path",path).put("mimeType",mimeType).put("size",size).put("sha256",sha256); }
    }
    static class Validated {
        final File file; final JSONObject manifest,data; final List<Asset> assets; final long size; final String sha256;
        Validated(File file,JSONObject manifest,JSONObject data,List<Asset> assets)throws IOException { this.file=file;this.manifest=manifest;this.data=data;this.assets=assets;size=file.length();sha256=hash(file); }
    }
    static class Digest {
        final long size, crc; final String hash;
        Digest(long size,long crc,String hash){this.size=size;this.crc=crc;this.hash=hash;}
    }
    private static IOException invalid(String detail) { return new IOException("备份文件无效："+detail); }
    static String now() { SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.ROOT);format.setTimeZone(TimeZone.getTimeZone("UTC"));return format.format(new Date()); }
    private static MessageDigest sha() { try{return MessageDigest.getInstance("SHA-256");}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);} }
    private static String hex(byte[] bytes) { StringBuilder b=new StringBuilder();for(byte v:bytes)b.append(String.format(Locale.ROOT,"%02x",v&255));return b.toString(); }
    static Digest transfer(InputStream in,OutputStream out,long limit)throws IOException {
        byte[] buffer=new byte[BUFFER];long size=0;MessageDigest digest=sha();CRC32 crc=new CRC32();int n;
        while((n=in.read(buffer))!=-1) { if(n==0)continue;if(n>limit-size)throw invalid("超过资源上限或设备空间不足");size+=n;digest.update(buffer,0,n);crc.update(buffer,0,n);if(out!=null)out.write(buffer,0,n); }
        return new Digest(size,crc.getValue(),hex(digest.digest()));
    }
    static String hash(File file)throws IOException {try(InputStream in=new FileInputStream(file)){return transfer(in,null,MAX_BYTES).hash;} }
    static File mediaFile(File root,String path)throws IOException {
        if(path==null||!path.matches(SOURCE_PATH))throw invalid("图片路径");
        File file=new File(root,path);File canonical=file.getCanonicalFile();
        if(!canonical.equals(file.getAbsoluteFile())||!canonical.getPath().startsWith(root.getCanonicalPath()+File.separator)||!file.isFile())throw invalid("图片不存在或不是私有常规文件");
        return file;
    }
    static List<Asset> inspect(File root,List<String> paths)throws IOException {
        List<Asset> assets=new ArrayList<>();long total=0;Set<String> distinct=new HashSet<>();
        for(String path:new LinkedHashSet<>(paths)) { File file=mediaFile(root,path);String ext=sniff(file);String named=path.substring(path.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);if(!ext.equals(named))throw invalid("图片格式与后缀不一致");
            Digest d;try(InputStream in=new FileInputStream(file)){d=transfer(in,null,MAX_BYTES);}if(distinct.add(d.hash)){if(d.size>MAX_BYTES-total||distinct.size()>10000)throw invalid("图片数量或总大小超过上限");total+=d.size;}if(d.size==0)throw invalid("空图片");assets.add(new Asset(d.hash,ext,d.size,path,file));
        }return assets;
    }
    private static String sniff(File file)throws IOException { byte[] head=new byte[64];int n;try(InputStream in=new FileInputStream(file)){n=in.read(head);}return sniff(head,n); }
    private static String sniff(byte[] h,int n)throws IOException {
        if(n>=8&&(h[0]&255)==137&&h[1]==80&&h[2]==78&&h[3]==71&&h[4]==13&&h[5]==10&&h[6]==26&&h[7]==10)return "png";
        if(n>=3&&(h[0]&255)==255&&(h[1]&255)==216&&(h[2]&255)==255)return "jpg";
        if(n>=12&&ascii(h,0,4).equals("RIFF")&&ascii(h,8,4).equals("WEBP"))return "webp";
        if(n>=16&&ascii(h,4,4).equals("ftyp")){for(int i=8;i+4<=n;i+=4)if(ascii(h,i,4).equals("avif")||ascii(h,i,4).equals("avis"))return "avif";}
        throw invalid("不支持或伪装的图片格式");
    }
    private static String ascii(byte[] bytes,int at,int len){return new String(bytes,at,len,StandardCharsets.US_ASCII);}
    static JSONObject parseJson(byte[] bytes)throws IOException {
        try {
            String text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            try(JsonReader reader=new JsonReader(new StringReader(text))){reader.setStrictness(Strictness.STRICT);if(reader.peek()!=JsonToken.BEGIN_OBJECT)throw invalid("JSON根必须为对象");checkJson(reader,0);if(reader.peek()!=JsonToken.END_DOCUMENT)throw invalid("JSON尾部内容");}
            return new JSONObject(text);
        } catch(JSONException|IllegalStateException|NumberFormatException e){throw invalid("JSON结构");}
    }
    private static void checkJson(JsonReader reader,int depth)throws IOException {
        if(depth>32)throw invalid("JSON嵌套超过上限");
        switch(reader.peek()) {
            case BEGIN_OBJECT: reader.beginObject();Set<String> names=new HashSet<>();while(reader.hasNext()){if(!names.add(reader.nextName()))throw invalid("重复JSON字段");checkJson(reader,depth+1);}reader.endObject();break;
            case BEGIN_ARRAY:reader.beginArray();while(reader.hasNext())checkJson(reader,depth+1);reader.endArray();break;
            case STRING:case NUMBER:reader.nextString();break;
            case BOOLEAN:reader.nextBoolean();break;
            case NULL:reader.nextNull();break;
            default:throw invalid("JSON标记");
        }
    }
    private static void keys(JSONObject object,String... names)throws IOException {
        Set<String> expected=new HashSet<>(Arrays.asList(names));Set<String> actual=new HashSet<>();Iterator<String> iter=object.keys();while(iter.hasNext())actual.add(iter.next());if(!actual.equals(expected))throw invalid("字段集合");
    }
    private static long integer(JSONObject obj,String name,long max)throws IOException,JSONException {Object raw=obj.get(name);if(!(raw instanceof Number))throw invalid("非整数");double value=((Number)raw).doubleValue();if(!Double.isFinite(value)||value<0||value>max||value!=Math.floor(value))throw invalid("整数超出范围");return ((Number)raw).longValue();}
    private static void time(JSONObject obj,String key)throws IOException,JSONException {String value=obj.getString(key);if(!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z"))throw invalid("时间");try{SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone("UTC"));f.setLenient(false);if(!f.format(f.parse(value)).equals(value))throw invalid("时间");}catch(java.text.ParseException e){throw invalid("时间");} }
    private static byte[] read(ZipFile zip,ZipEntry entry,int max)throws IOException {if(entry==null)throw invalid("缺少必需文件");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=zip.getInputStream(entry)){Digest d=transfer(in,out,max);if(d.size!=entry.getSize()||d.crc!=entry.getCrc())throw invalid("文件长度或CRC");}return out.toByteArray();}
    private static void checkEnd(File file)throws IOException {
        if(!file.isFile()||file.length()<22||file.length()>MAX_BYTES)throw invalid("不是有效ZIP或超过上限");
        try(RandomAccessFile in=new RandomAccessFile(file,"r")){in.seek(file.length()-22);byte[] e=new byte[22];in.readFully(e);if(e[0]!=80||e[1]!=75||e[2]!=5||e[3]!=6||e[4]!=0||e[5]!=0||e[6]!=0||e[7]!=0||e[20]!=0||e[21]!=0)throw invalid("中央目录截断或额外尾部内容");long size=uint32(e,12),offset=uint32(e,16);if(size+offset!=file.length()-22)throw invalid("中央目录长度");}
    }
    private static long uint32(byte[] b,int at){long n=0;for(int i=0;i<4;i++)n|=((long)b[at+i]&255)<<(8*i);return n;}
    static Validated validate(File file)throws IOException {
        checkEnd(file);
        try(ZipFile zip=new ZipFile(file)) {
            Map<String,ZipEntry> entries=new HashMap<>();Enumeration<? extends ZipEntry> all=zip.entries();
            while(all.hasMoreElements()){ZipEntry entry=all.nextElement();String name=entry.getName();if(entries.size()>=10002||name.length()>128||entry.isDirectory()||!(name.equals("manifest.json")||name.equals("data.json")||name.matches("media/[a-f0-9]{64}\\.(jpg|png|webp|avif)"))||entries.put(name,entry)!=null)throw invalid("非法或重复ZIP路径");}
            byte[] manifestBytes=read(zip,entries.get("manifest.json"),MAX_MANIFEST);JSONObject manifest=parseJson(manifestBytes);
            keys(manifest,"format","formatVersion","createdAt","appVersionName","appVersionCode","databaseSchemaVersion","dataFile","media","counts");
            if(!manifest.getString("format").equals("recipio-backup")||integer(manifest,"formatVersion",2147483647)!=1||integer(manifest,"databaseSchemaVersion",2147483647)!=3)throw invalid("不支持的备份版本，请使用匹配版本的谱序");
            time(manifest,"createdAt");if(manifest.getString("appVersionName").isEmpty()||manifest.getString("appVersionName").length()>100||integer(manifest,"appVersionCode",2147483647)<1)throw invalid("应用版本");
            JSONObject dataFile=manifest.getJSONObject("dataFile");keys(dataFile,"path","size","sha256");if(!dataFile.getString("path").equals("data.json"))throw invalid("数据路径");
            byte[] dataBytes=read(zip,entries.get("data.json"),MAX_DATA);if(integer(dataFile,"size",MAX_DATA)!=dataBytes.length||!hex(sha().digest(dataBytes)).equals(dataFile.getString("sha256")))throw invalid("数据哈希或长度");
            JSONObject data=parseJson(dataBytes);keys(data,"recipes","ingredients","steps","preparations","keyTips","changes","settings");keys(data.getJSONObject("settings"));
            JSONObject counts=manifest.getJSONObject("counts");keys(counts,"recipes","ingredients","steps","preparations","keyTips","changes","media");
            for(String name:DATA_KEYS){int max=name.equals("recipes")?10000:name.equals("changes")?20000:100000;if(integer(counts,name,max)!=data.getJSONArray(name).length())throw invalid("数据数量");}
            JSONArray media=manifest.getJSONArray("media");if(media.length()>10000||integer(counts,"media",10000)!=media.length()||entries.size()!=media.length()+2)throw invalid("媒体数量或额外文件");
            List<Asset> assets=new ArrayList<>();Set<String> ids=new HashSet<>();long total=dataBytes.length+manifestBytes.length;
            for(int i=0;i<media.length();i++){JSONObject m=media.getJSONObject(i);keys(m,"assetId","path","mimeType","size","sha256");String id=m.getString("assetId"),path=m.getString("path");if(!id.matches("[a-f0-9]{64}")||!ids.add(id)||!id.equals(m.getString("sha256")))throw invalid("重复或无效媒体ID");String ext=path.substring(path.lastIndexOf('.')+1);String mime=ext.equals("jpg")?"image/jpeg":"image/"+ext;if(!path.equals("media/"+id+"."+ext)||!mime.equals(m.getString("mimeType")))throw invalid("媒体路径或类型");ZipEntry entry=entries.get(path);if(entry==null)throw invalid("缺少媒体");
                long declared=integer(m,"size",MAX_BYTES);if(declared<1)throw invalid("空媒体");byte[] head=new byte[64];int headSize;
                try(InputStream in=zip.getInputStream(entry)){headSize=in.read(head);}if(!sniff(head,headSize).equals(ext))throw invalid("媒体签名");
                Digest d;try(InputStream in=zip.getInputStream(entry)){d=transfer(in,null,MAX_BYTES-total);}if(d.size!=declared||d.size!=entry.getSize()||d.crc!=entry.getCrc()||!d.hash.equals(id))throw invalid("媒体哈希、CRC或长度");total+=d.size;assets.add(new Asset(id,ext,d.size,null,null));
            }
            return new Validated(file,manifest,data,assets);
        }catch(JSONException|IllegalArgumentException e){throw invalid("容器结构或必需字段");}
    }
    static void write(File target,JSONObject data,List<Asset> input,String version,int code,int schema)throws IOException {
        if(schema!=3||code<1)throw invalid("导出版本");boolean created=false;
        try {
            byte[] bytes=data.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>MAX_DATA)throw invalid("数据超过上限");parseJson(bytes);
            Map<String,Asset> unique=new LinkedHashMap<>();for(Asset asset:input){Asset old=unique.put(asset.assetId,asset);if(old!=null&&!old.mimeType.equals(asset.mimeType))throw invalid("媒体类型冲突");}
            if(unique.size()>10000)throw invalid("图片数量");
            JSONObject manifest=new JSONObject().put("format","recipio-backup").put("formatVersion",1).put("createdAt",now()).put("appVersionName",version).put("appVersionCode",code).put("databaseSchemaVersion",schema).put("dataFile",new JSONObject().put("path","data.json").put("size",bytes.length).put("sha256",hex(sha().digest(bytes))));
            JSONArray media=new JSONArray();for(Asset asset:unique.values())media.put(asset.json());manifest.put("media",media);JSONObject counts=new JSONObject();for(String name:DATA_KEYS)counts.put(name,data.getJSONArray(name).length());counts.put("media",media.length());manifest.put("counts",counts);
            byte[] manifestBytes=manifest.toString().getBytes(StandardCharsets.UTF_8);if(manifestBytes.length>MAX_MANIFEST)throw invalid("清单超过上限");
            if(!target.createNewFile())throw invalid("禁止覆盖已有备份");
            created=true;
            try(FileOutputStream out=new FileOutputStream(target);ZipOutputStream zip=new ZipOutputStream(out)) {
                entry(zip,"manifest.json",manifestBytes);entry(zip,"data.json",bytes);long total=bytes.length+manifestBytes.length;
                for(Asset asset:unique.values()){zip.putNextEntry(new ZipEntry(asset.path));try(InputStream in=new FileInputStream(asset.source)){Digest d=transfer(in,zip,MAX_BYTES-total);total+=d.size;if(d.size!=asset.size||!d.hash.equals(asset.assetId))throw invalid("源图片在导出期间发生变化");}zip.closeEntry();if(target.length()>MAX_BYTES)throw invalid("压缩包超过上限");}
                zip.finish();zip.flush();out.getFD().sync();
            }
            validate(target);
        }catch(IOException|JSONException|RuntimeException e){ if(created&&target.exists()&&!target.delete())e.addSuppressed(new IOException("临时备份清理失败"));if(e instanceof IOException)throw(IOException)e;throw invalid("导出内容"); }
    }
    private static void entry(ZipOutputStream zip,String name,byte[] bytes)throws IOException{zip.putNextEntry(new ZipEntry(name));zip.write(bytes);zip.closeEntry();}
    static void copyInput(InputStream source,File target,long limit)throws IOException {
        boolean created=false;
        try(InputStream in=source){if(in==null)throw invalid("无法读取文件");if(!target.createNewFile())throw invalid("禁止覆盖文件");created=true;try(FileOutputStream out=new FileOutputStream(target)){transfer(in,out,limit);out.getFD().sync();}}
        catch(IOException|RuntimeException e){if(created&&target.exists()&&!target.delete())e.addSuppressed(new IOException("临时输入清理失败"));throw e;}
    }
    static void copyToOutput(File source,OutputStream destination)throws IOException {
        try(InputStream in=new FileInputStream(source);OutputStream out=destination){if(out==null)throw invalid("无法保存文件");Digest d=transfer(in,out,MAX_BYTES);if(d.size!=source.length())throw invalid("写入不完整");out.flush();}
    }
    static Map<String,String> stage(Validated validated,File root,String generation)throws IOException {
        if(!generation.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))throw invalid("generation");
        File images=new File(root,"images");if(!images.exists()&&!images.mkdir())throw invalid("图片目录不可写");File dir=new File(images,"generation-"+generation);if(!dir.mkdir())throw invalid("禁止覆盖已有图片目录");
        Map<String,String> paths=new LinkedHashMap<>();
        try(ZipFile zip=new ZipFile(validated.file)){long total=0;for(Asset asset:validated.assets){if(asset.size>Math.max(0,root.getUsableSpace()-33554432L))throw invalid("设备空间不足");String name=asset.path.substring("media/".length());File target=new File(dir,name);copyInput(zip.getInputStream(zip.getEntry(asset.path)),target,MAX_BYTES-total);total+=target.length();if(target.length()!=asset.size||!hash(target).equals(asset.assetId))throw invalid("图片暂存回读失败");paths.put(asset.assetId,"images/generation-"+generation+"/"+name);}return paths;}
        catch(IOException|RuntimeException e){deleteOwnedTree(dir);throw e;}
    }
    static void deleteOwnedTree(File dir)throws IOException {
        File[] children=dir.listFiles();if(children!=null)for(File f:children){if(!f.getCanonicalFile().equals(f.getAbsoluteFile()))throw invalid("不清理符号链接");if(f.isDirectory())deleteOwnedTree(f);else if(!f.delete())throw new IOException("暂存文件清理失败");}if(dir.exists()&&!dir.delete())throw new IOException("暂存目录清理失败");
    }
}
