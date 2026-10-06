import "fake-indexeddb/auto";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { ShareTargetController } from "./controller";
import type { ShareReply } from "./contract";

const load = vi.hoisted(() => {
  let release!: () => void, enter!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { enter = resolve; });
  return { promise, release, entered, enter };
});
// Hold only the external Native port module load; actual app/service/controller run.
vi.mock("../link-import/native-bridge", async () => { load.enter(); await load.promise; return { createWebImportPort: () => ({ read: vi.fn(), cancel: vi.fn() }) }; });
afterEach(__resetLocalDatabaseForTests);
it("unmount during lazy entry leaves the consumed receipt available for the replacement owner", async () => {
  // Finish unrelated module compilation first, then prove the external port load is
  // actually blocked before unmounting. No guessed microtask count or timing delay.
  await import("../link-import/service");
  const shared = { status: "url" as const, id: crypto.randomUUID(), url: "https://generated.example/r", replaced: false };
  const queue: ShareReply[] = [shared];
  const share = new ShareTargetController({ consume: async () => queue.shift() ?? { status: "empty" }, listen: async () => () => {},release:async()=>{},transferImages:async()=>[] });
  const view = render(<LibraryApp store={new PreviewRecipeLibrary()} share={share} />);
  await screen.findByLabelText("待处理分享");
  await act(async () => { await load.entered; });
  view.unmount(); await act(async () => { load.release(); });
  await waitFor(() => expect(share.snapshot()).toMatchObject({ pending: { id: shared.id }, deferred: true }));
});
