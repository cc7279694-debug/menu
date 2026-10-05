package app.recipio.local;

/** Stable category only. Remote input, addresses and exception details never enter the bridge. */
final class WebImportFailure extends Exception {
    final String code;
    WebImportFailure(String code) { super(code); this.code = code; }
}
