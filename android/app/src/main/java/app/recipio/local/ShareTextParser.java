package app.recipio.local;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Memory-only share extraction. Network validation remains owned by WebUrlSafety. */
final class ShareTextParser {
    private static final int MAX_TEXT_BYTES = 32 * 1024;
    private static final Pattern WEB_URL = Pattern.compile("https?://[^\\s\\p{Z}<>\"']+", Pattern.CASE_INSENSITIVE);

    static final class Result {
        final String url;
        final String reason;
        final String text, companionText;
        private Result(String url, String reason, String text, String companionText) { this.url = url; this.reason = reason; this.text=text; this.companionText=companionText; }
        static Result invalid(String reason) { return new Result(null,reason,null,null); }
    }
    static Result invalid(String reason) { return Result.invalid(reason); }

    static Result parse(String action, String mime, CharSequence text) {
        if (!"android.intent.action.SEND".equals(action) || !"text/plain".equals(mime)) return null;
        if (text == null) return invalid("no_url");
        if (text.length() > MAX_TEXT_BYTES) return invalid("oversized");
        String input = text.toString();
        if (input.getBytes(StandardCharsets.UTF_8).length > MAX_TEXT_BYTES) return invalid("oversized");
        if(input.trim().isEmpty())return invalid("no_url");
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        Matcher matcher = WEB_URL.matcher(input);
        while (matcher.find()) {
            urls.add(matcher.group());
            if (urls.size() > 1) return input.codePointCount(0,input.length())>30000 ? invalid("oversized") : new Result(null,"multiple_links",input,null);
        }
        if (urls.isEmpty()) return input.codePointCount(0,input.length())>30000 ? invalid("oversized") : new Result(null,null,input,null);
        String url = urls.iterator().next();
        try { WebUrlSafety.parse(url); }
        catch (WebImportFailure ignored) { return invalid("unsafe_url"); }
        String companion=WEB_URL.matcher(input).replaceAll("").trim();
        return new Result(url,null,null,companion.isEmpty()||companion.codePointCount(0,companion.length())>30000?null:companion);
    }
    static Result imageText(CharSequence text) {
        if(text==null)return new Result(null,null,"",null);
        String input=text.toString();
        if(input.length()>MAX_TEXT_BYTES||input.getBytes(StandardCharsets.UTF_8).length>MAX_TEXT_BYTES||input.codePointCount(0,input.length())>30000)return invalid("oversized");
        return new Result(null,null,input,null);
    }
}
