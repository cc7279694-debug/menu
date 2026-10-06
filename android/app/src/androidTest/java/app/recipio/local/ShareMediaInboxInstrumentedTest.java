package app.recipio.local;

import static org.junit.Assert.*;
import android.app.ActivityManager;
import android.content.*;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.*;
import android.net.Uri;
import android.os.*;
import android.system.ErrnoException;
import android.system.Os;
import android.system.OsConstants;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.lang.reflect.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.*;

/** All image fixtures generated in the test provider; no personal media or network. */
public class ShareMediaInboxInstrumentedTest {
    private static final String AUTH="app.recipio.local.test.share-fixture";
    private Context context,testContext;private Object inbox;private final List<UUID> ids=new ArrayList<>();
    @Before public void setup()throws Exception{
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();testContext=InstrumentationRegistry.getInstrumentation().getContext();
        Class<?> type=null;try{type=Class.forName("app.recipio.local.ShareMediaInbox");}catch(ClassNotFoundException ignored){}
        assertNotNull("Bounded native share media staging is missing",type);
        Method method=type.getDeclaredMethod("forContext",Context.class);method.setAccessible(true);inbox=method.invoke(null,context);
        // The direct child-guardian fixture bypasses stage(); wait for the same
        // startup orphan-cleanup barrier stage() normally awaits before binding.
        CountDownLatch initialized=new CountDownLatch(1);String[] startupError={null};
        ((ShareMediaInbox)inbox).initialize((count,reason)->{startupError[0]=reason;initialized.countDown();});
        assertTrue("Share inbox initialization must finish before creating fixtures",initialized.await(5,TimeUnit.SECONDS));
        assertNull("Share inbox startup cleanup must succeed",startupError[0]);
    }
    @After public void cleanup()throws Exception{if(inbox!=null)for(UUID id:ids)release(id);fixtureGrant(context,Uri.parse("content://"+AUTH),false);}
    private Object call(String name,Class<?>[] types,Object... args)throws Exception{Method m=inbox.getClass().getDeclaredMethod(name,types);m.setAccessible(true);try{return m.invoke(inbox,args);}catch(InvocationTargetException e){if(e.getCause() instanceof Exception)throw (Exception)e.getCause();throw e;}}
    private void release(UUID id)throws Exception{call("release",new Class[]{UUID.class},id);}
    private File directory(UUID id){return new File(context.getCacheDir(),"share-inbox/"+id);}
    static void fixtureGrant(Context caller,Uri uri,boolean grant){
        Bundle payload=new Bundle();payload.putParcelable("uri",uri);
        Bundle reply=caller.getContentResolver().call(Uri.parse("content://"+AUTH),grant?"grantRead":"revokeRead",caller.getPackageName(),payload);
        assertNotNull("External generated provider grant reply",reply);assertTrue("External generated provider grants only the test receiver",reply.getBoolean("ok"));
    }
    private Uri fixture(String path){Uri uri=Uri.parse("content://"+AUTH+"/"+path);fixtureGrant(context,uri,true);return uri;}
    private Object[] stage(UUID id,List<Uri> uris,int flags)throws Exception{
        ids.add(id);CountDownLatch done=new CountDownLatch(1);Object[] result=new Object[2];Class<?> callback=Class.forName("app.recipio.local.ShareMediaInbox$Callback");
        Object handler=Proxy.newProxyInstance(callback.getClassLoader(),new Class[]{callback},(proxy,method,args)->{if(method.getName().equals("finished")){result[0]=args[0];result[1]=args[1];done.countDown();}return null;});
        call("stage",new Class[]{UUID.class,List.class,int.class,callback},id,uris,flags,handler);
        assertTrue("Share reader must complete within its receipt deadline",done.await(35,TimeUnit.SECONDS));return result;
    }
    private boolean processAlive(int pid)throws ErrnoException{
        // ActivityManager can retain an already-reaped reader entry. Prove OS liveness,
        // not merely presence in that asynchronously updated process list.
        try{Os.kill(pid,0);return true;}catch(ErrnoException error){if(error.errno==OsConstants.ESRCH)return false;throw error;}
    }
    private int readerPid()throws ErrnoException{
        ActivityManager am=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> list=am.getRunningAppProcesses();if(list==null)return 0;
        for(ActivityManager.RunningAppProcessInfo info:list)if((context.getPackageName()+":sharemedia").equals(info.processName)
            &&info.uid==android.os.Process.myUid()&&info.pid>0&&info.pid!=android.os.Process.myPid()&&processAlive(info.pid))return info.pid;
        return 0;
    }
    private boolean readerAlive()throws ErrnoException{return readerPid()!=0;}
    private static Object field(Object owner,String name)throws Exception{Field member=owner.getClass().getDeclaredField(name);member.setAccessible(true);return member.get(owner);}
    private static void field(Object owner,String name,Object value)throws Exception{Field member=owner.getClass().getDeclaredField(name);member.setAccessible(true);member.set(owner,value);}
    @Test public void unconfirmedExitQuarantinesBytesAndQueueUntilReleaseRetry()throws Exception{
        UUID id=UUID.randomUUID(),queuedId=UUID.randomUUID();
        assertNull(stage(id,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);ids.add(queuedId);
        CountDownLatch failed=new CountDownLatch(1),queued=new CountDownLatch(1);java.util.concurrent.atomic.AtomicInteger completions=new java.util.concurrent.atomic.AtomicInteger();String[] firstReason={null},queuedReason={null};
        ShareMediaInbox.Callback first=(count,reason)->{completions.incrementAndGet();firstReason[0]=reason;failed.countDown();};
        Class<?> requestType=Class.forName("app.recipio.local.ShareMediaInbox$Request");
        Constructor<?> ctor=requestType.getDeclaredConstructor(ShareMediaInbox.class,UUID.class,ArrayList.class,ShareMediaInbox.Callback.class,long.class);ctor.setAccessible(true);
        Object request=ctor.newInstance(inbox,id,new ArrayList<Uri>(),first,SystemClock.elapsedRealtime());
        // Inject a confirmation failure without killing any process. The main PID is
        // explicitly forbidden by the exit probe; a verified gone PID permits retry.
        field(request,"pid",android.os.Process.myPid());field(request,"started",true);field(request,"prepared",true);
        Method retire=inbox.getClass().getDeclaredMethod("retire",requestType);retire.setAccessible(true);
        Throwable[] fault={null};InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
            try{Object requests=field(inbox,"requests");requests.getClass().getMethod("put",Object.class,Object.class).invoke(requests,id,request);field(inbox,"active",request);retire.invoke(inbox,request);}
            catch(Throwable error){fault[0]=error;}
        });assertNull(fault[0]);
        try{
            assertTrue(failed.await(5,TimeUnit.SECONDS));assertEquals("image_unreadable",firstReason[0]);assertEquals(1,completions.get());assertTrue(directory(id).isDirectory());
            ((ShareMediaInbox)inbox).stage(queuedId,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION,(count,reason)->{queuedReason[0]=reason;queued.countDown();});
            long until=SystemClock.elapsedRealtime()+5000;while(!new File(directory(queuedId),".share").isFile()&&SystemClock.elapsedRealtime()<until)Thread.sleep(20);
            assertTrue("Next receipt may prepare but cannot start a reader",new File(directory(queuedId),".share").isFile());
            assertEquals(1L,queued.getCount());assertFalse(readerAlive());assertSame(request,field(inbox,"active"));
            assertEquals("storage_error",releaseAwait(id));assertTrue(directory(id).isDirectory());assertEquals(1,completions.get());assertEquals(1L,queued.getCount());
            assertFalse("Generated absent PID must really be absent",processAlive(Integer.MAX_VALUE));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{field(request,"pid",Integer.MAX_VALUE);}catch(Exception error){fault[0]=error;}});assertNull(fault[0]);
            assertNull(releaseAwait(id));assertFalse(directory(id).exists());assertTrue(queued.await(5,TimeUnit.SECONDS));assertNull(queuedReason[0]);assertEquals(1,completions.get());
        }finally{
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{field(request,"pid",Integer.MAX_VALUE);}catch(Exception error){fault[0]=error;}});assertNull(fault[0]);releaseAwait(id);releaseAwait(queuedId);
        }
    }
    @Test public void generatedProviderRegistersRealTransientReadGrant()throws Exception{
        Uri png=fixture("png");
        // A readable public provider is not sufficient for the frozen Share contract:
        // it must exercise a real temporary Android read grant, not a test bypass.
        try(android.content.res.AssetFileDescriptor descriptor=context.getContentResolver().openAssetFileDescriptor(png,"r")){
            assertNotNull("Generated provider descriptor can open",descriptor);
            try(InputStream input=descriptor.createInputStream()){assertEquals(137,input.read());}
        }
        assertEquals("Readable generated provider must also register a real temporary read grant",PackageManager.PERMISSION_GRANTED,
            context.checkUriPermission(png,android.os.Process.myPid(),android.os.Process.myUid(),Intent.FLAG_GRANT_READ_URI_PERMISSION));
    }
    @Test public void jpegPngStaticWebpDeduplicateInOrderAndTransferToExistingAi()throws Exception{
        UUID id=UUID.randomUUID();Uri png=fixture("png"),jpeg=fixture("jpeg"),webp=fixture("webp");Object[] result=stage(id,Arrays.asList(png,jpeg,png,webp),Intent.FLAG_GRANT_READ_URI_PERMISSION);
        assertNull(result[1]);assertEquals(3,result[0]);assertFalse(readerAlive());assertTrue((boolean)call("lease",new Class[]{UUID.class},id));
        AiTemporaryImages ai=AiTemporaryImages.forContext(context);UUID op=UUID.randomUUID();ai.create(op);
        try{List<?> imported=(List<?>)call("transfer",new Class[]{UUID.class,AiTemporaryImages.class,UUID.class},id,ai,op);assertEquals(3,imported.size());assertEquals(200,((AiTemporaryImages.Image)imported.get(0)).width);assertEquals(100,((AiTemporaryImages.Image)imported.get(1)).width);assertEquals(200,((AiTemporaryImages.Image)imported.get(2)).width);for(Object image:imported){AiTemporaryImages.Image item=(AiTemporaryImages.Image)image;assertTrue(item.byteSize<=1024*1024);assertTrue(item.width<=2048);}assertFalse(directory(id).exists());}finally{ai.discard(op);}
    }
    @Test public void sixImagesAllowedSeventhRejectedAndMissingGrantCannotRead()throws Exception{
        List<Uri> six=new ArrayList<>();for(int i=0;i<6;i++)six.add(fixture("png?index="+i));assertNull(stage(UUID.randomUUID(),six,Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);
        six.add(fixture("png?index=6"));assertEquals("too_many_images",stage(UUID.randomUUID(),six,Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);
        assertEquals("image_unreadable",stage(UUID.randomUUID(),Collections.singletonList(fixture("png")),0)[1]);
        Uri ungranted=Uri.parse("content://"+AUTH+"/png?index=ungranted");fixtureGrant(context,ungranted,false);
        assertEquals(PackageManager.PERMISSION_DENIED,context.checkUriPermission(ungranted,android.os.Process.myPid(),android.os.Process.myUid(),Intent.FLAG_GRANT_READ_URI_PERMISSION));
        assertEquals("image_unreadable",stage(UUID.randomUUID(),Collections.singletonList(ungranted),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);
    }
    @Test public void unsafeUriUnsupportedMimeAndInvalidBytesHaveNoStagingLeak()throws Exception{
        for(Uri uri:Arrays.asList(Uri.parse("file:///fixture.png"),Uri.parse("https://generated.example/image.png"),Uri.parse("content://"+context.getPackageName()+".fileprovider/fixture.png"),Uri.parse("content://0@"+context.getPackageName()+".fileprovider/fixture.png"))){UUID id=UUID.randomUUID();assertEquals("image_invalid",stage(id,Collections.singletonList(uri),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertFalse(directory(id).exists());}
        for(String path:Arrays.asList("gif","heic","invalid","invalid-jpeg","animated-png","animated-webp","oversized","oversized-pixels","tiny","read-failure")){UUID id=UUID.randomUUID();assertNotNull(stage(id,Collections.singletonList(fixture(path)),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertFalse(directory(id).exists());}
    }
    @Test public void blockingOpenAndReadReachDeadlineRetireReaderAndAllowNextStage()throws Exception{
        for(String mode:Arrays.asList("blocked-open","blocked-read","blocked-mime")){
            UUID id=UUID.randomUUID();long before=SystemClock.elapsedRealtime();
            Uri uri=fixture(mode);
            try{
                Object reason=stage(id,Collections.singletonList(uri),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1];
                // Android's asynchronous MIME query may return null at its own earlier
                // deadline. That must still fail closed; open/read require our timeout.
                if("blocked-mime".equals(mode))assertTrue("Blocked MIME must fail closed at a platform or receipt deadline",
                    "timeout".equals(reason)||"unsupported_media".equals(reason));
                else assertEquals("timeout",reason);
                assertTrue(mode+" must retain the bounded receipt deadline",SystemClock.elapsedRealtime()-before<35000);
                assertFalse(mode+" reader must actually exit before completion",readerAlive());
                assertFalse(mode+" staging must be gone at completion",directory(id).exists());
            }finally{
                if("blocked-mime".equals(mode)){
                    Bundle payload=new Bundle();payload.putParcelable("uri",uri);
                    Bundle reply=context.getContentResolver().call(uri,"releaseBlockedMime",context.getPackageName(),payload);
                    assertNotNull("Generated blocked MIME release acknowledgment",reply);
                    assertTrue("Provider must exit its old MIME task before the next stage",reply.getBoolean("ok"));
                }
            }
            assertNull(stage(UUID.randomUUID(),Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);
        }
    }
    @Test public void cancellingBlockedReadRetiresProcessBeforeDeletingStaging()throws Exception{
        UUID id=UUID.randomUUID();ids.add(id);CountDownLatch done=new CountDownLatch(1);Class<?> callback=Class.forName("app.recipio.local.ShareMediaInbox$Callback");
        Object handler=Proxy.newProxyInstance(callback.getClassLoader(),new Class[]{callback},(p,m,a)->{if(m.getName().equals("finished"))done.countDown();return null;});
        call("stage",new Class[]{UUID.class,List.class,int.class,callback},id,Collections.singletonList(fixture("blocked-read")),Intent.FLAG_GRANT_READ_URI_PERMISSION,handler);
        // A newly spawned but not-yet-bound empty process does not prove an active
        // provider read. The receipt's source file appears only after READ opens it.
        long until=SystemClock.elapsedRealtime()+5000;boolean reading=false;
        while(!reading&&SystemClock.elapsedRealtime()<until){
            File[] parts=directory(id).listFiles((dir,name)->name.matches("[0-9a-f-]{36}\\.source\\.part"));
            reading=parts!=null&&parts.length==1&&parts[0].isFile()&&parts[0].length()==0;if(!reading)Thread.sleep(20);
        }
        assertTrue("The generated provider must be blocked inside READ before cancellation",reading);
        assertEquals("A blocked generated read must not have completed before cancellation",1L,done.getCount());
        int activePid=readerPid();assertTrue("The blocked reader PID must exist",activePid>0);release(id);
        assertTrue("Cancellation callback remains bounded to five seconds",done.await(5,TimeUnit.SECONDS));
        assertFalse("The actual blocked reader PID must exit before callback",processAlive(activePid));
        assertFalse("Cancelled staging must be removed before callback",directory(id).exists());
    }
    @Test public void failedTransferRollsBackFreshAiSessionAndRetainsShareForRetry()throws Exception{
        UUID id=UUID.randomUUID();assertNull(stage(id,Arrays.asList(fixture("png"),fixture("jpeg")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertTrue((boolean)call("lease",new Class[]{UUID.class},id));
        int[] processed={0};AiTemporaryImages ai=new AiTemporaryImages(context.getCacheDir(),System::currentTimeMillis,(file,mime)->{if(++processed[0]==2)throw new AiFailure("image_invalid");return AiImageCodec.process(file,mime);});
        UUID operation=UUID.randomUUID();ai.create(operation);assertThrows(AiFailure.class,()->call("transfer",new Class[]{UUID.class,AiTemporaryImages.class,UUID.class},id,ai,operation));
        assertFalse(new File(context.getCacheDir(),"ai-import/"+operation).exists());assertTrue(directory(id).exists());
        UUID retry=UUID.randomUUID();ai.create(retry);try{assertEquals(2,((List<?>)call("transfer",new Class[]{UUID.class,AiTemporaryImages.class,UUID.class},id,ai,retry)).size());assertFalse(directory(id).exists());}finally{ai.discard(retry);}
    }
    @Test public void wrongNonemptyAiSessionIsNeverDiscarded()throws Exception{
        UUID id=UUID.randomUUID();assertNull(stage(id,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertTrue((boolean)call("lease",new Class[]{UUID.class},id));
        AiTemporaryImages ai=AiTemporaryImages.forContext(context);UUID operation=UUID.randomUUID();ai.create(operation);
        try{Bitmap bitmap=Bitmap.createBitmap(100,100,Bitmap.Config.ARGB_8888);ByteArrayOutputStream bytes=new ByteArrayOutputStream();try{assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,bytes));}finally{bitmap.recycle();}
            AiTemporaryImages.Image existing=ai.importStream(operation,new ByteArrayInputStream(bytes.toByteArray()),"image/png");
            assertEquals("busy",assertThrows(AiFailure.class,()->call("transfer",new Class[]{UUID.class,AiTemporaryImages.class,UUID.class},id,ai,operation)).code);
            assertEquals(1,(int)ai.withPinnedImages(operation,Collections.singletonList(UUID.fromString(existing.id)),List::size));assertTrue(directory(id).exists());
        }finally{ai.discard(operation);}
    }
    @Test public void releaseAcknowledgesCleanupFailureAndCanRetryWithoutDroppingOwnership()throws Exception{
        UUID id=UUID.randomUUID();assertNull(stage(id,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertTrue((boolean)call("lease",new Class[]{UUID.class},id));
        File unexpected=new File(directory(id),"protected-fixture.txt");try(OutputStream out=new FileOutputStream(unexpected)){out.write(1);}
        assertEquals("storage_error",releaseAwait(id));assertTrue(unexpected.isFile());assertTrue(unexpected.delete());assertNull(releaseAwait(id));assertFalse(directory(id).exists());
    }
    @Test public void releaseDuringPinnedTransferWaitsForActualEraseAndReportsDelayedFailure()throws Exception{
        UUID id=UUID.randomUUID();assertNull(stage(id,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);ShareMediaInbox nativeInbox=(ShareMediaInbox)inbox;assertTrue(nativeInbox.lease(id));
        CountDownLatch processing=new CountDownLatch(1),resume=new CountDownLatch(1),released=new CountDownLatch(1);String[] reason={null};
        AiTemporaryImages ai=new AiTemporaryImages(context.getCacheDir(),System::currentTimeMillis,(file,mime)->{processing.countDown();if(!resume.await(8,TimeUnit.SECONDS))throw new AiFailure("image_invalid");return AiImageCodec.process(file,mime);});
        UUID operation=UUID.randomUUID();ai.create(operation);ExecutorService transfer=Executors.newSingleThreadExecutor();Future<?> result=transfer.submit(()->nativeInbox.transfer(id,ai,operation));
        File protectedFile=new File(directory(id),"protected-fixture.txt");
        try{
            assertTrue(processing.await(5,TimeUnit.SECONDS));try(OutputStream out=new FileOutputStream(protectedFile)){out.write(1);}
            nativeInbox.release(id,(count,error)->{reason[0]=error;released.countDown();});
            assertFalse("Release must not acknowledge cleanup while the transfer still pins bytes",released.await(300,TimeUnit.MILLISECONDS));assertTrue(protectedFile.isFile());
            resume.countDown();ExecutionException failure=assertThrows(ExecutionException.class,()->result.get(5,TimeUnit.SECONDS));assertTrue(failure.getCause() instanceof AiFailure);
            assertTrue(released.await(5,TimeUnit.SECONDS));assertEquals("storage_error",reason[0]);assertTrue(protectedFile.isFile());assertFalse(new File(context.getCacheDir(),"ai-import/"+operation).exists());
            assertTrue(protectedFile.delete());assertNull(releaseAwait(id));assertFalse(directory(id).exists());
        }finally{resume.countDown();try{result.get(5,TimeUnit.SECONDS);}catch(Exception ignored){}transfer.shutdownNow();ai.discard(operation);if(protectedFile.exists())assertTrue(protectedFile.delete());releaseAwait(id);}
    }
    private String releaseAwait(UUID id)throws Exception{
        CountDownLatch done=new CountDownLatch(1);String[] error={null};Class<?> callback=Class.forName("app.recipio.local.ShareMediaInbox$Callback");
        Object handler=Proxy.newProxyInstance(callback.getClassLoader(),new Class[]{callback},(p,m,a)->{if(m.getName().equals("finished")){error[0]=(String)a[1];done.countDown();}return null;});
        call("release",new Class[]{UUID.class,callback},id,handler);assertTrue(done.await(5,TimeUnit.SECONDS));return error[0];
    }
    @Test public void stagingAndReleasePerformNoDiskIoOnActivityMainThread()throws Exception{
        if(Build.VERSION.SDK_INT<28)return;
        List<android.os.strictmode.Violation> violations=Collections.synchronizedList(new ArrayList<>());StrictMode.ThreadPolicy[] previous={null};
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{previous[0]=StrictMode.getThreadPolicy();StrictMode.setThreadPolicy(new StrictMode.ThreadPolicy.Builder().detectDiskReads().detectDiskWrites().penaltyListener(Runnable::run,violations::add).build());});
        try{UUID id=UUID.randomUUID();assertNull(stage(id,Collections.singletonList(fixture("png")),Intent.FLAG_GRANT_READ_URI_PERMISSION)[1]);assertNull(releaseAwait(id));assertTrue("Staging and cleanup must keep filesystem IO off Activity main",violations.isEmpty());}
        finally{InstrumentationRegistry.getInstrumentation().runOnMainSync(()->StrictMode.setThreadPolicy(previous[0]));}
    }
    @Test public void readerOwnGuardianRetiresBlockedWorkWithoutParentInboxTimer()throws Exception{
        UUID id=UUID.randomUUID();ShareMediaFiles staging=new ShareMediaFiles(context.getCacheDir());staging.begin(id);Uri uri=fixture("blocked-read");
        CountDownLatch died=new CountDownLatch(1);ServiceConnection[] connection={null};Throwable[] failure={null};java.util.concurrent.atomic.AtomicBoolean returned=new java.util.concurrent.atomic.AtomicBoolean();
        Messenger receiver=new Messenger(new Handler(Looper.getMainLooper(),message->{
            if(message.what==ShareMediaReadService.HELLO){try{
                Message read=Message.obtain(null,ShareMediaReadService.READ);Bundle data=new Bundle();data.putString("id",id.toString());data.putLong("deadline",SystemClock.elapsedRealtime()+4000);data.putParcelableArrayList("uris",new ArrayList<>(Collections.singletonList(uri)));read.setData(data);read.replyTo=receiverHolder[0];new Messenger(readerHolder[0]).send(read);
            }catch(Exception error){failure[0]=error;died.countDown();}}else if(message.what==ShareMediaReadService.RESULT)returned.set(true);return true;
        }));
        receiverHolder[0]=receiver;
        connection[0]=new ServiceConnection(){
            @Override public void onServiceConnected(ComponentName component,IBinder service){try{readerHolder[0]=service;service.linkToDeath(()->{try{context.unbindService(connection[0]);}catch(IllegalArgumentException ignored){}died.countDown();},0);Message hello=Message.obtain(null,ShareMediaReadService.HELLO);hello.replyTo=receiver;new Messenger(service).send(hello);}catch(Exception error){failure[0]=error;died.countDown();}}
            @Override public void onServiceDisconnected(ComponentName component){}
        };
        try{assertTrue(context.bindService(new Intent(context,ShareMediaReadService.class),connection[0],Context.BIND_AUTO_CREATE));
            long until=SystemClock.elapsedRealtime()+3000;boolean reading=false;while(!reading&&SystemClock.elapsedRealtime()<until){File[] parts=directory(id).listFiles((dir,name)->name.endsWith(".source.part"));reading=parts!=null&&parts.length==1;if(!reading)Thread.sleep(20);}assertTrue("The provider read must actually be blocked before testing guardian",reading);assertFalse(returned.get());
            assertTrue("The child guardian must stop blocked work without a parent timer",died.await(7,TimeUnit.SECONDS));assertNull(failure[0]);assertFalse(returned.get());assertFalse(readerAlive());}
        finally{try{context.unbindService(connection[0]);}catch(IllegalArgumentException ignored){}if(died.await(5,TimeUnit.SECONDS))staging.release(id);receiverHolder[0]=null;readerHolder[0]=null;}
    }
    private final Messenger[] receiverHolder=new Messenger[1];
    private final IBinder[] readerHolder=new IBinder[1];
    public static class FixtureProvider extends ContentProvider {
        private static final class MimeBlock {final CountDownLatch resume=new CountDownLatch(1),finished=new CountDownLatch(1);}
        private volatile MimeBlock mimeBlock=new MimeBlock();
        @Override public boolean onCreate(){return true;}
        @Override public Bundle call(String method,String receiver,Bundle input){
            if(!"app.recipio.local".equals(getCallingPackage())||!"app.recipio.local".equals(receiver)||input==null)throw new SecurityException("Generated receiver only");
            try{if(Binder.getCallingUid()!=getContext().getPackageManager().getApplicationInfo(receiver,0).uid)throw new SecurityException("Generated receiver UID only");}
            catch(PackageManager.NameNotFoundException missing){throw new SecurityException("Generated receiver missing");}
            Uri uri=input.getParcelable("uri");if(uri==null||!"content".equals(uri.getScheme())||!AUTH.equals(uri.getAuthority()))throw new SecurityException("Generated provider only");
            String path=uri.getPath();boolean rootRevoke="revokeRead".equals(method)&&(path==null||path.isEmpty());
            if(!rootRevoke&&!Arrays.asList("png","jpeg","webp","gif","heic","invalid","invalid-jpeg","animated-png","animated-webp","oversized","oversized-pixels","tiny","read-failure","blocked-open","blocked-read","blocked-mime").contains(uri.getLastPathSegment()))throw new SecurityException("Generated fixture path only");
            if(uri.getFragment()!=null||uri.getEncodedQuery()!=null&&!uri.getEncodedQuery().matches("index=(?:[0-6]|ungranted)"))throw new SecurityException("Generated fixture query only");
            // Executed in the external test APK's provider process, which owns the URI.
            // Granting from the receiver process is ineffective for a publicly readable URI.
            if("grantRead".equals(method)){
                if("blocked-mime".equals(uri.getLastPathSegment()))mimeBlock=new MimeBlock();
                getContext().grantUriPermission(receiver,uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            else if("revokeRead".equals(method))getContext().revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
            else if("releaseBlockedMime".equals(method)&&"blocked-mime".equals(uri.getLastPathSegment())){
                MimeBlock block=mimeBlock;block.resume.countDown();
                try{if(!block.finished.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Generated MIME task did not exit");}
                catch(InterruptedException interrupted){Thread.currentThread().interrupt();throw new IllegalStateException("Generated MIME release interrupted",interrupted);}
            }
            else throw new IllegalArgumentException("Generated grant operation only");
            Bundle reply=new Bundle();reply.putBoolean("ok",true);return reply;
        }
        @Override public String getType(Uri uri){String mode=uri.getLastPathSegment();
            if("blocked-mime".equals(mode)){MimeBlock block=mimeBlock;
                try{if(!block.resume.await(60,TimeUnit.SECONDS))throw new IllegalStateException("Generated blocked MIME fixture was not released");}
                catch(InterruptedException interrupted){Thread.currentThread().interrupt();throw new IllegalStateException("Generated MIME fixture interrupted",interrupted);}
                finally{block.finished.countDown();}
            }
            return "jpeg".equals(mode)||"invalid-jpeg".equals(mode)?"image/jpeg":"webp".equals(mode)||"animated-webp".equals(mode)?"image/webp":"gif".equals(mode)?"image/gif":"heic".equals(mode)?"image/heic":"image/png";
        }
        @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{
            if(!"r".equals(mode))throw new FileNotFoundException("Read-only generated fixture");
            String fixture=uri.getLastPathSegment();if("blocked-open".equals(fixture)){SystemClock.sleep(60000);throw new FileNotFoundException();}if("read-failure".equals(fixture))throw new FileNotFoundException();
            try{ParcelFileDescriptor[] pipe=ParcelFileDescriptor.createPipe();new Thread(()->{
                try(OutputStream out=new ParcelFileDescriptor.AutoCloseOutputStream(pipe[1])){
                    if("blocked-read".equals(fixture)){SystemClock.sleep(60000);return;}
                    if("invalid".equals(fixture)||"invalid-jpeg".equals(fixture)){out.write(new byte[]{1,2,3});return;}
                    if("animated-png".equals(fixture)){out.write(new byte[]{(byte)137,80,78,71,13,10,26,10});for(String type:Arrays.asList("acTL","IEND")){out.write(new byte[4]);out.write(type.getBytes(java.nio.charset.StandardCharsets.US_ASCII));out.write(new byte[4]);}return;}
                    if("animated-webp".equals(fixture)){out.write(new byte[]{'R','I','F','F',12,0,0,0,'W','E','B','P','A','N','I','M',0,0,0,0});return;}
                    if("oversized".equals(fixture)){byte[] block=new byte[8192];for(int i=0;i<1921;i++)out.write(block);return;}
                    Bitmap bitmap=Bitmap.createBitmap("tiny".equals(fixture)?10:"jpeg".equals(fixture)?100:200,100,Bitmap.Config.ARGB_8888);
                    if("oversized-pixels".equals(fixture)){try{ByteArrayOutputStream bytes=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.PNG,100,bytes);byte[] png=bytes.toByteArray();java.nio.ByteBuffer.wrap(png,16,8).putInt(8001).putInt(4000);java.util.zip.CRC32 crc=new java.util.zip.CRC32();crc.update(png,12,17);java.nio.ByteBuffer.wrap(png,29,4).putInt((int)crc.getValue());out.write(png);}finally{bitmap.recycle();}return;}
                    try{bitmap.eraseColor(Color.GREEN);bitmap.compress("jpeg".equals(fixture)?Bitmap.CompressFormat.JPEG:"webp".equals(fixture)?Bitmap.CompressFormat.WEBP_LOSSLESS:Bitmap.CompressFormat.PNG,100,out);}finally{bitmap.recycle();}
                }catch(IOException ignored){}
            },"generated-share-fixture").start();return pipe[0];}catch(IOException ignored){throw new FileNotFoundException();}
        }
        @Override public Cursor query(Uri u,String[] p,String s,String[] a,String sort){return null;}
        @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException("Read-only generated fixture");}
        @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException("Read-only generated fixture");}
        @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException("Read-only generated fixture");}
    }
}
