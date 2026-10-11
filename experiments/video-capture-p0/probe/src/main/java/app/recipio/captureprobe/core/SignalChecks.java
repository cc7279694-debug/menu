package app.recipio.captureprobe.core;

/** Signal diagnostics are not proof of target content or platform support. */
public final class SignalChecks {
    private SignalChecks() { }
    public static boolean mostlyBlack(int[] argb) {
        if (argb.length == 0) return true;
        int dark = 0;
        for (int color : argb) if (((color >> 16) & 255) <= 8 && ((color >> 8) & 255) <= 8 && (color & 255) <= 8) dark++;
        return dark >= Math.ceil(argb.length * .98);
    }
    public static int peakPcm16(byte[] pcm, int count) {
        if (count < 0 || count > pcm.length || count % 2 != 0) throw new IllegalArgumentException("PCM16 bounds");
        int peak = 0;
        for (int i = 0; i < count; i += 2) {
            int value = (short) ((pcm[i] & 255) | (pcm[i + 1] << 8));
            peak = Math.max(peak, Math.abs(value));
        }
        return peak;
    }
    public static String classification(boolean tested, boolean videoConfirmed, boolean audioConfirmed) {
        if (!tested) return "NOT_TESTED";
        if (videoConfirmed && audioConfirmed) return "FULL_CAPTURE";
        if (videoConfirmed) return "VIDEO_ONLY";
        return audioConfirmed ? "AUDIO_ONLY" : "CAPTURE_BLOCKED";
    }
    public static String classificationForSession(long current, long reviewedSession, boolean captured,
                                                  boolean played, boolean reviewed, boolean video, boolean audio) {
        return classification(current == reviewedSession && captured && played && reviewed, video, audio);
    }
}
