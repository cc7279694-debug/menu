package app.recipio.local;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Standard platform AES-GCM; hexadecimal is only the envelope encoding. */
final class AiSecretEnvelope {
    private static final byte[] AAD="app.recipio.local:ai-secret:v1".getBytes(StandardCharsets.UTF_8);
    static boolean isWorkspaceKey(char[] value) {
        return value != null && value.length >= 6 && value[0]=='s' && value[1]=='k' && value[2]=='-' && value[3]=='w' && value[4]=='s' && value[5]=='-';
    }
    static void validate(char[] value) throws Exception {
        if(value==null||value.length<20||value.length>512||value[0]!='s'||value[1]!='k'||value[2]!='-')throw new Exception("key_unavailable");
        // Token Plan credentials are not application API keys. Workspace keys are opaque,
        // and the platform-issued signed form can include dot-separated segments.
        if(value[3]=='s'&&value[4]=='p'&&value[5]=='-')throw new Exception("key_unavailable");
        boolean workspace=isWorkspaceKey(value);
        for(char c:value)if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='-'||c=='_'||workspace&&c=='.'))throw new Exception("key_unavailable");
    }
    static byte[] encrypt(char[] value,SecretKey key) throws Exception {
        validate(value);ByteBuffer buffer=StandardCharsets.UTF_8.encode(CharBuffer.wrap(value));byte[] plain=new byte[buffer.remaining()];buffer.get(plain);
        try {
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);cipher.updateAAD(AAD);
            return new JSONObject().put("version",1).put("iv",hex(cipher.getIV())).put("data",hex(cipher.doFinal(plain))).toString().getBytes(StandardCharsets.UTF_8);
        } finally {Arrays.fill(plain,(byte)0);if(buffer.hasArray())Arrays.fill(buffer.array(),(byte)0);}
    }
    static char[] decrypt(byte[] bytes,SecretKey key) throws Exception{return decrypt(bytes,key,AAD);}
    static char[] decrypt(byte[] bytes,SecretKey key,byte[] aad) throws Exception {
        if(bytes.length==0||bytes.length>8192)throw new Exception("key_unavailable");
        JSONObject json=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
        if(json.length()!=3||!(json.get("version") instanceof Integer)||json.getInt("version")!=1)throw new Exception("key_unavailable");
        byte[] iv=unhex(json.getString("iv")),data=unhex(json.getString("data"));
        if(iv.length!=12||data.length<16||data.length>528)throw new Exception("key_unavailable");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,iv));cipher.updateAAD(aad);byte[] plain=cipher.doFinal(data);
        try {CharBuffer decoded=StandardCharsets.UTF_8.decode(ByteBuffer.wrap(plain));char[] result=new char[decoded.remaining()];decoded.get(result);if(decoded.hasArray())Arrays.fill(decoded.array(),'\0');validate(result);return result;}
        finally {Arrays.fill(plain,(byte)0);}
    }
    private static String hex(byte[] bytes){char[] out=new char[bytes.length*2];String digits="0123456789abcdef";for(int i=0;i<bytes.length;i++){out[i*2]=digits.charAt((bytes[i]>>>4)&15);out[i*2+1]=digits.charAt(bytes[i]&15);}return new String(out);}
    private static byte[] unhex(String text)throws Exception {if(text.length()%2!=0)throw new Exception("key_unavailable");byte[] out=new byte[text.length()/2];for(int i=0;i<out.length;i++){int a=Character.digit(text.charAt(i*2),16),b=Character.digit(text.charAt(i*2+1),16);if(a<0||b<0)throw new Exception("key_unavailable");out[i]=(byte)(a*16+b);}return out;}
}
