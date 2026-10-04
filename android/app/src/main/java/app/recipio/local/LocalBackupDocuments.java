package app.recipio.local;
import android.content.ContentResolver;
import android.net.Uri;
import java.io.*;
/** Success requires closed output and fully validated document readback. */
final class LocalBackupDocuments {
    static LocalBackupArchive.Validated export(ContentResolver resolver,Uri uri,File complete,File readback)throws IOException {
        LocalBackupArchive.Validated expected=LocalBackupArchive.validate(complete);
        LocalBackupArchive.copyToOutput(complete,resolver.openOutputStream(uri,"w"));
        LocalBackupArchive.copyInput(resolver.openInputStream(uri),readback,LocalBackupArchive.MAX_BYTES);
        LocalBackupArchive.Validated actual=LocalBackupArchive.validate(readback);
        if(actual.size!=expected.size||!actual.sha256.equals(expected.sha256))throw new IOException("保存后的备份回读校验失败");
        return actual;
    }
}
