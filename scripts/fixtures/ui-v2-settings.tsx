// Browser QA only; never imported by native/main or included in an APK.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SettingsScreen } from "../../src/native/ui-v2/settings-screen";
import { V2AppearanceProvider, type V2Theme } from "../../src/native/ui-v2/appearance";
import { goldenSource, goldenAssets, manifestFor } from "../../src/native/backup/test-fixtures";
import { toPortableData } from "../../src/native/backup/references";
import type { BackupState } from "../../src/native/backup/service";

export function renderFixture(target: HTMLElement) {
  const calls = { keyWrites: 0, exports: 0, imports: 0, restores: 0 };
  const state: BackupState = { phase: "preview", mode: "restore", currentCount: 7,
    manifest: manifestFor(toPortableData(goldenSource(), goldenAssets())) };
  const backup = { getState: () => state, subscribe: () => () => {},
    export: async () => { calls.exports++; }, inspectRestore: async () => { calls.imports++; },
    confirmReplace: async () => { calls.restores++; }, cancel: async () => {} };
  const keys = { hasAiKey: async () => ({ configured: true }),
    saveAiKey: async () => { calls.keyWrites++; return { configured: true, cancelled: true }; },
    deleteAiKey: async () => { calls.keyWrites++; } };
  function Fixture() {
    const [theme, setTheme] = useState<V2Theme>("warm-ivory");
    return <V2AppearanceProvider theme={theme} solid={false}><div className="recipio-ui-v2 v2-production" data-v2-theme={theme}>
      <SettingsScreen theme={theme} onTheme={setTheme} backup={backup} keys={keys} onKeyChanged={() => {}} />
    </div></V2AppearanceProvider>;
  }
  createRoot(target).render(<Fixture />);
  return calls;
}
