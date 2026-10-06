package app.recipio.local;

import static org.junit.Assert.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;
import org.junit.Test;

/** Bounded test-only diagnosis of the v17 text handoff. Never retains/logs raw content. */
public class RecipeFinderLegacyDiagnosticsTest {
    private enum Stage {
        FINAL_TEXT_NOT_JSON, FINAL_TEXT_SCHEMA_MISMATCH, CANDIDATE_EXACT_KEYS_MISMATCH,
        CANDIDATE_SOURCE_MISMATCH, NO_VERIFIED_CANDIDATE, OTHER_INVALID_OUTPUT
    }
    private static JSONObject diagnose(JSONObject response) throws Exception {
        JSONArray output=response.getJSONArray("output");
        int searches=0,extractors=0,assistants=0;Set<String> verified=new HashSet<>();
        for(int i=0;i<Math.min(output.length(),128);i++) {
            JSONObject item=output.getJSONObject(i);String type=item.optString("type");
            if("message".equals(type)&&"assistant".equals(item.optString("role")))assistants++;
            if("web_extractor_call".equals(type))extractors++;
            if(!"web_search_call".equals(type))continue;searches++;
            if(!"completed".equals(item.optString("status")))continue;
            JSONObject action=item.optJSONObject("action");
            if(action==null||!"search".equals(action.optString("type")))continue;
            JSONArray sources=action.optJSONArray("sources");if(sources==null)continue;
            for(int j=0;j<Math.min(sources.length(),256);j++) {
                JSONObject source=sources.optJSONObject(j);
                if(source==null||!"url".equals(source.optString("type")))continue;
                try{verified.add(RecipeFinderSources.canonical(source.getString("url")));}catch(Exception ignored){}
            }
        }
        Stage stage=Stage.OTHER_INVALID_OUTPUT;
        try {
            String text=legacyFinalText(response);JSONObject proposed;
            try{proposed=new JSONObject(RecipeFinderClient.parseStrict(text).toString());}
            catch(Exception ignored){throw new DiagnosticStage(Stage.FINAL_TEXT_NOT_JSON);}
            try{RecipeFinderSources.exactKeys(proposed,"candidates");proposed.getJSONArray("candidates");}
            catch(Exception ignored){throw new DiagnosticStage(Stage.FINAL_TEXT_SCHEMA_MISMATCH);}
            JSONArray candidates=proposed.getJSONArray("candidates");
            if(candidates.length()==0)throw new DiagnosticStage(Stage.NO_VERIFIED_CANDIDATE);
            for(int i=0;i<candidates.length();i++) {
                JSONObject candidate=candidates.getJSONObject(i);
                try{RecipeFinderSources.exactKeys(candidate,"title","sourceUrl","summary","highlights","totalMinutes","preparationHint","timeEvidence","preparationEvidence");}
                catch(Exception ignored){throw new DiagnosticStage(Stage.CANDIDATE_EXACT_KEYS_MISMATCH);}
                if(!verified.contains(RecipeFinderSources.canonical(candidate.getString("sourceUrl"))))throw new DiagnosticStage(Stage.CANDIDATE_SOURCE_MISMATCH);
            }
        }catch(DiagnosticStage known){stage=known.stage;}catch(Exception ignored){}
        return new JSONObject().put("response_completed","completed".equals(response.optString("status")))
            .put("search_call_count",searches).put("verified_source_count",verified.size())
            .put("extractor_count",extractors).put("assistant_message_count",assistants).put("failure_stage",stage.name());
    }
    private static final class DiagnosticStage extends Exception {
        final Stage stage;DiagnosticStage(Stage stage){this.stage=stage;}
    }
    // Historical v17 framing exists only here for controlled diagnosis, not as a fallback.
    private static String legacyFinalText(JSONObject root)throws Exception {
        String found=null;JSONArray items=root.getJSONArray("output");
        if(items.length()>128)throw new AiFailure("invalid_output");
        for(int i=0;i<items.length();i++) {
            JSONObject item=items.getJSONObject(i);if(!"message".equals(item.optString("type")))continue;
            if(!"assistant".equals(item.optString("role"))||!"completed".equals(item.optString("status"))||found!=null)throw new AiFailure("invalid_output");
            JSONArray content=item.getJSONArray("content");if(content.length()<1||content.length()>16)throw new AiFailure("invalid_output");StringBuilder text=new StringBuilder();
            for(int j=0;j<content.length();j++){JSONObject block=content.getJSONObject(j);if(!"output_text".equals(block.optString("type"))||!(block.opt("text") instanceof String))throw new AiFailure("invalid_output");text.append(block.getString("text"));if(text.length()>524288)throw new AiFailure("invalid_output");}
            found=text.toString();
        }
        if(found==null||found.trim().isEmpty())throw new AiFailure("invalid_output");return found;
    }
    private static JSONObject envelope(String text)throws Exception {
        return new JSONObject().put("status","completed").put("model","qwen3.8-flash").put("output",new JSONArray()
            .put(new JSONObject().put("type","web_search_call").put("status","completed").put("action",new JSONObject()
                .put("type","search").put("sources",new JSONArray().put(new JSONObject().put("type","url").put("url","https://recipes.example/duck?private=generated")))))
            .put(RecipeFinderSourcesTest.message(text)));
    }
    @Test public void legacyFailuresHaveOnlyBoundedStagesAndCountsAndRemainRejected()throws Exception {
        JSONObject candidate=RecipeFinderSourcesTest.candidate("https://recipes.example/duck?private=generated");
        JSONObject extra=new JSONObject(candidate.toString()).put("unexpected","PRIVATE_GENERATED_TEXT");
        JSONObject wrong=new JSONObject(candidate.toString()).put("sourceUrl","https://invented.example/duck?secret=generated");
        String[] bodies={"```json\n{\"candidates\":[]}\n```","PRIVATE_GENERATED_TEXT", "{\"candidates\":[],\"extra\":true}",
            new JSONObject().put("candidates",new JSONArray().put(extra)).toString(),new JSONObject().put("candidates",new JSONArray().put(wrong)).toString()};
        Stage[] stages={Stage.FINAL_TEXT_NOT_JSON,Stage.FINAL_TEXT_NOT_JSON,Stage.FINAL_TEXT_SCHEMA_MISMATCH,Stage.CANDIDATE_EXACT_KEYS_MISMATCH,Stage.CANDIDATE_SOURCE_MISMATCH};
        for(int i=0;i<bodies.length;i++) {
            JSONObject response=envelope(bodies[i]),diagnostic=diagnose(response);
            assertEquals(stages[i].name(),diagnostic.getString("failure_stage"));assertEquals(1,diagnostic.getInt("verified_source_count"));
            assertEquals(1,diagnostic.getInt("search_call_count"));assertEquals(1,diagnostic.getInt("assistant_message_count"));
            assertEquals(0,diagnostic.getInt("extractor_count"));assertTrue(diagnostic.getBoolean("response_completed"));
            assertEquals(6,diagnostic.length());assertFalse(diagnostic.toString().contains("PRIVATE"));assertFalse(diagnostic.toString().contains("https://"));
            AiIntakeContract contract=new AiIntakeContract(new FileInputStream("src/main/assets/recipio-ai-intake-contract.json"));
            RecipeFinderClient client=new RecipeFinderClient(contract,(request,token)->new RecipeFinderClient.HttpReply(200,new ByteArrayInputStream(response.toString().getBytes(StandardCharsets.UTF_8)),()->{}));
            char[] key=("sk-TEST_"+UUID.randomUUID()).toCharArray();
            try{assertThrows(AiFailure.class,()->client.search("生成测试菜","",key,new AiRequestLifecycle().tryBeginRequest(UUID.randomUUID().toString())));}
            finally{Arrays.fill(key,'\0');}
        }
        assertEquals(Stage.NO_VERIFIED_CANDIDATE.name(),diagnose(envelope("{\"candidates\":[]}")).getString("failure_stage"));
    }
}
