package app.recipio.local;
import java.net.*;
import java.util.*;
import java.util.regex.*;
import org.json.*;
final class RecipeFinderSources {
    static final int SOURCE_TEXT_CODE_POINTS=30000;
    static final class Candidate {
        final String id,title,sourceUrl,sourceHost,summary,preparationHint;final List<String> highlights;final Integer totalMinutes;
        Candidate(String title,String url,String host,String summary,List<String> highlights,Integer minutes,String preparation){id=UUID.randomUUID().toString();this.title=title;sourceUrl=url;sourceHost=host;this.summary=summary;this.highlights=Collections.unmodifiableList(new ArrayList<>(highlights));totalMinutes=minutes;preparationHint=preparation;}
        JSONObject json()throws Exception {return new JSONObject().put("id",id).put("title",title).put("sourceUrl",sourceUrl).put("sourceHost",sourceHost).put("summary",summary).put("highlights",new JSONArray(highlights)).put("totalMinutes",totalMinutes==null?JSONObject.NULL:totalMinutes).put("preparationHint",preparationHint);}
    }
    static String canonical(String value)throws AiFailure {
        try {
            WebUrlSafety.Target target=WebUrlSafety.parse(value);String host=target.host;
            if(host.indexOf(':')>=0){if(!WebUrlSafety.isGlobal(InetAddress.getByName(host)))throw new AiFailure("source_mismatch");}
            else if(host.matches("[0-9.]+")){
                String[] parts=host.split("\\.",-1);if(parts.length!=4)throw new AiFailure("source_mismatch");byte[] bytes=new byte[4];
                for(int i=0;i<4;i++){if(!parts[i].matches("0|[1-9][0-9]{0,2}"))throw new AiFailure("source_mismatch");int octet=Integer.parseInt(parts[i]);if(octet>255)throw new AiFailure("source_mismatch");bytes[i]=(byte)octet;}
                if(!WebUrlSafety.isGlobal(InetAddress.getByAddress(bytes)))throw new AiFailure("source_mismatch");
            }else if(host.indexOf('.')<0||host.endsWith(".internal")||host.endsWith(".onion"))throw new AiFailure("source_mismatch");
            for(String excluded:List.of("youtube.com","youtu.be","bilibili.com","b23.tv","douyin.com","xiaohongshu.com","xhslink.com"))if(host.equals(excluded)||host.endsWith("."+excluded))throw new AiFailure("source_mismatch");
            URI uri=target.uri;String path=uri.getRawPath()==null?"":uri.getRawPath();String query=uri.getRawQuery();
            return (target.secure?"https":"http")+"://"+(host.indexOf(':')>=0?"["+host+"]":host)+path+(query==null?"":"?"+query);
        }catch(AiFailure failure){throw failure;}catch(Exception ignored){throw new AiFailure("source_mismatch");}
    }
    private static JSONArray output(JSONObject root)throws AiFailure {Object value=root.opt("output");if(!(value instanceof JSONArray)||((JSONArray)value).length()>128)throw new AiFailure("invalid_output");return (JSONArray)value;}
    static JSONObject candidateSchema()throws Exception {
        JSONObject properties=new JSONObject();
        for(String name:List.of("title","sourceUrl","summary","preparationHint","timeEvidence","preparationEvidence"))properties.put(name,new JSONObject().put("type","string"));
        properties.put("highlights",new JSONObject().put("type","array").put("maxItems",3).put("items",new JSONObject().put("type","string")));
        properties.put("totalMinutes",new JSONObject().put("anyOf",new JSONArray().put(new JSONObject().put("type","integer")).put(new JSONObject().put("type","null"))));
        JSONObject candidate=new JSONObject().put("type","object").put("properties",properties)
            .put("required",new JSONArray(List.of("title","sourceUrl","summary","highlights","totalMinutes","preparationHint","timeEvidence","preparationEvidence"))).put("additionalProperties",false);
        return new JSONObject().put("type","object").put("properties",new JSONObject().put("candidates",new JSONObject().put("type","array").put("maxItems",3).put("items",candidate)))
            .put("required",new JSONArray().put("candidates")).put("additionalProperties",false);
    }
    static String functionArguments(JSONObject root,String name,String missingCode)throws Exception {
        String found=null;JSONArray items=output(root);
        for(int i=0;i<items.length();i++) {
            JSONObject item=items.getJSONObject(i);if(!"function_call".equals(item.optString("type")))continue;
            if(!name.equals(item.optString("name"))||!"completed".equals(item.optString("status"))||found!=null||!(item.opt("arguments") instanceof String))throw new AiFailure("invalid_output");
            found=item.getString("arguments");if(found.trim().isEmpty()||found.length()>524288)throw new AiFailure("invalid_output");
        }
        if(found==null)throw new AiFailure(missingCode);
        if(!RecipeFinderClient.parseStrict(found).isJsonObject())throw new AiFailure("invalid_output");
        return found;
    }
    static List<Candidate> search(JSONObject root)throws Exception {
        JSONArray items=output(root);Set<String> verified=new HashSet<>();Map<String,String> evidence=new HashMap<>();boolean completed=false;
        for(int i=0;i<items.length();i++){
            JSONObject item=items.getJSONObject(i);if(!"web_search_call".equals(item.optString("type"))||!"completed".equals(item.optString("status")))continue;
            JSONObject action=item.optJSONObject("action");if(action==null||!"search".equals(action.optString("type")))continue;completed=true;
            JSONArray sources=action.optJSONArray("sources");if(sources==null)continue;if(sources.length()>256)throw new AiFailure("invalid_output");
            for(int j=0;j<sources.length();j++){
                JSONObject source=sources.optJSONObject(j);if(source==null||!"url".equals(source.optString("type"))||!(source.opt("url") instanceof String))continue;
                try{String url=canonical(source.getString("url"));verified.add(url);Object snippet=source.opt("snippet");if(snippet instanceof String&&((String)snippet).length()<=10000)evidence.put(url,(String)snippet);}catch(AiFailure ignored){/* Reject this source while retaining any independently valid sources. */}
            }
        }
        if(!completed)throw new AiFailure("search_not_triggered");
        for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(!"web_extractor_call".equals(item.optString("type"))||!"completed".equals(item.optString("status")))continue;JSONArray urls=item.optJSONArray("urls");Object text=item.opt("output");if(urls==null||urls.length()!=1||!(text instanceof String))continue;try{String url=canonical(urls.getString(0));if(verified.contains(url))evidence.put(url,boundedText((String)text));}catch(AiFailure ignored){/* Unverifiable extraction cannot support a claim. */}}
        String arguments=functionArguments(root,"submit_candidates",verified.isEmpty()?"source_missing":"candidate_output_missing");
        com.google.gson.JsonElement decoded=RecipeFinderClient.parseStrict(arguments);
        AiIntakeContract.validate(AiIntakeContract.parse(candidateSchema().toString()).getAsJsonObject(),decoded);
        JSONObject message=new JSONObject(decoded.toString());exactKeys(message,"candidates");JSONArray proposed=message.getJSONArray("candidates");if(proposed.length()>3)throw new AiFailure("invalid_output");
        if(proposed.length()==0){if(verified.isEmpty())throw new AiFailure("source_missing");return Collections.emptyList();}
        List<Candidate> candidates=new ArrayList<>();Set<String> used=new HashSet<>();
        for(int i=0;i<proposed.length();i++){
            try{
                JSONObject value=proposed.getJSONObject(i);exactKeys(value,"title","sourceUrl","summary","highlights","totalMinutes","preparationHint","timeEvidence","preparationEvidence");
                String url=canonical(string(value,"sourceUrl",1,8192));if(!verified.contains(url)||used.contains(url))continue;
                String title=string(value,"title",1,120),summary=string(value,"summary",1,240),prep=string(value,"preparationHint",0,240),timeProof=string(value,"timeEvidence",0,500),prepProof=string(value,"preparationEvidence",0,500);
                JSONArray rawHighlights=value.getJSONArray("highlights");if(rawHighlights.length()>3)continue;List<String> highlights=new ArrayList<>();for(int j=0;j<rawHighlights.length();j++)highlights.add(string(rawHighlights.get(j),0,120));
                Integer minutes=null;Object time=value.get("totalMinutes");if(time!=JSONObject.NULL){if(!(time instanceof Number)||!Double.isFinite(((Number)time).doubleValue())||((Number)time).doubleValue()!=((Number)time).intValue()||((Number)time).intValue()<1||((Number)time).intValue()>1440)continue;int proposedMinutes=((Number)time).intValue();String proof=evidence.get(url);if(proof!=null&&!timeProof.isEmpty()&&proof.contains(timeProof)&&Pattern.compile("(?i)(?:总(?:耗)?时|总共|总计|total(?:\\s+(?:time|minutes))?)[^0-9]{0,12}"+proposedMinutes+"\\s*(?:分钟|分|min(?:utes?)?)").matcher(timeProof).find())minutes=proposedMinutes;}
                String proof=evidence.get(url);if(proof==null||prepProof.isEmpty()||!proof.contains(prepProof)||!prepProof.equals(prep))prep="";
                candidates.add(new Candidate(title,url,WebUrlSafety.parse(url).host,summary,highlights,minutes,prep));used.add(url);
            }catch(Exception ignored){/* Malformed or unverifiable individual candidates are never promoted. */}
        }
        if(candidates.isEmpty())throw new AiFailure("no_candidates");return candidates;
    }
    static String extractedText(JSONObject root,String selected)throws Exception {
        String canonicalSelected=canonical(selected);JSONArray items=output(root);StringBuilder text=new StringBuilder();boolean completed=false;
        for(int i=0;i<items.length();i++){
            JSONObject item=items.getJSONObject(i);String type=item.optString("type");
            boolean draftHandoff="function_call".equals(type)&&"submit_recipe_draft".equals(item.optString("name"));
            if(type.endsWith("_call")&&!"web_extractor_call".equals(type)&&!draftHandoff)throw new AiFailure("source_mismatch");if(!"web_extractor_call".equals(type))continue;
            JSONArray urls=item.optJSONArray("urls");if(urls==null||urls.length()!=1||!(urls.opt(0) instanceof String)||!canonicalSelected.equals(canonical(urls.getString(0))))throw new AiFailure("source_mismatch");
            if(!"completed".equals(item.optString("status")))throw new AiFailure("source_unreadable");Object value=item.opt("output");if(!(value instanceof String)||((String)value).trim().isEmpty())throw new AiFailure("source_unreadable");
            completed=true;if(text.length()>0)text.append('\n');text.append((String)value);
        }
        if(!completed)throw new AiFailure("source_unreadable");return boundedText(text.toString());
    }
    private static String boundedText(String text){int count=text.codePointCount(0,text.length());return count<=SOURCE_TEXT_CODE_POINTS?text:text.substring(0,text.offsetByCodePoints(0,SOURCE_TEXT_CODE_POINTS));}
    static String string(JSONObject object,String name,int min,int max)throws Exception {return string(object.get(name),min,max);}
    private static String string(Object object,int min,int max)throws AiFailure {if(!(object instanceof String))throw new AiFailure("invalid_output");String text=((String)object).trim();int count=text.codePointCount(0,text.length());if(count<min||count>max)throw new AiFailure("invalid_output");return text;}
    static void exactKeys(JSONObject value,String... names)throws AiFailure {Set<String> allowed=new HashSet<>(Arrays.asList(names));if(value.length()!=allowed.size())throw new AiFailure("invalid_output");Iterator<String> keys=value.keys();while(keys.hasNext())if(!allowed.contains(keys.next()))throw new AiFailure("invalid_output");}
}
