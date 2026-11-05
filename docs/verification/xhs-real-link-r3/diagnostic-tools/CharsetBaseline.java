package app.recipio.local;
/** Offline-only regression fixture for a native-charset stdout JSON protocol. */
public final class CharsetBaseline {
    public static void main(String[] args){System.out.println("{\"text\":\"合成中文🍚菜谱，椰子🥥2个。\"}");}
}
