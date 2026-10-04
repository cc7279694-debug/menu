package app.recipio.local;
import static org.junit.Assert.*;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;

public class LocalBackupExportStateTest {
    @Test public void earlyFailureRemovesOnlyTheFreshUnverifiedDocument()throws Exception {
        LocalBackupExportState state=new LocalBackupExportState();AtomicInteger deletes=new AtomicInteger();
        state.discard(()->{deletes.incrementAndGet();return true;});assertEquals(1,deletes.get());
    }
    @Test public void verifiedExportMustNotBeDeletedDuringPrivateCleanup()throws Exception {
        LocalBackupExportState state=new LocalBackupExportState();state.markVerified();
        state.discard(()->{fail("verified external backup must be retained");return false;});
    }
    @Test public void refusedDeletionReportsAnExplicitIncompleteFileWarning() {
        LocalBackupExportState state=new LocalBackupExportState();
        IOException refusal=assertThrows(IOException.class,()->state.discard(()->false));assertTrue(refusal.getMessage().contains("未完成的备份文件"));
        IOException failure=assertThrows(IOException.class,()->state.discard(()->{throw new IOException("provider refused");}));assertNotNull(failure.getCause());
    }
}
