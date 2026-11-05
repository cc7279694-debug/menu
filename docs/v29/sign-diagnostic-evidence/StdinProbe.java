import com.android.apksigner.PasswordRetriever;
import java.nio.charset.Charset;
import java.security.KeyStore;
import java.util.Arrays;
public class StdinProbe {
  public static void main(String[] args) throws Exception {
    char[] store="SYNTHETIC \u5b57 alpha".toCharArray();
    char[] key="SYNTHETIC \u7b26 beta".toCharArray();
    try (PasswordRetriever reader=new PasswordRetriever()) {
      if (!reader.getPasswords("stdin", "fixture store").stream().anyMatch(p->Arrays.equals(p,store))) System.exit(2);
      if (!reader.getPasswords("stdin", "fixture key").stream().anyMatch(p->Arrays.equals(p,key))) System.exit(3);
    }
    System.out.print("two_lines_match|"+Charset.defaultCharset().name()+"|"+KeyStore.getDefaultType());
  }
}
