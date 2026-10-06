package app.recipio.local;

import static org.junit.Assert.*;
import java.util.*;
import org.json.*;
import org.junit.Test;

public class RecipeFinderSourcesTest {
    // Removing structured-source membership would expose the invented URL in this test.
    static JSONObject candidate(String url)throws Exception {
        return new JSONObject().put("title","啤酒鸭").put("sourceUrl",url).put("summary","先煎后炖")
            .put("highlights",new JSONArray().put("不放辣椒")).put("totalMinutes",JSONObject.NULL)
            .put("preparationHint","").put("timeEvidence","").put("preparationEvidence","");
    }
    static JSONObject search(String[] urls,JSONObject... candidates)throws Exception {
        JSONArray sources=new JSONArray();for(String url:urls)sources.put(new JSONObject().put("type","url").put("url",url));
        JSONObject root=new JSONObject().put("output",new JSONArray().put(new JSONObject().put("type","web_search_call").put("status","completed").put("action",new JSONObject().put("type","search").put("sources",sources))));
        root.getJSONArray("output").put(message(new JSONObject().put("candidates",new JSONArray(Arrays.asList(candidates))).toString()));return root;
    }
    static JSONObject message(String text)throws Exception {return new JSONObject().put("type","message").put("role","assistant").put("status","completed").put("content",new JSONArray().put(new JSONObject().put("type","output_text").put("text",text)));}
    static JSONObject extractor(String url,String text)throws Exception {return new JSONObject().put("type","web_extractor_call").put("status","completed").put("urls",new JSONArray().put(url)).put("goal","读取菜谱").put("output",text);}
    @Test public void acceptsOnlyStructuredSourcesAndReturnsSafePublicFields()throws Exception {
        JSONObject valid=candidate("HTTPS://RECIPES.EXAMPLE:443/duck?id=2#tip"),invented=candidate("https://recipes.example/other");
        List<RecipeFinderSources.Candidate> result=RecipeFinderSources.search(search(new String[]{"https://recipes.example/duck?id=2"},valid,invented));
        assertEquals(1,result.size());JSONObject safe=result.get(0).json();assertEquals("recipes.example",safe.getString("sourceHost"));
        assertEquals("https://recipes.example/duck?id=2",safe.getString("sourceUrl"));assertTrue(AiRequestLifecycle.uuid(safe.getString("id")));
        Set<String> names=new HashSet<>();safe.keys().forEachRemaining(names::add);
        assertEquals(Set.of("id","title","sourceUrl","sourceHost","summary","highlights","totalMinutes","preparationHint"),names);
    }
    @Test public void retainsQueryAndPathWhenMatchingSources()throws Exception {
        JSONObject root=search(new String[]{"https://recipes.example/duck?id=2"},candidate("https://recipes.example/duck?id=3"),candidate("https://recipes.example/other?id=2"));
        assertEquals("no_candidates",assertThrows(AiFailure.class,()->RecipeFinderSources.search(root)).code);
    }
    @Test public void modelOnlyUrlsFailedSearchAndEmptySourcesCannotAuthorizeCandidate()throws Exception {
        for(JSONObject root:List.of(search(new String[]{},candidate("https://recipes.example/duck")),search(new String[]{"https://recipes.example/duck"},candidate("https://recipes.example/duck")))) {
            if(root.getJSONArray("output").getJSONObject(0).getJSONObject("action").getJSONArray("sources").length()>0)root.getJSONArray("output").getJSONObject(0).put("status","failed");
            assertThrows(AiFailure.class,()->RecipeFinderSources.search(root));
        }
    }
    @Test public void completedVerifiedSearchWithNoReliableProposalsReturnsEmptyResults()throws Exception {
        assertTrue(RecipeFinderSources.search(search(new String[]{"https://recipes.example/duck"})).isEmpty());
        assertThrows(AiFailure.class,()->RecipeFinderSources.search(search(new String[]{})));
    }
    @Test public void deduplicatesPagesAndBoundsCandidatesAgainstNineStructuredSources()throws Exception {
        String[] urls=new String[9];for(int i=0;i<9;i++)urls[i]="https://recipes.example/"+i;
        List<RecipeFinderSources.Candidate> result=RecipeFinderSources.search(search(urls,candidate(urls[0]),candidate(urls[1]),candidate(urls[2])));
        assertEquals(3,result.size());assertEquals(1,RecipeFinderSources.search(search(urls,candidate(urls[0]),candidate(urls[0]+"#duplicate"))).size());
    }
    @Test public void unsafeLiteralAddressesNeverBecomeCandidates()throws Exception {
        for(String url:List.of("http://127.0.0.1/duck","http://10.0.0.1/duck","http://[::1]/duck","https://192.0.2.1/duck","https://recipes.example:8080/duck","https://user@recipes.example/duck","https://youtube.com/watch?v=x"))
            assertEquals("no_candidates",assertThrows(AiFailure.class,()->RecipeFinderSources.search(search(new String[]{url},candidate(url)))).code);
    }
    @Test public void unsupportedTimeAndPreparationBecomeEmptyUntilSamePageEvidenceExists()throws Exception {
        String url="https://recipes.example/duck";JSONObject candidate=candidate(url).put("totalMinutes",45).put("preparationHint","提前腌制30分钟").put("timeEvidence","总耗时45分钟").put("preparationEvidence","提前腌制30分钟");
        JSONObject root=search(new String[]{url},candidate);JSONObject safe=RecipeFinderSources.search(root).get(0).json();assertTrue(safe.isNull("totalMinutes"));assertEquals("",safe.getString("preparationHint"));
        root.getJSONArray("output").put(extractor(url,"做法：总耗时45分钟，提前腌制30分钟。"));safe=RecipeFinderSources.search(root).get(0).json();assertEquals(45,safe.getInt("totalMinutes"));assertEquals("提前腌制30分钟",safe.getString("preparationHint"));
    }
    @Test public void preparationHintCannotRemoveNegationFromItsSourceEvidence()throws Exception {
        String url="https://recipes.example/duck";JSONObject proposed=candidate(url).put("preparationHint","提前腌制30分钟").put("preparationEvidence","不需要提前腌制30分钟");
        JSONObject root=search(new String[]{url},proposed);root.getJSONArray("output").put(extractor(url,"这个做法不需要提前腌制30分钟。"));
        assertEquals("",RecipeFinderSources.search(root).get(0).json().getString("preparationHint"));
    }
    @Test public void extractorMustCompleteExactlyTheSelectedPage()throws Exception {
        String url="https://recipes.example/duck?id=2";JSONObject root=new JSONObject().put("output",new JSONArray().put(extractor("HTTPS://RECIPES.EXAMPLE:443/duck?id=2#part","鸭肉500克")));
        assertEquals("鸭肉500克",RecipeFinderSources.extractedText(root,url));
        root.getJSONArray("output").getJSONObject(0).put("urls",new JSONArray().put("https://recipes.example/duck?id=3"));
        assertEquals("source_mismatch",assertThrows(AiFailure.class,()->RecipeFinderSources.extractedText(root,url)).code);
    }
    @Test public void extraTargetSearchToolMissingOrFailedExtractorBlocksExtraction()throws Exception {
        String url="https://recipes.example/duck";
        JSONObject extra=extractor(url,"鸭肉500克");extra.getJSONArray("urls").put("https://recipes.example/other");
        JSONObject failed=extractor(url,"鸭肉500克").put("status","failed");
        for(JSONArray output:List.of(new JSONArray(),new JSONArray().put(failed),new JSONArray().put(extra),new JSONArray().put(extractor(url,"鸭肉500克")).put(search(new String[]{url},candidate(url)).getJSONArray("output").getJSONObject(0))))
            assertThrows(AiFailure.class,()->RecipeFinderSources.extractedText(new JSONObject().put("output",output),url));
    }
    @Test public void unapprovedExecutedToolsCannotPassSelectedSourceGate()throws Exception {
        String url="https://recipes.example/duck";
        for(String type:List.of("code_interpreter_call","function_call","unknown_tool_call")){
            JSONObject root=new JSONObject().put("output",new JSONArray().put(extractor(url,"鸭肉500克")).put(new JSONObject().put("type",type).put("status","completed")));
            assertEquals("source_mismatch",assertThrows(AiFailure.class,()->RecipeFinderSources.extractedText(root,url)).code);
        }
    }
}
