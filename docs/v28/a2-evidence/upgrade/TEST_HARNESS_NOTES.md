# A2 observed environment and test-harness limits

These attempts are retained to avoid presenting a clean-room first-try PASS.
No frozen product fix, test suppression, uninstall, data-clear or key operation.

1. First dedicated AVD boot was not ready in the initial25s/40s windows.
   Later boot_completed=1/API36/expected AVD were checked. System ANRs preceded
   v27 installation; one actual System UI Wait action recovered the dialog.
   Subsequent navigation/exports/install/UI completed; final event buffer
   contained no additional ANR/crash entries. Original logs/screenshot retained.
2. An assertion expecting Android UIAutomator `checked=true` for Soft Sage
   failed: all three radio nodes reported false, despite the actual screenshot
   showing Soft Sage selected. The assertion is **not PASS**. Cold-start and
   post-upgrade actual screenshots were visually inspected, and their radio/
   background pixel regions compared using Windows System.Drawing. Theme is
   outside Backup v2; no raw theme-file identity claim or TalkBack inference.
3. UIAutomator sometimes returned a previous WebView tree or only its root
   during cold start/dialog transitions. `snapshot` waits on bounded expected
   states, but one cached edit title matched while the actual image was still
   a splash screen. That frame was rejected; later a home-only state and actual
   ready-home screenshot confirmed edited-title persistence after cold start.
4. Clearing search refocused its field and reopened the IME. A subsequent
   coordinate intended for the recipe card hit the keyboard area; expected
   detail assertion timed out. Back hid the IME, fresh bounds were checked and
   the correct card opened. No business save occurred in this failed attempt.
5. After Focus Back, an expected-history-text assertion timed out because the
   accessibility tree was root-only. [Actual screenshot](v28-after-focus-back-observed.png)
   shows the detail/history section with Cooking count1 and shared photo;
   [root-only XML](v28-after-focus-back-observed.xml) is kept. The visible history
   button then opened real cooking/change history successfully. No app crash
   was found; these observations do not establish accessibility correctness.
6. A local optional pixel-comparison script initially lacked Pillow. No package
   was installed; the actual comparison used existing Windows System.Drawing.

Scope remains controlled emulator UI/data-upgrade validation. Physical OEM,
TalkBack/performance and full historical IME/Guided suites are NOT_RUN.
