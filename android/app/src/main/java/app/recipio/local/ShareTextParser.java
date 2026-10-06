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
        private Result(String url, String reason) { this.url = url; this.reason = reason; }
    }

    static Result parse(String action, String mime, CharSequence text) {
        if (!"android.intent.action.SEND".equals(action) || !"text/plain".equals(mime)) return null;
        if (text == null) return new Result(null, "no_url");
        if (text.length() > MAX_TEXT_BYTES) return new Result(null, "oversized");
        String input = text.toString();
        if (input.getBytes(StandardCharsets.UTF_8).length > MAX_TEXT_BYTES) return new Result(null, "oversized");
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        Matcher matcher = WEB_URL.matcher(input);
        while (matcher.find()) {
            urls.add(matcher.group());
            if (urls.size() > 1) return new Result(null, "multiple_links");
        }
        if (urls.isEmpty()) return new Result(null, "no_url");
        String url = urls.iterator().next();
        try { WebUrlSafety.parse(url); }
        catch (WebImportFailure ignored) { return new Result(null, "unsafe_url"); }
        return new Result(url, null);
    }
}
