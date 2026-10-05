package app.recipio.local;

import static org.junit.Assert.*;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class WebUrlSafetyTest {
    @Test public void ordinaryDefaultPortPagesAreAccepted() throws Exception {
        assertEquals("recipes.example", WebUrlSafety.parse("https://recipes.example/dish#step").host);
        assertEquals("http://recipes.example:80/dish", WebUrlSafety.parse("http://recipes.example:80/dish").uri.toString());
        WebUrlSafety.parse("https://recipes.example:443/dish");
    }
    @Test public void malformedCredentialsLocalNamesSchemesAndPortsAreBlocked() {
        String[] blocked={"not a url","https://","https://user:pass@recipes.example/","https://@recipes.example/","https://recipes.example:8080/","http://recipes.example:443/","file:///data/x","content://private/x","javascript:alert(1)","data:text/html,x","intent://x","ftp://recipes.example/","ws://recipes.example/","http://localhost","https://x.localhost/","https://router.local/","http://LOCALHOST./","http://[fe80::1%25wlan0]/","https://recipes.example\\@127.0.0.1/","https://recipes.example/\nsecret"};
        for(String url:blocked) assertThrows(url, WebImportFailure.class,()->WebUrlSafety.parse(url));
    }
    @Test public void privateReservedBenchmarkDocumentationAndMulticastV4AreBlocked() throws Exception {
        String[] addresses={"0.1.2.3","10.1.2.3","100.64.0.1","100.127.255.254","127.0.0.1","169.254.1.2","172.16.0.1","172.31.255.254","192.168.1.1","192.0.0.8","192.0.2.1","192.88.99.1","198.18.0.1","198.19.255.255","198.51.100.1","203.0.113.1","224.0.0.1","239.1.2.3","240.0.0.1","255.255.255.255"};
        for(String ip:addresses) assertFalse(ip,WebUrlSafety.isGlobal(InetAddress.getByName(ip)));
        for(String ip:new String[]{"93.184.216.34","8.8.8.8","100.63.255.254","172.15.255.254","172.32.0.1","198.20.0.1"}) assertTrue(ip,WebUrlSafety.isGlobal(InetAddress.getByName(ip)));
    }
    @Test public void v6AndMappedAddressesAreValidatedByActualAddressBytes() throws Exception {
        for(String ip:new String[]{"::","::1","fc00::1","fdff::1","fe80::1","ff02::1","::ffff:192.168.1.1","2001:db8::1","2001::1","2002:0a00:0001::1","3fff::1"}) assertFalse(ip,WebUrlSafety.isGlobal(InetAddress.getByName(ip)));
        assertTrue(WebUrlSafety.isGlobal(InetAddress.getByName("2606:4700:4700::1111")));
        assertTrue(WebUrlSafety.isGlobal(InetAddress.getByName("2001:4860:4860::8888")));
        assertTrue(WebUrlSafety.isGlobal(InetAddress.getByName("::ffff:8.8.8.8")));
    }
    @Test public void oneUnsafeAddressBlocksTheEntireDnsResult() throws Exception {
        InetAddress good=InetAddress.getByName("93.184.216.34"),bad=InetAddress.getByName("192.168.1.1");
        assertEquals(Collections.singletonList(good),WebUrlSafety.validatedAddresses(Collections.singletonList(good)));
        assertEquals("dns_blocked",assertThrows(WebImportFailure.class,()->WebUrlSafety.validatedAddresses(Arrays.asList(good,bad))).code);
        assertThrows(WebImportFailure.class,()->WebUrlSafety.validatedAddresses(Collections.emptyList()));
    }
}
