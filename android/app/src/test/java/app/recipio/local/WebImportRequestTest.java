package app.recipio.local;
import static org.junit.Assert.*;
import org.json.JSONObject;
import org.junit.Test;

public class WebImportRequestTest {
    private JSONObject request()throws Exception {return new JSONObject().put("requestId","a5b44974-7523-4c63-8232-72fe8ae50fca").put("url","https://recipes.example/dish");}
    @Test public void narrowRequestAcceptsOnlyUuidAndPublicUrlSyntax()throws Exception {
        WebImportRequest value=WebImportRequest.read(request());assertEquals("https://recipes.example/dish",value.url);assertEquals("a5b44974-7523-4c63-8232-72fe8ae50fca",value.requestId);
        assertThrows(WebImportFailure.class,()->WebImportRequest.read(request().put("requestId","not-uuid")));
        assertThrows(WebImportFailure.class,()->WebImportRequest.read(request().put("url",42)));
    }
    @Test public void headersMethodsAndIpControlsAreRejected()throws Exception {
        for(String field:new String[]{"headers","method","ip","cookie","authorization"})assertThrows(WebImportFailure.class,()->WebImportRequest.read(request().put(field,"arbitrary")));
    }
    @Test public void cancellationCannotSmuggleAUrlOrMalformedIdentity()throws Exception {
        assertEquals("a5b44974-7523-4c63-8232-72fe8ae50fca",WebImportRequest.cancel(new JSONObject().put("requestId","a5b44974-7523-4c63-8232-72fe8ae50fca")));
        assertThrows(WebImportFailure.class,()->WebImportRequest.cancel(request()));
        assertThrows(WebImportFailure.class,()->WebImportRequest.cancel(new JSONObject().put("requestId","../secret")));
    }
}
