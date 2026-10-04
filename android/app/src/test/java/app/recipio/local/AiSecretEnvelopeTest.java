package app.recipio.local;

import static org.junit.Assert.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;
import org.junit.Test;

public class AiSecretEnvelopeTest {
    private final SecretKeySpec key = new SecretKeySpec(new byte[32], "AES");
    private final char[] secret = ("sk-" + java.util.UUID.randomUUID()).toCharArray();
    @Test public void roundTripDoesNotContainPlaintextAndUsesDifferentIv() throws Exception {
        byte[] first=AiSecretEnvelope.encrypt(secret,key),second=AiSecretEnvelope.encrypt(secret,key);
        assertFalse(Arrays.equals(first,second));
        assertFalse(new String(first,StandardCharsets.UTF_8).contains(new String(secret)));
        assertArrayEquals(secret,AiSecretEnvelope.decrypt(first,key));
    }
    @Test public void tamperAndWrongKeyAreRejected() throws Exception {
        byte[] encoded=AiSecretEnvelope.encrypt(secret,key);
        JSONObject json=new JSONObject(new String(encoded,StandardCharsets.UTF_8));
        String data=json.getString("data");json.put("data",(data.charAt(0)=='a' ? "b" : "a")+data.substring(1));
        assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(json.toString().getBytes(StandardCharsets.UTF_8),key));
        byte[] other=new byte[32];other[0]=1;
        assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(encoded,new SecretKeySpec(other,"AES")));
    }
    @Test public void invalidVersionExtraFieldsAndTruncatedEnvelopeAreRejected() throws Exception {
        JSONObject json=new JSONObject(new String(AiSecretEnvelope.encrypt(secret,key),StandardCharsets.UTF_8));
        json.put("version",2);assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(json.toString().getBytes(StandardCharsets.UTF_8),key));
        json.put("version",1).put("key","unexpected");assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(json.toString().getBytes(StandardCharsets.UTF_8),key));
        assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(new byte[0],key));
    }
    @Test public void aadIsBoundToApplicationAndEnvelopeVersion() throws Exception {
        byte[] encoded=AiSecretEnvelope.encrypt(secret,key);
        assertThrows(Exception.class,()->AiSecretEnvelope.decrypt(encoded,key,"another-application".getBytes(StandardCharsets.UTF_8)));
    }
    @Test public void invalidInputDoesNotReachEncryption() {
        for(String input:new String[]{"", "sk-short", "sk-"+"x".repeat(513),"sk-"+"x".repeat(20)+"\n"})
            assertThrows(Exception.class,()->AiSecretEnvelope.encrypt(input.toCharArray(),key));
    }
    @Test public void atomicWriteFailureRetainsOldCiphertextAndDeleteIsIdempotent() throws Exception {
        final byte[][] contents={null};final boolean[] fail={false};
        AiSecretStore.EnvelopeFile file=new AiSecretStore.EnvelopeFile(){
            public byte[] read(){return contents[0];}
            public void replace(byte[] bytes) throws Exception {if(fail[0])throw new java.io.IOException();contents[0]=bytes;}
            public void delete(){contents[0]=null;}
        };
        AiSecretStore store=new AiSecretStore(file,create->key);assertFalse(store.hasKey());store.save(secret);
        byte[] original=contents[0];fail[0]=true;
        assertThrows(Exception.class,()->store.save(("sk-"+java.util.UUID.randomUUID()).toCharArray()));
        assertArrayEquals(original,contents[0]);assertArrayEquals(secret,store.readForRequest());
        store.delete();store.delete();assertFalse(store.hasKey());
    }
    @Test public void damagedCiphertextIsNotRemovedOrReplacedOnRead() throws Exception {
        final byte[] damaged={1,2,3};final boolean[] changed={false};
        AiSecretStore store=new AiSecretStore(new AiSecretStore.EnvelopeFile(){
            public byte[] read(){return damaged;}
            public void replace(byte[] ignored){changed[0]=true;}
            public void delete(){changed[0]=true;}
        },create->{assertFalse(create);return key;});
        assertEquals("key_unavailable",assertThrows(AiFailure.class,store::hasKey).code);assertFalse(changed[0]);
    }
}
