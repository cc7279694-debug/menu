package app.recipio.local;

import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

final class WebUrlSafety {
    static final class Target {
        final URI uri;
        final String host;
        final boolean secure;
        Target(URI uri, String host, boolean secure) { this.uri=uri; this.host=host; this.secure=secure; }
    }
    static Target parse(String input) throws WebImportFailure {
        if(input==null || input.isEmpty() || input.length()>8192 || input.indexOf('\\')>=0) throw new WebImportFailure("invalid_url");
        for(int i=0;i<input.length();i++) if(Character.isISOControl(input.charAt(i)) || Character.isWhitespace(input.charAt(i))) throw new WebImportFailure("invalid_url");
        final URI uri;
        try { uri=new URI(input); } catch(URISyntaxException ignored) { throw new WebImportFailure("invalid_url"); }
        String scheme=uri.getScheme();
        if(scheme==null) throw new WebImportFailure("invalid_url");
        scheme=scheme.toLowerCase(Locale.ROOT);
        if(!scheme.equals("http") && !scheme.equals("https")) throw new WebImportFailure("unsupported_scheme");
        if(uri.getRawUserInfo()!=null || uri.getRawAuthority()==null || uri.getRawAuthority().indexOf('@')>=0) throw new WebImportFailure("unsafe_url");
        String host=uri.getHost();
        if(host==null || host.isEmpty() || host.indexOf('%')>=0) throw new WebImportFailure("invalid_url");
        host=host.toLowerCase(Locale.ROOT);
        if(host.startsWith("[") && host.endsWith("]")) host=host.substring(1,host.length()-1);
        while(host.endsWith(".")) host=host.substring(0,host.length()-1);
        if(host.isEmpty() || host.equals("localhost") || host.endsWith(".localhost") || host.endsWith(".local")) throw new WebImportFailure("unsafe_url");
        int port=uri.getPort();boolean secure=scheme.equals("https");
        if(port!=-1 && port!=(secure?443:80)) throw new WebImportFailure("unsupported_port");
        // Keep the validated authority and escaped path, but fragments are not request data.
        try { String clean=uri.toString();int hash=clean.indexOf('#');return new Target(new URI(hash<0?clean:clean.substring(0,hash)),host,secure); }
        catch(URISyntaxException ignored) { throw new WebImportFailure("invalid_url"); }
    }
    static List<InetAddress> validatedAddresses(List<InetAddress> addresses) throws WebImportFailure {
        if(addresses==null || addresses.isEmpty() || addresses.size()>64) throw new WebImportFailure("dns_blocked");
        for(InetAddress address:addresses) if(address==null || !isGlobal(address)) throw new WebImportFailure("dns_blocked");
        return Collections.unmodifiableList(new ArrayList<>(addresses));
    }
    static boolean isGlobal(InetAddress address) {
        byte[] b=address.getAddress();
        if(b.length==4) return globalV4(b);
        if(b.length!=16) return false;
        boolean mapped=true;for(int i=0;i<10;i++) mapped &= b[i]==0;
        if(mapped && (b[10]&255)==255 && (b[11]&255)==255) return globalV4(new byte[]{b[12],b[13],b[14],b[15]});
        // Allow global-unicast space only, then exclude IANA special-use/documentation ranges.
        if((b[0]&224)!=32) return false;
        if((b[0]&255)==32 && (b[1]&255)==1) {
            if((b[2]&254)==0) return false; // 2001::/23: protocol assignments, Teredo, benchmarking, ORCHID.
            if((b[2]&255)==13 && (b[3]&255)==184) return false; // 2001:db8::/32.
        }
        if((b[0]&255)==32 && (b[1]&255)==2) return false; // 6to4 embeds unchecked IPv4.
        return !((b[0]&255)==63 && (b[1]&255)==255 && (b[2]&240)==0); // 3fff::/20 docs.
    }
    private static boolean globalV4(byte[] b) {
        int a=b[0]&255,c=b[1]&255,d=b[2]&255;
        if(a==0 || a==10 || a==127 || a>=224) return false;
        if(a==100 && c>=64 && c<=127 || a==169 && c==254 || a==172 && c>=16 && c<=31) return false;
        if(a==192 && (c==168 || c==0 && (d==0 || d==2) || c==88 && d==99)) return false;
        if(a==198 && (c==18 || c==19 || c==51 && d==100)) return false;
        return !(a==203 && c==0 && d==113);
    }
}
