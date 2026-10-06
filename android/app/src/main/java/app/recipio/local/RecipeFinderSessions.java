package app.recipio.local;
import java.util.*;
final class RecipeFinderSessions {
    private static final class Session {long generation;final Map<String,RecipeFinderSources.Candidate> candidates=new LinkedHashMap<>();}
    private final Map<String,Session> sessions=new HashMap<>();private final LinkedHashSet<String> discarded=new LinkedHashSet<>();
    synchronized String create()throws AiFailure {if(sessions.size()>=8)throw new AiFailure("busy");String id=UUID.randomUUID().toString();sessions.put(id,new Session());return id;}
    private Session require(String id)throws AiFailure {if(!AiRequestLifecycle.uuid(id)||!sessions.containsKey(id))throw new AiFailure("stale_session");return sessions.get(id);}
    synchronized long beginSearch(String id)throws AiFailure {Session session=require(id);session.candidates.clear();return ++session.generation;}
    synchronized long generation(String id)throws AiFailure {return require(id).generation;}
    synchronized void publish(String id,long generation,List<RecipeFinderSources.Candidate> candidates)throws AiFailure {current(id,generation);if(candidates.size()>3)throw new AiFailure("no_candidates");Session session=require(id);session.candidates.clear();for(RecipeFinderSources.Candidate candidate:candidates)session.candidates.put(candidate.id,candidate);}
    synchronized RecipeFinderSources.Candidate selected(String id,String candidate)throws AiFailure {RecipeFinderSources.Candidate selected=require(id).candidates.get(candidate);if(!AiRequestLifecycle.uuid(candidate)||selected==null)throw new AiFailure("source_missing");return selected;}
    synchronized void current(String id,long generation)throws AiFailure {if(require(id).generation!=generation)throw new AiFailure("stale_session");}
    synchronized void discard(String id)throws AiFailure {if(!AiRequestLifecycle.uuid(id)||!sessions.containsKey(id)&&!discarded.contains(id))throw new AiFailure("stale_session");sessions.remove(id);discarded.add(id);if(discarded.size()>32)discarded.remove(discarded.iterator().next());}
    synchronized void clear(){sessions.clear();discarded.clear();}
}
