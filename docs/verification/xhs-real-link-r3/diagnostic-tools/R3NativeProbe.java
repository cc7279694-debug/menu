package app.recipio.local;

import com.google.gson.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.TimeUnit;
import okhttp3.*;

/** Local diagnostic only. Never run directly into a chat/log: stdout has a privatePage envelope.
 * The parent orchestrator must capture stdout in memory and persist only trace + parser diagnostics. */
public final class R3NativeProbe {
    private static final Gson JSON=new GsonBuilder().serializeNulls().create();
    private static final class Trace {
        final List<Map<String,Object>> dns=Collections.synchronizedList(new ArrayList<>());
        final List<Map<String,Object>> connects=Collections.synchronizedList(new ArrayList<>());
        final List<Map<String,Object>> responses=Collections.synchronizedList(new ArrayList<>());
        final List<Map<String,Object>> tls=Collections.synchronizedList(new ArrayList<>());
        final List<Map<String,Object>> failures=Collections.synchronizedList(new ArrayList<>());
        final Map<String,Set<InetAddress>> approved=Collections.synchronizedMap(new HashMap<>());
        final AtomicInteger requests=new AtomicInteger();
        volatile boolean budgetExceeded;
        String inputHost="UNAVAILABLE",inputPathType="UNAVAILABLE",finalHost="UNAVAILABLE",finalPathType="UNAVAILABLE",dnsMode="SYSTEM_PRODUCTION";
        boolean finalNoteIdPatternMatched;
        int finalHtmlUtf8Bytes;
        Map<String,Object> publicView(){
            Map<String,Object> result=map("inputHost",inputHost,"inputPathType",inputPathType,"dnsMode",dnsMode,
                "httpRequestBudget",3,"httpRequestsAdmitted",requests.get(),"requestBudgetExceeded",budgetExceeded,
                "finalHost",finalHost,"finalPathType",finalPathType,"finalNoteIdPatternMatched",finalNoteIdPatternMatched,
                "finalHtmlUtf8Bytes",finalHtmlUtf8Bytes,"tlsConfiguration","DEFAULT_TRUST_AND_HOSTNAME_VERIFICATION",
                "cookieMode","NO_COOKIES","proxyMode","NO_EXPLICIT_PROXY","userAgent",SafeWebFetcher.USER_AGENT,
                "overallDeadlineMillis",20000,"decodedHtmlLimitBytes",SafeWebFetcher.MAX_BYTES,"automaticRetry",false,
                "diagnosticOnly",true,"productionSourceUsed",true);
            synchronized(dns){result.put("dns",new ArrayList<>(dns));}
            synchronized(connects){result.put("connects",new ArrayList<>(connects));}
            synchronized(responses){result.put("responses",new ArrayList<>(responses));result.put("redirectResponses",responses.stream().filter(r->((Number)r.get("status")).intValue()>=300&&((Number)r.get("status")).intValue()<400).count());}
            synchronized(tls){result.put("tls",new ArrayList<>(tls));}
            synchronized(failures){result.put("failures",new ArrayList<>(failures));}
            return result;
        }
    }
    private static Map<String,Object> map(Object... pairs){Map<String,Object> result=new LinkedHashMap<>();for(int i=0;i<pairs.length;i+=2)result.put((String)pairs[i],pairs[i+1]);return result;}
    private static String host(String host){
        String clean=host.toLowerCase(Locale.ROOT);while(clean.endsWith("."))clean=clean.substring(0,clean.length()-1);
        if(clean.contains(":")||clean.matches("[0-9.]+"))return "IP_LITERAL";
        return clean.matches("[a-z0-9][a-z0-9.-]{0,252}")?clean:"INVALID_HOST";
    }
    private static String normalize(String value){String h=value.toLowerCase(Locale.ROOT);while(h.endsWith("."))h=h.substring(0,h.length()-1);return h;}
    private static boolean note(String path){return path.matches("(?i)^/(?:explore|discovery/item)/[a-z0-9_-]{1,128}/?$");}
    private static String pathType(String path){if(note(path))return "NOTE_PATH";if(path.matches("(?i)^/o/[^/]+/?$"))return "SHORT_SHARE_PATH";if(path.matches("(?i)^/login(?:/.*)?$"))return "LOGIN_PATH";if(path.equals("/"))return "ROOT";return "OTHER";}
    private static String ipClass(InetAddress a){
        if(a==null)return "INVALID";byte[] b=a.getAddress();int offset=0;
        if(b.length==16){boolean mapped=true;for(int i=0;i<10;i++)mapped&=b[i]==0;mapped&=(b[10]&255)==255&&(b[11]&255)==255;if(mapped)offset=12;else return WebUrlSafety.isGlobal(a)?"GLOBAL_IPV6":"NON_PUBLIC_IPV6";}
        if((b[offset]&255)==198&&((b[offset+1]&255)==18||(b[offset+1]&255)==19))return "FAKE_IP_BENCHMARK";
        return WebUrlSafety.isGlobal(a)?"GLOBAL_IPV4":"NON_PUBLIC_IPV4";
    }
    private static String exceptionClass(Throwable error){String name=error.getClass().getSimpleName();return name.matches("[A-Za-z0-9_$]{1,100}")?name:"EXCEPTION";}
    private static String tlsFailure(Throwable error){String name=exceptionClass(error);if(name.contains("SSLHandshake")||name.contains("Certificate"))return "TLS_TRUST_OR_HANDSHAKE";if(name.contains("SSLPeerUnverified"))return "TLS_HOSTNAME_OR_PEER";if(name.startsWith("SSL"))return "TLS_OTHER";return "NOT_ESTABLISHED_BY_EXCEPTION";}
    private static String runId(String value)throws IOException {if(value==null||!value.matches("[A-Za-z][A-Za-z0-9_-]{0,63}"))throw new IOException("invalid_run_id");return value;}
    private static Path toolsDirectory()throws Exception {return Path.of(R3NativeProbe.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toAbsolutePath().getParent();}
    private static void emit(Map<String,Object> trace,Map<String,Object> privatePage,String errorCode,String id){
        Map<String,Object> safe=new LinkedHashMap<>(trace);safe.put("diagnosticRunId",id);safe.put("safeTraceSidecarWritten",true);
        try{
            Path sidecar=toolsDirectory().resolve("r3-safe-"+runId(id)+".json");
            // Persist request counts and safe classifications BEFORE constructing/encoding private output.
            byte[] safeBytes=(JSON.toJson(map("trace",safe,"errorCode",errorCode))+"\n").getBytes(StandardCharsets.UTF_8);
            Files.write(sidecar,safeBytes,StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);
        }catch(Exception failure){
            safe.put("safeTraceSidecarWritten",false);safe.put("sidecarFailureClass",exceptionClass(failure));
            errorCode="diagnostic_sidecar_error";privatePage=null;
        }
        Map<String,Object> envelope=map("trace",safe,"privatePage",privatePage,"errorCode",errorCode);
        // PrintStream's Windows/native charset must never transcode the JSON protocol.
        byte[] utf8=(JSON.toJson(envelope)+"\n").getBytes(StandardCharsets.UTF_8);
        System.out.write(utf8,0,utf8.length);System.out.flush();
        if(System.out.checkError())System.exit(3);
    }
    private static void selftest(String id){
        String target="synthetic-r3-note";
        Map<String,Object> note=map("noteId",target,"title","合成中文🍚菜谱","desc","鸡肉500克，椰子🥥2个。\n1. 洗净鸡肉。\n2. 加水煮20分钟。","type","normal","imageList",Collections.emptyList());
        String html="<html><head><title>合成中文🍚菜谱</title></head><body><script>window.__INITIAL_STATE__="+JSON.toJson(map("note",map("noteDetailMap",map(target,map("note",note)))))+";</script></body></html>";
        Map<String,Object> trace=map("mode","SELFTEST_NOT_REAL_EVIDENCE","selftestMode",true,"networkExecuted",false,"productionSourceUsed",false,
            "dnsMode","NOT_USED_SELFTEST","httpRequestsAdmitted",0,"dns",Collections.emptyList(),"responses",Collections.emptyList());
        emit(trace,map("html",html,"finalUrl","https://www.xiaohongshu.com/explore/"+target,"contentType","text/html"),null,id);
    }
    private static List<InetAddress> diagnosticDoh(Path tools,String requested)throws UnknownHostException {
        Process child=null;
        try{
            Path helper=tools.resolve("doh-cli.mjs");if(!Files.isRegularFile(helper))throw new IOException("helper_unavailable");
            child=new ProcessBuilder("C:\\Program Files\\nodejs\\node.exe",helper.toString(),requested).redirectError(ProcessBuilder.Redirect.DISCARD).start();
            if(!child.waitFor(11000,TimeUnit.MILLISECONDS))throw new IOException("dns_timeout");
            // CLI emits <=64 numeric strings, under the platform pipe capacity; never URL/HTML.
            byte[] bytes=child.getInputStream().readNBytes(8193);if(bytes.length>8192||child.exitValue()!=0)throw new IOException("dns_unavailable");
            JsonObject reply=JsonParser.parseString(new String(bytes,StandardCharsets.UTF_8)).getAsJsonObject();
            JsonArray addresses=reply.getAsJsonArray("addresses");if(addresses==null||addresses.isEmpty()||addresses.size()>64)throw new IOException("dns_unavailable");
            List<InetAddress> result=new ArrayList<>();
            for(JsonElement entry:addresses){
                String address=entry.getAsString();if(!address.matches("[0-9a-fA-F:.]{2,80}"))throw new IOException("dns_unavailable");
                if(!address.contains(":")){
                    String[] fields=address.split("\\.",-1);if(fields.length!=4)throw new IOException("dns_unavailable");byte[] raw=new byte[4];
                    for(int i=0;i<4;i++){int value=Integer.parseInt(fields[i]);if(value<0||value>255)throw new IOException("dns_unavailable");raw[i]=(byte)value;}result.add(InetAddress.getByAddress(raw));
                }else result.add(InetAddress.getByName(address));
            }
            // Validation remains in observedDns + actual production SafeWebFetcher; no unsafe-answer fallback.
            return result;
        }catch(Exception error){if(error instanceof InterruptedException)Thread.currentThread().interrupt();throw new UnknownHostException("dns_diagnostic_unavailable");}
        finally{if(child!=null&&child.isAlive())child.destroyForcibly();}
    }
    public static void main(String[] args){
        String id="run-"+UUID.randomUUID();
        if(args.length>=1&&args[0].equals("--selftest-output")){
            try{if(args.length>2)throw new IOException("invalid_selftest");if(args.length==2)id=runId(args[1]);selftest(id);}
            catch(Exception failure){emit(map("mode","SELFTEST_NOT_REAL_EVIDENCE","selftestMode",true,"networkExecuted",false,"httpRequestsAdmitted",0),null,"input_invalid",id);}
            return;
        }
        Trace trace=new Trace();OkHttpClient base=null;SafeWebFetcher.Page page=null;String errorCode=null;
        try{
            if(args.length!=1)throw new WebImportFailure("input_invalid");
            Path config=Path.of(args[0]);if(Files.size(config)>16384)throw new WebImportFailure("input_invalid");
            JsonElement decoded=JsonParser.parseString(Files.readString(config,StandardCharsets.UTF_8));
            if(!decoded.isJsonObject())throw new WebImportFailure("input_invalid");JsonObject options=decoded.getAsJsonObject();
            if(options.has("runId"))id=runId(options.get("runId").getAsString());
            JsonElement input=options.get("url");if(input==null||!input.isJsonPrimitive()||!input.getAsJsonPrimitive().isString())throw new WebImportFailure("input_invalid");
            String dnsMode=options.has("dnsMode")?options.get("dnsMode").getAsString():"system";
            if(!dnsMode.equals("system")&&!dnsMode.equals("doh-diagnostic"))throw new WebImportFailure("input_invalid");
            trace.dnsMode=dnsMode.equals("system")?"SYSTEM_PRODUCTION":"DIAGNOSTIC_DOH_NOT_PRODUCTION";
            String url=input.getAsString();WebUrlSafety.Target target=WebUrlSafety.parse(url);
            if(!Arrays.asList("xhslink.cn","xhslink.com","xiaohongshu.com").stream().anyMatch(root->target.host.equals(root)||target.host.endsWith("."+root)))throw new WebImportFailure("input_invalid");
            trace.inputHost=host(target.host);trace.inputPathType=pathType(target.uri.getPath());
            Dns observedDns=requested->{
                String key=normalize(requested);Map<String,Object> item=map("host",host(requested));
                try{
                    List<InetAddress> answers=dnsMode.equals("system")?Dns.SYSTEM.lookup(requested):diagnosticDoh(config.toAbsolutePath().getParent(),requested);Map<String,Integer> classes=new LinkedHashMap<>();
                    for(InetAddress address:answers)classes.merge(ipClass(address),1,Integer::sum);
                    item.put("addressCount",answers.size());item.put("addressClasses",classes);
                    try{List<InetAddress> checked=WebUrlSafety.validatedAddresses(answers);trace.approved.put(key,Collections.unmodifiableSet(new HashSet<>(checked)));item.put("validation","PUBLIC_ALL_ADDRESSES");}
                    catch(WebImportFailure blocked){trace.approved.remove(key);item.put("validation",blocked.code);}
                    trace.dns.add(item);return answers;
                }catch(UnknownHostException error){item.put("validation","DNS_LOOKUP_ERROR");item.put("exceptionClass",exceptionClass(error));trace.dns.add(item);throw error;}
            };
            base=new OkHttpClient.Builder().addInterceptor(chain->{
                // Application interceptor: refuse the fourth HTTP request before opening its TCP connection.
                if(trace.requests.get()>=3){trace.budgetExceeded=true;throw new IOException("request_budget");}
                trace.requests.incrementAndGet();return chain.proceed(chain.request());
            }).eventListener(new okhttp3.EventListener(){
                @Override public void connectStart(Call call,InetSocketAddress address,Proxy proxy){
                    String h=normalize(call.request().url().host());Set<InetAddress> set=trace.approved.get(h);
                    trace.connects.add(map("host",host(h),"addressClass",ipClass(address.getAddress()),"memberOfValidatedSet",set!=null&&set.contains(address.getAddress()),"port",address.getPort(),"proxyType",proxy.type().name()));
                }
                @Override public void secureConnectEnd(Call call,Handshake handshake){trace.tls.add(map("host",host(call.request().url().host()),"verified",handshake!=null,"version",handshake==null?"UNKNOWN":handshake.tlsVersion().javaName()));}
                @Override public void responseHeadersEnd(Call call,Response response){trace.finalHost=host(response.request().url().host());trace.finalPathType=pathType(response.request().url().encodedPath());trace.finalNoteIdPatternMatched=note(response.request().url().encodedPath());trace.responses.add(map("host",trace.finalHost,"pathType",trace.finalPathType,"noteIdPatternMatched",trace.finalNoteIdPatternMatched,"status",response.code(),"statusClass",(response.code()/100)+"xx","https",response.request().url().isHttps()));}
                @Override public void connectFailed(Call call,InetSocketAddress address,Proxy proxy,Protocol protocol,IOException error){trace.failures.add(map("stage","CONNECT","host",host(call.request().url().host()),"exceptionClass",exceptionClass(error),"tlsFailureCategory",tlsFailure(error)));}
                @Override public void callFailed(Call call,IOException error){trace.failures.add(map("stage","CALL","host",host(call.request().url().host()),"exceptionClass",exceptionClass(error),"tlsFailureCategory",tlsFailure(error)));}
            }).build();
            page=new SafeWebFetcher(observedDns,base).read(url,new SafeWebFetcher.Token());
            URI last=URI.create(page.finalUrl);trace.finalHost=host(last.getHost());trace.finalPathType=pathType(last.getPath());trace.finalNoteIdPatternMatched=note(last.getPath());trace.finalHtmlUtf8Bytes=page.html.getBytes(StandardCharsets.UTF_8).length;
        }catch(Exception error){errorCode=error instanceof WebImportFailure?((WebImportFailure)error).code:"diagnostic_error";trace.failures.add(map("stage","TERMINAL","exceptionClass",exceptionClass(error)));}
        finally{if(base!=null){base.dispatcher().executorService().shutdownNow();base.connectionPool().evictAll();}}
        Map<String,Object> privatePage=page==null?null:map("html",page.html,"finalUrl",page.finalUrl,"contentType",page.contentType);
        emit(trace.publicView(),privatePage,errorCode,id);
    }
}
