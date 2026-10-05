package app.recipio.local;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.InetAddress;
import java.net.Proxy;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.*;
import java.util.function.LongSupplier;
import okhttp3.*;

/** Public-page GET only. No credential store, app data, webview or persistent cache access. */
final class SafeWebFetcher {
    static final int MAX_BYTES=2*1024*1024;
    static final String USER_AGENT="RECIPIO/0.6 Android Link Import";
    private static final ExecutorService DNS_WORKERS=new ThreadPoolExecutor(0,2,30,TimeUnit.SECONDS,new SynchronousQueue<>(),r->{Thread t=new Thread(r,"recipio-public-dns");t.setDaemon(true);return t;},new ThreadPoolExecutor.AbortPolicy());
    private final Dns resolver;
    private final OkHttpClient base;
    SafeWebFetcher(){this(Dns.SYSTEM,new OkHttpClient());}
    // Package-private injection is used by owned fake-network tests, never by the JS bridge.
    SafeWebFetcher(Dns resolver,OkHttpClient base){this.resolver=resolver;this.base=base;}
    static final class Page {
        final String finalUrl,contentType,html;
        Page(String finalUrl,String contentType,String html){this.finalUrl=finalUrl;this.contentType=contentType;this.html=html;}
    }
    static final class Token {
        private final LongSupplier clock;
        private final long start;
        private boolean cancelled;
        private Call call;
        private Future<?> dns;
        Token(){this(()->TimeUnit.NANOSECONDS.toMillis(System.nanoTime()));}
        Token(LongSupplier clock){this.clock=clock;this.start=clock.getAsLong();}
        synchronized long remaining()throws WebImportFailure {
            if(cancelled)throw new WebImportFailure("cancelled");
            long elapsed=clock.getAsLong()-start;if(elapsed<0 || elapsed>=20000)throw new WebImportFailure("timeout");return 20000-elapsed;
        }
        synchronized void own(Call active)throws WebImportFailure {remaining();call=active;}
        synchronized void own(Future<?> active)throws WebImportFailure {try{remaining();dns=active;}catch(WebImportFailure e){active.cancel(true);throw e;}}
        synchronized void releaseDns(Future<?> active){if(dns==active)dns=null;}
        synchronized void releaseCall(Call active){if(call==active)call=null;}
        synchronized void cancel(){cancelled=true;if(call!=null)call.cancel();if(dns!=null)dns.cancel(true);}
    }
    private List<InetAddress> resolve(WebUrlSafety.Target target,Token token)throws WebImportFailure {
        token.remaining();Future<List<InetAddress>> future;
        try{future=DNS_WORKERS.submit(()->resolver.lookup(target.host));}catch(RejectedExecutionException ignored){throw new WebImportFailure("busy");}
        token.own(future);
        try{List<InetAddress> result=future.get(token.remaining(),TimeUnit.MILLISECONDS);token.remaining();return WebUrlSafety.validatedAddresses(result);}
        catch(TimeoutException ignored){future.cancel(true);throw new WebImportFailure("timeout");}
        catch(CancellationException ignored){token.remaining();throw new WebImportFailure("cancelled");}
        catch(InterruptedException ignored){Thread.currentThread().interrupt();throw new WebImportFailure("cancelled");}
        catch(ExecutionException ignored){token.remaining();throw new WebImportFailure("network_unavailable");}
        finally{token.releaseDns(future);}
    }
    OkHttpClient pinnedClient(String host,List<InetAddress> addresses,long remaining){
        Dns pinned=requested->{String normalized=requested.toLowerCase(Locale.ROOT);while(normalized.endsWith("."))normalized=normalized.substring(0,normalized.length()-1);if(!normalized.equals(host))throw new UnknownHostException("Unbound host");return addresses;};
        return base.newBuilder().dns(pinned).proxy(Proxy.NO_PROXY).cookieJar(CookieJar.NO_COOKIES).cache(null)
            .authenticator(Authenticator.NONE).proxyAuthenticator(Authenticator.NONE)
            .followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
            // A new pool per hop prohibits stale pooled connections and HTTP/2 coalescing across DNS checks.
            .connectionPool(new ConnectionPool(0,1,TimeUnit.NANOSECONDS))
            .connectTimeout(Math.min(8000,remaining),TimeUnit.MILLISECONDS).readTimeout(Math.min(12000,remaining),TimeUnit.MILLISECONDS)
            .callTimeout(remaining,TimeUnit.MILLISECONDS).build();
    }
    Page read(String source,Token token)throws WebImportFailure {
        WebUrlSafety.Target target=WebUrlSafety.parse(source);boolean enteredHttps=target.secure;Set<String> visited=new HashSet<>();
        for(int redirects=0;;){
            token.remaining();if(!visited.add(target.uri.toString()))throw new WebImportFailure("redirect_blocked");
            final List<InetAddress> addresses;
            try{addresses=resolve(target,token);}catch(WebImportFailure e){if(redirects>0 && e.code.equals("dns_blocked"))throw new WebImportFailure("redirect_blocked");throw e;}
            OkHttpClient client=pinnedClient(target.host,addresses,token.remaining());
            final Request request;
            try{request=new Request.Builder().url(target.uri.toASCIIString()).get().header("User-Agent",USER_AGENT).header("Accept","text/html, application/xhtml+xml").build();}
            catch(IllegalArgumentException ignored){throw new WebImportFailure("invalid_url");}
            String actualHost=request.url().host();while(actualHost.endsWith("."))actualHost=actualHost.substring(0,actualHost.length()-1);
            if(!actualHost.equals(target.host))throw new WebImportFailure("unsafe_url");
            Call call=client.newCall(request);token.own(call);
            try(Response response=call.execute()){
                token.remaining();int status=response.code();
                if(status==301||status==302||status==303||status==307||status==308){
                    if(redirects>=3)throw new WebImportFailure("too_many_redirects");
                    String location=response.header("Location");if(location==null||location.length()>8192)throw new WebImportFailure("redirect_blocked");
                    HttpUrl next=request.url().resolve(location);if(next==null)throw new WebImportFailure("redirect_blocked");
                    WebUrlSafety.Target checked;
                    try{checked=WebUrlSafety.parse(next.toString());}catch(WebImportFailure ignored){throw new WebImportFailure("redirect_blocked");}
                    if(enteredHttps && !checked.secure)throw new WebImportFailure("redirect_blocked");
                    enteredHttps|=checked.secure;target=checked;redirects++;continue;
                }
                if(status<200||status>=300)throw new WebImportFailure("http_error");
                ResponseBody body=response.body();if(body==null)throw new WebImportFailure("page_unreadable");
                MediaType type=body.contentType();String mime=type==null?"":type.type()+"/"+type.subtype();
                if(!mime.equals("text/html")&&!mime.equals("application/xhtml+xml"))throw new WebImportFailure("unsupported_content");
                // OkHttp removes gzip encoding after transparent decompression; unknown encodings stay closed.
                String encoding=response.header("Content-Encoding");if(encoding!=null&&!encoding.equalsIgnoreCase("identity"))throw new WebImportFailure("unsupported_content");
                if(body.contentLength()>MAX_BYTES)throw new WebImportFailure("page_too_large");
                ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];
                try(InputStream input=body.byteStream()){for(int count;(count=input.read(buffer))!=-1;){token.remaining();if(out.size()+count>MAX_BYTES)throw new WebImportFailure("page_too_large");out.write(buffer,0,count);}}
                token.remaining();Charset charset=type.charset(StandardCharsets.UTF_8);String html=new String(out.toByteArray(),charset);
                if(html.trim().isEmpty())throw new WebImportFailure("page_unreadable");
                if(html.getBytes(StandardCharsets.UTF_8).length>MAX_BYTES)throw new WebImportFailure("page_too_large");
                return new Page(request.url().toString(),mime,html);
            }catch(InterruptedIOException ignored){token.remaining();throw new WebImportFailure("timeout");}
            catch(IOException ignored){token.remaining();throw new WebImportFailure("network_unavailable");}
            finally{token.releaseCall(call);client.connectionPool().evictAll();}
        }
    }
}
