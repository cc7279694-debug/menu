package app.recipio.local;
import static org.junit.Assert.*;
import java.util.*;
import org.junit.Test;

public class RecipeFinderSessionsTest {
    private List<RecipeFinderSources.Candidate> candidates()throws Exception {String url="https://recipes.example/duck";return RecipeFinderSources.search(RecipeFinderSourcesTest.search(new String[]{url},RecipeFinderSourcesTest.candidate(url)));}
    // A JS-supplied candidate from another session must never choose a source.
    @Test public void selectedCandidateIsOwnedByExactlyOneNativeSession()throws Exception {
        RecipeFinderSessions sessions=new RecipeFinderSessions();String first=sessions.create(),second=sessions.create();assertTrue(AiRequestLifecycle.uuid(first));long generation=sessions.beginSearch(first);List<RecipeFinderSources.Candidate> found=candidates();sessions.publish(first,generation,found);
        assertEquals("https://recipes.example/duck",sessions.selected(first,found.get(0).id).sourceUrl);assertEquals("source_missing",assertThrows(AiFailure.class,()->sessions.selected(second,found.get(0).id)).code);
    }
    @Test public void newSearchResetsOwnershipEvenIfPreviousSearchReplyArrivesLate()throws Exception {
        RecipeFinderSessions sessions=new RecipeFinderSessions();String id=sessions.create();long previous=sessions.beginSearch(id);List<RecipeFinderSources.Candidate> found=candidates();sessions.publish(id,previous,found);long current=sessions.beginSearch(id);
        assertEquals("source_missing",assertThrows(AiFailure.class,()->sessions.selected(id,found.get(0).id)).code);assertEquals("stale_session",assertThrows(AiFailure.class,()->sessions.publish(id,previous,found)).code);sessions.publish(id,current,found);assertEquals(found.get(0),sessions.selected(id,found.get(0).id));
    }
    @Test public void discardPreventsBothLateSearchAndLateExtractionFromRevivingSession()throws Exception {
        RecipeFinderSessions sessions=new RecipeFinderSessions();String id=sessions.create();long generation=sessions.beginSearch(id);List<RecipeFinderSources.Candidate> found=candidates();sessions.publish(id,generation,found);sessions.discard(id);sessions.discard(id);
        assertEquals("stale_session",assertThrows(AiFailure.class,()->sessions.publish(id,generation,found)).code);assertEquals("stale_session",assertThrows(AiFailure.class,()->sessions.current(id,generation)).code);assertEquals("stale_session",assertThrows(AiFailure.class,()->sessions.selected(id,found.get(0).id)).code);
    }
    @Test public void memorySessionCapacityAndDestroyAreBounded()throws Exception {
        RecipeFinderSessions sessions=new RecipeFinderSessions();List<String> ids=new ArrayList<>();for(int i=0;i<8;i++)ids.add(sessions.create());assertEquals("busy",assertThrows(AiFailure.class,sessions::create).code);sessions.discard(ids.get(0));assertTrue(AiRequestLifecycle.uuid(sessions.create()));sessions.clear();assertEquals("stale_session",assertThrows(AiFailure.class,()->sessions.generation(ids.get(1))).code);
    }
    @Test public void validEmptyResultsKeepSessionAvailableWithoutAnySelectedSource()throws Exception {
        RecipeFinderSessions sessions=new RecipeFinderSessions();String id=sessions.create();long generation=sessions.beginSearch(id);sessions.publish(id,generation,List.of());sessions.current(id,generation);
        assertEquals("source_missing",assertThrows(AiFailure.class,()->sessions.selected(id,UUID.randomUUID().toString())).code);
    }
}
