package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.GZIPOutputStream;
import javax.net.SocketFactory;
import okhttp3.*;
import okhttp3.mockwebserver.*;
import okio.Buffer;
import org.junit.Test;

public class SafeWebFetcherTest {
    private static final InetAddress PUBLIC;
    static { try { PUBLIC=InetAddress.getByName("93.184.216.34"); } catch(Exception e) { throw new ExceptionInInitializerError(e); } }
    /** Test-only TCP mapping preserves/records the actual address chosen by OkHttp DNS. */
    private static final class TestSockets extends SocketFactory {
        final int port;final List<InetAddress> connected=new ArrayList<>();
        TestSockets(int port){this.port=port;}
        @Override public Socket createSocket(){return new Socket(){
            @Override public void connect(SocketAddress endpoint,int timeout)throws IOException {
                InetSocketAddress actual=(InetSocketAddress)endpoint;connected.add(actual.getAddress());
                super.connect(new InetSocketAddress(InetAddress.getLoopbackAddress(),port),timeout);
            }
        };}
        @Override public Socket createSocket(String h,int p)throws IOException {throw new IOException("unexpected path");}
        @Override public Socket createSocket(String h,int p,InetAddress l,int lp)throws IOException {throw new IOException("unexpected path");}
        @Override public Socket createSocket(InetAddress h,int p)throws IOException {throw new IOException("unexpected path");}
        @Override public Socket createSocket(InetAddress h,int p,InetAddress l,int lp)throws IOException {throw new IOException("unexpected path");}
    }
    private SafeWebFetcher fetcher(MockWebServer server, Dns resolver,TestSockets sockets) {
        return new SafeWebFetcher(resolver,new OkHttpClient.Builder().socketFactory(sockets).dns(resolver).build());
    }
    private MockResponse html(String text){return new MockResponse().setHeader("Content-Type","text/html; charset=utf-8").setBody(text);}
    private SafeWebFetcher.Page read(SafeWebFetcher fetcher,String url)throws Exception {return fetcher.read(url,new SafeWebFetcher.Token());}
    @Test public void actualClientDnsAndSocketUseOnlyTheFirstValidatedResolution()throws Exception {
        try(MockWebServer server=new MockWebServer()){server.start();server.enqueue(html("<h1>鸡翅</h1>"));
            AtomicInteger resolves=new AtomicInteger();Dns changing=host->Collections.singletonList(resolves.incrementAndGet()==1?PUBLIC:InetAddress.getByName("192.168.1.1"));
            TestSockets sockets=new TestSockets(server.getPort());SafeWebFetcher.Page page=read(fetcher(server,changing,sockets),"http://recipes.example/dish");
            assertEquals("<h1>鸡翅</h1>",page.html);assertEquals(1,resolves.get());assertEquals(Collections.singletonList(PUBLIC),sockets.connected);
            RecordedRequest req=server.takeRequest(1,TimeUnit.SECONDS);assertNotNull(req);
            assertEquals("RECIPIO/0.6 Android Link Import",req.getHeader("User-Agent"));
            for(String header:new String[]{"Cookie","Authorization","Referer"}) assertNull(req.getHeader(header));
        }
    }
    @Test public void mixedDnsIsBlockedBeforeAnyConnection()throws Exception {
        try(MockWebServer server=new MockWebServer()){server.start();TestSockets sockets=new TestSockets(server.getPort());
            SafeWebFetcher fetcher=fetcher(server,host->Arrays.asList(PUBLIC,InetAddress.getByName("10.0.0.1")),sockets);
            assertEquals("dns_blocked",assertThrows(WebImportFailure.class,()->read(fetcher,"http://recipes.example/")).code);assertTrue(sockets.connected.isEmpty());
        }
    }
    @Test public void redirectsAreManualAndEachPublicHopIsRevalidated()throws Exception {
        try(MockWebServer server=new MockWebServer()){server.start();server.enqueue(new MockResponse().setResponseCode(302).setHeader("Location","/second"));server.enqueue(new MockResponse().setResponseCode(307).setHeader("Location","http://another.example/final"));server.enqueue(html("ok"));
            AtomicInteger resolves=new AtomicInteger();TestSockets sockets=new TestSockets(server.getPort());
            SafeWebFetcher.Page page=read(fetcher(server,host->{resolves.incrementAndGet();return Collections.singletonList(PUBLIC);},sockets),"http://recipes.example/first");
            assertEquals("http://another.example/final",page.finalUrl);assertEquals(3,resolves.get());assertEquals(3,sockets.connected.size());
        }
    }
    @Test public void localPrivateCredentialPortAndSchemeRedirectsNeverConnect()throws Exception {
        for(String location:new String[]{"http://localhost/","http://127.0.0.1/","http://private.example/","http://user:pass@recipes.example/","https://recipes.example:8443/","file:///private"}) {
            try(MockWebServer server=new MockWebServer()){server.start();server.enqueue(new MockResponse().setResponseCode(302).setHeader("Location",location));TestSockets sockets=new TestSockets(server.getPort());
                Dns dns=host->Collections.singletonList(host.equals("private.example")||host.equals("127.0.0.1")?InetAddress.getByName("192.168.1.1"):PUBLIC);
                assertEquals("redirect_blocked",assertThrows(WebImportFailure.class,()->read(fetcher(server,dns,sockets),"http://recipes.example/start")).code);assertEquals(1,sockets.connected.size());
            }
        }
    }
    @Test public void loopsAndFourthRedirectAreRejected()throws Exception {
        for(boolean loop:new boolean[]{true,false})try(MockWebServer server=new MockWebServer()){server.start();for(int i=0;i<4;i++)server.enqueue(new MockResponse().setResponseCode(301).setHeader("Location",loop?"/start":"/page"+i));
            TestSockets sockets=new TestSockets(server.getPort());WebImportFailure failure=assertThrows(WebImportFailure.class,()->read(fetcher(server,host->Collections.singletonList(PUBLIC),sockets),"http://recipes.example/start"));
            assertEquals(loop?"redirect_blocked":"too_many_redirects",failure.code);assertTrue(sockets.connected.size()<=4);
        }
    }
    @Test public void httpsCannotDowngradeEvenAfterAnHttpStart()throws Exception {
        OkHttpClient client=new OkHttpClient.Builder().addInterceptor(chain->{String path=chain.request().url().encodedPath();String next=path.equals("/start")?"https://recipes.example/secure":"http://recipes.example/final";
            return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(302).message("Redirect").header("Location",next).body(ResponseBody.create("",MediaType.get("text/html"))).build();}).build();
        SafeWebFetcher fetcher=new SafeWebFetcher(host->Collections.singletonList(PUBLIC),client);
        assertEquals("redirect_blocked",assertThrows(WebImportFailure.class,()->read(fetcher,"http://recipes.example/start")).code);
    }
    @Test public void onlyHtmlAndXhtmlMimeTypesAreAccepted()throws Exception {
        for(String mime:new String[]{"text/html","application/xhtml+xml","application/pdf","image/png","application/zip","application/octet-stream","text/plain",""})try(MockWebServer server=new MockWebServer()){server.start();server.enqueue(new MockResponse().setHeader("Content-Type",mime).setBody("<h1>ok</h1>"));TestSockets sockets=new TestSockets(server.getPort());SafeWebFetcher fetcher=fetcher(server,host->Collections.singletonList(PUBLIC),sockets);
            if(mime.equals("text/html")||mime.equals("application/xhtml+xml"))assertEquals(mime,read(fetcher,"http://recipes.example/").contentType);
            else assertEquals("unsupported_content",assertThrows(WebImportFailure.class,()->read(fetcher,"http://recipes.example/")).code);
        }
    }
    @Test public void decodedBodyBoundaryIsEnforcedIncludingTransparentGzip()throws Exception {
        for(int size:new int[]{2*1024*1024,2*1024*1024+1})for(boolean gzip:new boolean[]{false,true})try(MockWebServer server=new MockWebServer()){server.start();byte[] bytes=new byte[size];Arrays.fill(bytes,(byte)'a');MockResponse response=html("");
            if(gzip){ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream zipped=new GZIPOutputStream(out)){zipped.write(bytes);}response.setHeader("Content-Encoding","gzip").setBody(new Buffer().write(out.toByteArray()));}
            else response.setBody(new Buffer().write(bytes));server.enqueue(response);TestSockets sockets=new TestSockets(server.getPort());SafeWebFetcher fetcher=fetcher(server,host->Collections.singletonList(PUBLIC),sockets);
            if(size==2*1024*1024)assertEquals(size,read(fetcher,"http://recipes.example/").html.length());
            else assertEquals("page_too_large",assertThrows(WebImportFailure.class,()->read(fetcher,"http://recipes.example/")).code);
        }
    }
    @Test public void statusCodesConnectionFailuresAndUnreadablePagesStayCategorized()throws Exception {
        for(int status:new int[]{404,500})try(MockWebServer server=new MockWebServer()){server.start();server.enqueue(html("error").setResponseCode(status));TestSockets sockets=new TestSockets(server.getPort());assertEquals("http_error",assertThrows(WebImportFailure.class,()->read(fetcher(server,host->Collections.singletonList(PUBLIC),sockets),"http://recipes.example/")).code);}
        SafeWebFetcher failing=new SafeWebFetcher(host->{throw new UnknownHostException("private details");},new OkHttpClient());
        assertEquals("network_unavailable",assertThrows(WebImportFailure.class,()->read(failing,"https://recipes.example/")).code);
    }
    @Test public void dnsTimeCountsAgainstOverallDeadlineAndCancelPreventsWork()throws Exception {
        long[] now={0};SafeWebFetcher.Token token=new SafeWebFetcher.Token(()->now[0]);
        SafeWebFetcher fetcher=new SafeWebFetcher(host->{now[0]=20000;return Collections.singletonList(PUBLIC);},new OkHttpClient());
        assertEquals("timeout",assertThrows(WebImportFailure.class,()->fetcher.read("https://recipes.example/",token)).code);
        SafeWebFetcher.Token cancelled=new SafeWebFetcher.Token();cancelled.cancel();assertEquals("cancelled",assertThrows(WebImportFailure.class,()->fetcher.read("https://recipes.example/",cancelled)).code);
    }
    @Test public void pinnedClientDisablesProxyCookiesRedirectsAndConnectionReuse()throws Exception {
        SafeWebFetcher fetcher=new SafeWebFetcher(host->Collections.singletonList(PUBLIC),new OkHttpClient());
        OkHttpClient client=fetcher.pinnedClient("recipes.example",Collections.singletonList(PUBLIC),20000);
        assertEquals(Proxy.NO_PROXY,client.proxy());assertFalse(client.followRedirects());assertFalse(client.followSslRedirects());assertFalse(client.retryOnConnectionFailure());assertSame(CookieJar.NO_COOKIES,client.cookieJar());
        assertEquals(8000,client.connectTimeoutMillis());assertEquals(12000,client.readTimeoutMillis());assertEquals(20000,client.callTimeoutMillis());
        assertEquals(Collections.singletonList(PUBLIC),client.dns().lookup("recipes.example"));assertThrows(UnknownHostException.class,()->client.dns().lookup("another.example"));
    }
}
