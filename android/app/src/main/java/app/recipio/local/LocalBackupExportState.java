package app.recipio.local;
import java.io.IOException;
/** Owns only the new document returned by ACTION_CREATE_DOCUMENT. */
final class LocalBackupExportState {
    interface Remove { boolean delete()throws Exception; }
    private boolean verified;
    void markVerified(){verified=true;}
    void discard(Remove remove)throws IOException {
        if(verified)return;
        try {if(!remove.delete())throw new IOException("provider refused deletion");}
        catch(Exception e){throw new IOException("系统可能残留未完成的备份文件，不能用作备份，请手动删除。",e);}
    }
}
