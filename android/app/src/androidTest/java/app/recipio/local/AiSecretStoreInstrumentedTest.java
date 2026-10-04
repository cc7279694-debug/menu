package app.recipio.local;

import static org.junit.Assert.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.PluginMethod;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import org.junit.*;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AiSecretStoreInstrumentedTest {
    private File root;private String alias;private AiSecretStore store;
    @Before public void setup(){root=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getNoBackupFilesDir(),"ai-test-"+UUID.randomUUID());alias="recipio-test-"+UUID.randomUUID();store=AiSecretStore.open(root,alias);}
    @After public void cleanup()throws Exception {store.delete();KeyStore keys=KeyStore.getInstance("AndroidKeyStore");keys.load(null);if(keys.containsAlias(alias))keys.deleteEntry(alias);LocalBackupArchive.deleteOwnedTree(root);}
    @Test public void nativeKeystoreSurvivesStoreReopenWithoutPlaintextFile()throws Exception {
        char[] generated=("sk-"+UUID.randomUUID()).toCharArray();store.save(generated);assertTrue(store.hasKey());
        File file=new File(root,"ai-secret/key-v1.json");byte[] first=Files.readAllBytes(file.toPath());
        assertFalse(new String(first,StandardCharsets.UTF_8).contains(new String(generated)));
        assertArrayEquals(generated,AiSecretStore.open(root,alias).readForRequest());store.save(generated);
        assertFalse(Arrays.equals(first,Files.readAllBytes(file.toPath())));Arrays.fill(generated,'\0');
    }
    @Test public void corruptionRetainsCiphertextAndNeverMakesNewKey()throws Exception {
        store.save(("sk-"+UUID.randomUUID()).toCharArray());File file=new File(root,"ai-secret/key-v1.json");Files.write(file.toPath(),new byte[]{1,2,3});
        assertThrows(Exception.class,store::hasKey);assertArrayEquals(new byte[]{1,2,3},Files.readAllBytes(file.toPath()));
    }
    @Test public void bridgeHasNoPlaintextGetterOrKeyParameter() {
        Set<String> names=new HashSet<>();for(java.lang.reflect.Method method:LocalAiSecretPlugin.class.getDeclaredMethods())if(method.isAnnotationPresent(PluginMethod.class))names.add(method.getName());
        assertEquals(new HashSet<>(Arrays.asList("saveAiKey","hasAiKey","deleteAiKey")),names);
    }
    @Test public void deletionIsIdempotentAndFreshContextIsUnconfigured()throws Exception {store.delete();store.delete();assertFalse(store.hasKey());}
}
