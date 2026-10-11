package app.recipio.captureprobe;

import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import androidx.core.content.FileProvider;
import app.recipio.captureprobe.core.VisualFiles;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;

/** Official FileProvider plus per-file selected export lease gate. Never serves candidates. */
public final class SelectedFrameProvider extends FileProvider {
    private void requireSelected(Uri uri){
        List<String> path=uri.getPathSegments();
        if(path.size()!=2||!"selected".equals(path.get(0))||uri.getQuery()!=null||uri.getFragment()!=null)throw new SecurityException("not a selected frame");
        try{
            if(getContext()==null||!new VisualFiles(getContext().getCacheDir()).readAllowed(path.get(1),System.currentTimeMillis()))throw new SecurityException("expired or unselected frame");
        }catch(IOException error){throw new SecurityException("frame unavailable");}
    }
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{
        if(!"r".equals(mode))throw new SecurityException("read only");requireSelected(uri);return super.openFile(uri,mode);
    }
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order){requireSelected(uri);return super.query(uri,projection,selection,args,order);}
    @Override public String getType(Uri uri){requireSelected(uri);return "image/jpeg";}
    @Override public int delete(Uri uri,String selection,String[] args){throw new SecurityException("read only");}
}
