package app.recipio.captureprobe;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import app.recipio.captureprobe.core.VisualFiles;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

final class FrameShare {
    static final String AUTHORITY="app.recipio.captureprobe.selectedframes";
    private FrameShare(){}
    static Intent prepare(Context context,List<Integer> ids)throws IOException{
        List<File> copies=new VisualFiles(context.getCacheDir()).share(ids,System.currentTimeMillis());
        ArrayList<Uri> uris=new ArrayList<>();
        for(File file:copies)uris.add(FileProvider.getUriForFile(context,AUTHORITY,file));
        return intent(uris);
    }
    static Intent intent(ArrayList<Uri> uris){
        if(uris.isEmpty()||uris.size()>6)throw new IllegalArgumentException("share count");
        for(Uri uri:uris)if(!"content".equals(uri.getScheme())||!AUTHORITY.equals(uri.getAuthority()))throw new IllegalArgumentException("share URI");
        Intent send=new Intent(uris.size()==1?Intent.ACTION_SEND:Intent.ACTION_SEND_MULTIPLE).setType("image/jpeg");
        if(uris.size()==1)send.putExtra(Intent.EXTRA_STREAM,uris.get(0));else send.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);
        ClipData clip=new ClipData("用户选择的视频画面",new String[]{"image/jpeg"},new ClipData.Item(uris.get(0)));
        for(int i=1;i<uris.size();i++)clip.addItem(new ClipData.Item(uris.get(i)));
        send.setClipData(clip);return send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    }
    static void deleteAll(Context context)throws IOException{
        // Revoke issued capabilities before explicit deletion, not after share handoff.
        context.revokeUriPermission(Uri.parse("content://"+AUTHORITY+"/"),Intent.FLAG_GRANT_READ_URI_PERMISSION);
        new VisualFiles(context.getCacheDir()).clearAll();
    }
}
