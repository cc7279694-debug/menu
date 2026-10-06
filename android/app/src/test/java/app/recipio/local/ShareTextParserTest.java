package app.recipio.local;

import static org.junit.Assert.*;
import org.junit.Test;

public class ShareTextParserTest {
    private ShareTextParser.Result parse(String text) { return ShareTextParser.parse("android.intent.action.SEND", "text/plain", text); }
    private void invalid(String reason, String text) { ShareTextParser.Result result=parse(text); assertNotNull(result); assertNull(result.url); assertEquals(reason,result.reason); }

    @Test public void exactTitleNewlineAndSpacePreserveTheOneUrlAndItsQuery() {
        for(String text:new String[]{"https://generated.example/recipe?portion=2&token=owned#step", "可乐鸡翅\nhttps://generated.example/recipe?portion=2&token=owned#step", "可乐鸡翅 https://generated.example/recipe?portion=2&token=owned#step"}) {
            ShareTextParser.Result result=parse(text);
            assertEquals("https://generated.example/recipe?portion=2&token=owned#step",result.url);assertNull(result.reason);
        }
    }
    @Test public void identicalCandidatesDeduplicateButDifferentUrlsNeverChooseFirst() {
        assertEquals("https://generated.example/recipe",parse("https://generated.example/recipe\nhttps://generated.example/recipe").url);
        invalid("multiple_links","https://generated.example/one https://generated.example/two");
        invalid("multiple_links","https://generated.example/r?q=1 https://generated.example/r?q=2");
    }
    @Test public void absentTextIsRejectedAndPlainTextIsPreservedWithoutNetwork() {
        for(String text:new String[]{null,""," \n "}) invalid("no_url",text);
        for(String text:new String[]{"普通菜谱文字","鸡翅500克\n小火20分钟\n🍗","javascript:alert(1)","content://generated/recipe","file:///test.html"}) {
            ShareTextParser.Result result=parse(text);
            assertNull(result.url); assertNull(result.reason); assertEquals(text,result.text);
        }
    }
    @Test public void multipleLinksRetainBoundedOriginalTextForExplicitChoice() {
        String text="做法一 https://generated.example/a\n做法二 https://generated.example/b";
        ShareTextParser.Result result=parse(text);
        assertEquals("multiple_links",result.reason); assertEquals(text,result.text); assertNull(result.url);
    }
    @Test public void urlPrecedenceDoesNotSilentlyConvertTitleIntoAiText() {
        ShareTextParser.Result result=parse("可乐鸡翅\nhttps://generated.example/r");
        assertEquals("https://generated.example/r",result.url); assertNull(result.text);
        assertEquals("可乐鸡翅",result.companionText);
    }
    @Test public void aiCodepointLimitIsCheckedWithoutTruncatingText() {
        invalid("oversized","x".repeat(30001));
        assertEquals("x".repeat(30000),parse("x".repeat(30000)).text);
    }
    @Test public void existingUrlValidatorRejectsUnsafeAuthorityAndMalformedInput() {
        for(String text:new String[]{"http://localhost/recipe","http://thing.local/recipe","https://user:pass@generated.example/recipe","https://generated.example:444/recipe","https://[invalid/recipe","https://generated.example/recipe\\other"}) invalid("unsafe_url",text);
    }
    @Test public void boundedUtf8TextCannotBypassLimitWithChineseCharacters() {
        invalid("oversized","x".repeat(32769));
        invalid("oversized","菜".repeat(11000)+" https://generated.example/recipe");
        assertEquals("https://generated.example/recipe",parse("菜".repeat(10000)+" https://generated.example/recipe").url);
    }
    @Test public void unsupportedActionsAndMimeTypesAreIgnored() {
        for(String action:new String[]{null,"android.intent.action.SEND_MULTIPLE","android.intent.action.VIEW","android.intent.action.MAIN"}) assertNull(ShareTextParser.parse(action,"text/plain","https://generated.example/recipe"));
        for(String mime:new String[]{null,"image/png","video/mp4","text/html","text/*","application/octet-stream"}) assertNull(ShareTextParser.parse("android.intent.action.SEND",mime,"https://generated.example/recipe"));
    }
    @Test public void bracketsAndCaseInsensitiveWebSchemesDoNotConsumeTitle() {
        assertEquals("HTTPS://generated.example/recipe?x=%E7%94%9F",parse("网页 <HTTPS://generated.example/recipe?x=%E7%94%9F>").url);
    }
    @Test public void literalBoundaryDoesNotStripLegitimatePathOrQueryPunctuation() {
        assertEquals("https://generated.example/recipe(a)?q=(b),c",parse("https://generated.example/recipe(a)?q=(b),c").url);
    }
}
