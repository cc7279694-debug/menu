package app.recipio.captureprobe.core;
import java.util.*;
public final class FrameSelection {
    private final List<Integer> chosen=new ArrayList<>();
    public synchronized boolean add(int id){if(id<0||id>=120||chosen.size()>=6||chosen.contains(id))return false;chosen.add(id);return true;}
    public synchronized void remove(int id){chosen.remove(Integer.valueOf(id));}
    public synchronized void move(int id,int direction){int i=chosen.indexOf(id),j=i+direction;if(i>=0 && (direction==-1||direction==1) && j>=0 && j<chosen.size())Collections.swap(chosen,i,j);}
    public synchronized boolean replace(int id,int replacement){int i=chosen.indexOf(id);if(i<0||replacement<0||replacement>=120||chosen.contains(replacement))return false;chosen.set(i,replacement);return true;}
    public synchronized boolean shareable(){return !chosen.isEmpty()&&chosen.size()<=6;}
    public synchronized List<Integer> ids(){return new ArrayList<>(chosen);}
    public synchronized void clear(){chosen.clear();}
}
