package app.recipio.local;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import com.google.gson.*;
import com.google.gson.stream.*;
final class AiIntakeContract {
    static final String ENDPOINT="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    static final String QIANWEN_ENDPOINT="https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions";
    static final String MODEL="qwen3.8-flash";
    enum Provider {
        BEIJING(ENDPOINT,"beijing"), QIANWEN(QIANWEN_ENDPOINT,"qianwen-platform");
        final String endpoint, profile;
        Provider(String endpoint,String profile){this.endpoint=endpoint;this.profile=profile;}
    }
    static Provider providerFor(char[] key)throws Exception {
        AiSecretEnvelope.validate(key);
        return AiSecretEnvelope.isWorkspaceKey(key)?Provider.QIANWEN:Provider.BEIJING;
    }
    final JSONObject asset;private final JsonObject schema;
    AiIntakeContract(InputStream input)throws Exception{
        try(input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(out.size()+n>262144)throw new AiFailure("invalid_output");out.write(buffer,0,n);}asset=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));}
        if(asset.getInt("version")!=1||!MODEL.equals(asset.getString("model"))||!ENDPOINT.equals(asset.getString("endpoint")))throw new AiFailure("invalid_output");
        schema=parse(asset.getJSONObject("schema").toString()).getAsJsonObject();
    }
    int limit(String name)throws Exception{return asset.getJSONObject("limits").getInt(name);}
    static JsonElement parse(String raw)throws AiFailure {
        try(JsonReader reader=new JsonReader(new StringReader(raw))){reader.setStrictness(Strictness.STRICT);JsonElement result=JsonParser.parseReader(reader);if(reader.peek()!=JsonToken.END_DOCUMENT)throw new AiFailure("invalid_output");return result;}
        catch(Exception ignored){throw new AiFailure("invalid_output");}
    }
    void validateDraft(String raw)throws AiFailure {
        JsonElement parsed=parse(raw);validate(schema,parsed);
        JsonObject recipe=parsed.getAsJsonObject().getAsJsonObject("recipe");if(recipe.get("title").getAsString().trim().isEmpty())throw new AiFailure("invalid_output");
        int steps=recipe.getAsJsonArray("steps").size();for(JsonElement tip:recipe.getAsJsonArray("keyTips")){JsonElement number=tip.getAsJsonObject().get("stepNumber");if(!number.isJsonNull()&&number.getAsInt()>steps)throw new AiFailure("invalid_output");}
    }
    private static void require(boolean good)throws AiFailure {if(!good)throw new AiFailure("invalid_output");}
    static void validate(JsonObject rules,JsonElement value)throws AiFailure {
        if(rules.has("anyOf")){for(JsonElement alternative:rules.getAsJsonArray("anyOf")){try{validate(alternative.getAsJsonObject(),value);return;}catch(AiFailure ignored){}}throw new AiFailure("invalid_output");}
        String type=rules.get("type").getAsString();
        switch(type){
            case "null":require(value.isJsonNull());break;
            case "object":
                require(value.isJsonObject());JsonObject object=value.getAsJsonObject(),properties=rules.getAsJsonObject("properties");
                for(JsonElement name:rules.getAsJsonArray("required"))require(object.has(name.getAsString()));
                for(String name:object.keySet()){require(properties.has(name));validate(properties.getAsJsonObject(name),object.get(name));}break;
            case "array":
                require(value.isJsonArray());JsonArray array=value.getAsJsonArray();if(rules.has("maxItems"))require(array.size()<=rules.get("maxItems").getAsInt());
                for(JsonElement item:array)validate(rules.getAsJsonObject("items"),item);break;
            case "string":
                require(value.isJsonPrimitive()&&value.getAsJsonPrimitive().isString());String string=value.getAsString();
                if(rules.has("minLength"))require(string.trim().length()>=rules.get("minLength").getAsInt());if(rules.has("maxLength"))require(string.trim().length()<=rules.get("maxLength").getAsInt());
                if(rules.has("enum")){boolean found=false;for(JsonElement choice:rules.getAsJsonArray("enum"))if(choice.getAsString().equals(string))found=true;require(found);}break;
            case "integer":case "number":
                require(value.isJsonPrimitive()&&value.getAsJsonPrimitive().isNumber());double number=value.getAsDouble();require(!Double.isNaN(number)&&!Double.isInfinite(number));if(type.equals("integer"))require(number==Math.rint(number));
                if(rules.has("minimum"))require(number>=rules.get("minimum").getAsDouble());if(rules.has("maximum"))require(number<=rules.get("maximum").getAsDouble());break;
            default:throw new AiFailure("invalid_output");
        }
    }
}
