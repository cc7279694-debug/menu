package app.recipio.local;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.json.JSONObject;

final class WebImportRequest {
    final String requestId,url;
    private WebImportRequest(String requestId,String url){this.requestId=requestId;this.url=url;}
    private static void keys(JSONObject data,String... names)throws WebImportFailure {
        Set<String> allowed=new HashSet<>(Arrays.asList(names));
        if(data==null||data.length()!=allowed.size())throw new WebImportFailure("invalid_url");
        Iterator<String> actual=data.keys();while(actual.hasNext())if(!allowed.contains(actual.next()))throw new WebImportFailure("invalid_url");
    }
    private static String id(JSONObject data)throws WebImportFailure {
        Object value=data.opt("requestId");
        if(!(value instanceof String)||!((String)value).matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw new WebImportFailure("stale_session");
        return (String)value;
    }
    static WebImportRequest read(JSONObject data)throws WebImportFailure {
        keys(data,"requestId","url");String id=id(data);Object value=data.opt("url");
        if(!(value instanceof String))throw new WebImportFailure("invalid_url");
        WebUrlSafety.parse((String)value);return new WebImportRequest(id,(String)value);
    }
    static String cancel(JSONObject data)throws WebImportFailure {keys(data,"requestId");return id(data);}
}
