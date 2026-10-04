package app.recipio.local;
import javax.crypto.SecretKey;
import javax.crypto.KeyGenerator;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import java.io.*;
import java.security.KeyStore;
import java.util.Arrays;
final class AiSecretStore {
    interface EnvelopeFile {byte[] read()throws Exception;void replace(byte[] bytes)throws Exception;void delete()throws Exception;}
    interface KeyAccess {SecretKey get(boolean create)throws Exception;}
    private final EnvelopeFile file;private final KeyAccess keys;
    AiSecretStore(EnvelopeFile file,KeyAccess keys){this.file=file;this.keys=keys;}
    synchronized void save(char[] value)throws Exception{AiSecretEnvelope.validate(value);file.replace(AiSecretEnvelope.encrypt(value,keys.get(true)));}
    synchronized char[] readForRequest()throws AiFailure {
        try{byte[] bytes=file.read();return bytes==null ? null : AiSecretEnvelope.decrypt(bytes,keys.get(false));}
        catch(Exception ignored){throw new AiFailure("key_unavailable");}
    }
    synchronized boolean hasKey()throws Exception{char[] value=readForRequest();if(value==null)return false;Arrays.fill(value,'\0');return true;}
    synchronized void delete()throws Exception{file.delete();}
    static AiSecretStore open(Context context){return open(context.getNoBackupFilesDir(),"app.recipio.local.ai-key.v1");}
    static AiSecretStore open(File noBackup,String alias){
        File directory=new File(noBackup,"ai-secret");AtomicFile atomic=new AtomicFile(new File(directory,"key-v1.json"));
        EnvelopeFile file=new EnvelopeFile(){
            public byte[] read()throws Exception {
                if(!atomic.getBaseFile().exists()&&!new File(atomic.getBaseFile()+".bak").exists())return null;
                try(InputStream in=atomic.openRead();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                    byte[] buffer=new byte[1024];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>8192)throw new IOException();out.write(buffer,0,n);}return out.toByteArray();
                }
            }
            public void replace(byte[] bytes)throws Exception {
                if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException();FileOutputStream out=null;
                try{out=atomic.startWrite();out.write(bytes);atomic.finishWrite(out);}catch(Exception e){if(out!=null)atomic.failWrite(out);throw new IOException("key_unavailable");}
            }
            public void delete()throws Exception {atomic.delete();if(atomic.getBaseFile().exists())throw new IOException();}
        };
        return new AiSecretStore(file,create->{
            KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
            if(store.containsAlias(alias))return (SecretKey)store.getKey(alias,null);
            if(!create)throw new IOException("key_unavailable");
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());
            return generator.generateKey();
        });
    }
}
