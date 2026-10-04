package app.recipio.local;
import java.util.function.LongSupplier;
import java.util.*;
final class AiRequestLifecycle {
    interface Work<T>{T run()throws Exception;}
    static final class Token {
        final String id;private final LongSupplier clock;private final long deadline;
        private String cancelled;private boolean finished;private final List<Runnable> cancelHooks=new ArrayList<>(),finishHooks=new ArrayList<>();
        Token(String id,LongSupplier clock,long overall){this.id=id;this.clock=clock;deadline=clock.getAsLong()+overall;}
        void check()throws AiFailure {if(clock.getAsLong()>=deadline)cancel("timeout");synchronized(this){if(cancelled!=null)throw new AiFailure(cancelled);}}
        long remainingMillis()throws AiFailure {check();return Math.max(1,deadline-clock.getAsLong());}
        void cancel(String reason){List<Runnable> hooks;synchronized(this){if(cancelled!=null||finished)return;cancelled=reason;hooks=new ArrayList<>(cancelHooks);cancelHooks.clear();}for(Runnable hook:hooks)hook.run();}
        void onCancel(Runnable work){boolean run;synchronized(this){run=cancelled!=null;if(!run&&!finished)cancelHooks.add(work);}if(run)work.run();}
        void whenFinished(Runnable work){boolean run;synchronized(this){run=finished;if(!run)finishHooks.add(work);}if(run)work.run();}
        private synchronized Completion seal(){
            if(cancelled==null&&clock.getAsLong()>=deadline)cancelled="timeout";
            finished=true;cancelHooks.clear();Completion result=new Completion(cancelled,new ArrayList<>(finishHooks));finishHooks.clear();return result;
        }
    }
    private static final class Completion {
        final String code;final List<Runnable> hooks;
        Completion(String code,List<Runnable> hooks){this.code=code;this.hooks=hooks;}
    }
    private final LongSupplier clock;private final long overall;private Token active;
    AiRequestLifecycle(){this(()->System.nanoTime()/1000000L,90000);}
    AiRequestLifecycle(LongSupplier clock,long overall){this.clock=clock;this.overall=overall;}
    static boolean uuid(String id){if(id==null)return false;try{return UUID.fromString(id).toString().equals(id);}catch(IllegalArgumentException e){return false;}}
    synchronized Token tryBeginRequest(String id)throws AiFailure {
        if(!uuid(id))throw new AiFailure("input_invalid");if(active!=null)throw new AiFailure("busy");active=new Token(id,clock,overall);return active;
    }
    String finishRequest(String id){Completion result;synchronized(this){if(active==null||!active.id.equals(id))return null;result=active.seal();active=null;}for(Runnable hook:result.hooks)hook.run();return result.code;}
    void cancel(String id){Token token;synchronized(this){token=active!=null&&active.id.equals(id)?active:null;}if(token!=null)token.cancel("cancelled");}
    synchronized <T>T withSecretMutation(Work<T> work)throws Exception {if(active!=null)throw new AiFailure("busy");return work.run();}
}
