import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { V2Theme } from "./appearance";

const native = vi.hoisted(() => ({ platform: "android", readFile: vi.fn(), writeFile: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => native.platform } }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" }, Encoding: { UTF8: "utf8" },
  Filesystem: { readFile: native.readFile, writeFile: native.writeFile },
}));
import { useV2ThemePreference } from "./theme-preference";
import { SettingsScreen } from "./settings-screen";
import { fakeAi } from "../ai/service.test-support";

const key = "recipio.ui-v2.theme.v1";
const file = "recipio-ui-v2-theme-v1.txt";
const missing = { code: "OS-PLUG-FILE-0008" };
let durable: string | null;
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  localStorage.clear(); native.platform = "android"; durable = null;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  native.readFile.mockReset().mockImplementation(async () => {
    if (durable === null) throw missing;
    return { data: durable };
  });
  native.writeFile.mockReset().mockImplementation(async ({ data }: { data: string }) => {
    durable = data; return { uri: "file:///owned-theme-preference" };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it("Android confirms a selected theme only after its fixed Data-file write ACK", async () => {
  const ack = deferred<void>();
  native.writeFile.mockImplementation(async ({ data }: { data: string }) => { await ack.promise; durable = data; return { uri: "file:///owned-theme-preference" }; });
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("pure-glass"));
  expect(hook.result.current.theme).toBe("warm-ivory");
  expect(localStorage.getItem(key)).toBeNull();
  await act(async () => { ack.resolve(undefined); });
  await waitFor(() => expect(hook.result.current.theme).toBe("pure-glass"));
  expect(durable).toBe("pure-glass");
  expect(native.writeFile).toHaveBeenCalledWith({ directory: "DATA", path: file, data: "pure-glass", encoding: "utf8" });
  expect(localStorage.getItem(key)).toBe("pure-glass");
});

it("Android cold mount recovers the acknowledged file without any WebView preference", async () => {
  durable = "soft-sage";
  const hook = renderHook(useV2ThemePreference);
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(native.readFile).toHaveBeenCalledWith({ directory: "DATA", path: file, encoding: "utf8" });
});

it("the validated native file wins over an older legal WebView cache", async () => {
  durable = "soft-sage"; localStorage.setItem(key, "pure-glass");
  const hook = renderHook(useV2ThemePreference);
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(localStorage.getItem(key)).toBe("soft-sage");
});

it.each(["pure-glass", "soft-sage"])("a missing native file retains legal legacy %s without a false failure", async cached => {
  localStorage.setItem(key, cached); const hook = renderHook(useV2ThemePreference);
  await act(async () => {});
  expect(hook.result.current.theme).toBe(cached); expect(hook.result.current.warning).toBeUndefined();
  expect(native.writeFile).not.toHaveBeenCalled();
});

it.each(["../private", '{"theme":"pure-glass"}', "pure-glass\n", "", null, 42])("invalid existing native value %s falls back Warm instead of an older cache", async data => {
  localStorage.setItem(key, "soft-sage"); native.readFile.mockResolvedValue({ data });
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  expect(hook.result.current.theme).toBe("warm-ivory"); expect(localStorage.getItem(key)).toBe("warm-ivory");
  expect(native.writeFile).not.toHaveBeenCalled();
});

it("missing or invalid cache safely starts Warm when no native file exists", async () => {
  localStorage.setItem(key, "bad-theme"); const hook = renderHook(useV2ThemePreference); await act(async () => {});
  expect(hook.result.current.theme).toBe("warm-ivory"); expect(hook.result.current.warning).toBeUndefined();
});

it("a native read failure keeps the library usable and reports that persistence could not be read", async () => {
  native.readFile.mockRejectedValue({ code: "OS-PLUG-FILE-0007" });
  const hook = renderHook(useV2ThemePreference);
  await waitFor(() => expect(hook.result.current.warning).toBeTruthy());
  expect(hook.result.current.theme).toBe("warm-ivory");
});

it("a late cold read cannot replace a newer user selection or its write ACK", async () => {
  const read = deferred<{ data: string }>(), ack = deferred<void>();
  native.readFile.mockReturnValue(read.promise); native.writeFile.mockImplementation(async ({ data }: { data: string }) => { await ack.promise; durable = data; return { uri: "file:///owned-theme-preference" }; });
  const hook = renderHook(useV2ThemePreference);
  act(() => hook.result.current.changeTheme("soft-sage"));
  await act(async () => { read.resolve({ data: "pure-glass" }); });
  expect(hook.result.current.theme).toBe("warm-ivory");
  await act(async () => { ack.resolve(undefined); });
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(localStorage.getItem(key)).toBe("soft-sage");
});

it("rapid choices write serially and an older ACK cannot confirm the superseded theme", async () => {
  const first = deferred<void>(), second = deferred<void>();
  native.writeFile.mockImplementation(async ({ data }: { data: string }) => {
    await (data === "pure-glass" ? first.promise : second.promise); durable = data; return { uri: "file:///owned-theme-preference" };
  });
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("pure-glass"));
  await waitFor(() => expect(native.writeFile).toHaveBeenCalledTimes(1));
  act(() => hook.result.current.changeTheme("soft-sage"));
  await act(async () => {}); expect(native.writeFile).toHaveBeenCalledTimes(1);
  await act(async () => { first.resolve(undefined); });
  await waitFor(() => expect(native.writeFile).toHaveBeenCalledTimes(2));
  expect(hook.result.current.theme).toBe("warm-ivory"); expect(localStorage.getItem(key)).toBeNull();
  await act(async () => { second.resolve(undefined); });
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(durable).toBe("soft-sage"); expect(hook.result.current.warning).toBeUndefined();
});

it("a failed native write retains the confirmed theme and a later successful choice clears its warning", async () => {
  native.writeFile.mockRejectedValueOnce(new Error("full"));
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("pure-glass"));
  await waitFor(() => expect(hook.result.current.warning).toBeTruthy());
  expect(hook.result.current.theme).toBe("warm-ivory"); expect(localStorage.getItem(key)).toBe("warm-ivory");
  expect(durable).toBeNull(); // UI cache is the fallback enum, not a successful Native write.
  act(() => hook.result.current.changeTheme("soft-sage"));
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(hook.result.current.warning).toBeUndefined(); expect(durable).toBe("soft-sage");
});

it("a latest write failure converges UI and cache to the preceding successful Native ACK", async () => {
  const first = deferred<void>();
  native.writeFile.mockImplementation(async ({ data }: { data: string }) => {
    if (data === "soft-sage") throw new Error("latest write failed");
    await first.promise; durable = data; return { uri: "file:///owned-theme-preference" };
  });
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("pure-glass")); await waitFor(() => expect(native.writeFile).toHaveBeenCalledTimes(1));
  act(() => hook.result.current.changeTheme("soft-sage")); await act(async () => { first.resolve(undefined); });
  await waitFor(() => expect(hook.result.current.warning).toBeTruthy());
  expect(durable).toBe("pure-glass"); expect(hook.result.current.theme).toBe("pure-glass");
  expect(localStorage.getItem(key)).toBe("pure-glass"); expect(hook.result.current.warning).toMatch(/上次/);
});

it("a choice waits for the initial Native read and a failed write retains that actual saved baseline", async () => {
  const read = deferred<{ data: string }>(); native.readFile.mockReturnValue(read.promise);
  native.writeFile.mockRejectedValue(new Error("latest write failed"));
  const hook = renderHook(useV2ThemePreference); act(() => hook.result.current.changeTheme("soft-sage"));
  await act(async () => {}); expect(native.writeFile).not.toHaveBeenCalled();
  durable = "pure-glass"; await act(async () => { read.resolve({ data: "pure-glass" }); });
  await waitFor(() => expect(hook.result.current.warning).toBeTruthy());
  expect(hook.result.current.theme).toBe("pure-glass"); expect(localStorage.getItem(key)).toBe("pure-glass");
});

it("an older write failure cannot overwrite a newer successful selection with a stale error", async () => {
  const first = deferred<void>();
  native.writeFile.mockImplementationOnce(async () => { await first.promise; return { uri: "file:///owned-theme-preference" }; });
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("pure-glass"));
  await waitFor(() => expect(native.writeFile).toHaveBeenCalledTimes(1));
  act(() => hook.result.current.changeTheme("soft-sage")); await act(async () => { first.reject(new Error("old write failed")); });
  await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  expect(hook.result.current.warning).toBeUndefined(); expect(durable).toBe("soft-sage");
});

it("an unmounted owner ignores late reads and write completions without rewriting its UI cache", async () => {
  const read = deferred<{ data: string }>(), ack = deferred<void>();
  native.readFile.mockReturnValue(read.promise); native.writeFile.mockImplementation(async ({ data }: { data: string }) => { await ack.promise; durable = data; return { uri: "file:///owned-theme-preference" }; });
  const hook = renderHook(useV2ThemePreference); act(() => hook.result.current.changeTheme("pure-glass")); hook.unmount();
  await act(async () => { read.resolve({ data: "soft-sage" }); ack.resolve(undefined); });
  expect(localStorage.getItem(key)).toBeNull(); expect(hook.result.current.theme).toBe("warm-ivory");
});

it("a cold read that completes after unmount cannot update the legacy cache", async () => {
  const read = deferred<{ data: string }>(); native.readFile.mockReturnValue(read.promise);
  const hook = renderHook(useV2ThemePreference); hook.unmount();
  await act(async () => { read.resolve({ data: "soft-sage" }); });
  expect(localStorage.getItem(key)).toBeNull();
});

it("a failed initial read settles before a newer write ACK, which clears its stale warning", async () => {
  const read = deferred<{ data: string }>(); native.readFile.mockReturnValue(read.promise);
  const hook = renderHook(useV2ThemePreference); act(() => hook.result.current.changeTheme("pure-glass"));
  await act(async () => { read.reject({ code: "OS-PLUG-FILE-0007" }); });
  await waitFor(() => expect(hook.result.current.theme).toBe("pure-glass"));
  expect(hook.result.current.warning).toBeUndefined(); expect(durable).toBe("pure-glass");
});

it("unexpected runtime selection values never reach native storage", async () => {
  const hook = renderHook(useV2ThemePreference); await act(async () => {});
  act(() => hook.result.current.changeTheme("../../invalid" as V2Theme)); await act(async () => {});
  expect(hook.result.current.theme).toBe("warm-ivory"); expect(native.writeFile).not.toHaveBeenCalled();
});

it("a blocked optional WebView cache cannot undo a successful native write ACK", async () => {
  durable = "soft-sage";
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const hook = renderHook(useV2ThemePreference); await waitFor(() => expect(hook.result.current.theme).toBe("soft-sage"));
  act(() => hook.result.current.changeTheme("pure-glass")); await waitFor(() => expect(durable).toBe("pure-glass"));
  expect(hook.result.current.theme).toBe("pure-glass"); expect(hook.result.current.warning).toBeUndefined();
});

it("Web keeps synchronous localStorage hydration/switching without using native files", () => {
  native.platform = "web"; localStorage.setItem(key, "pure-glass"); const hook = renderHook(useV2ThemePreference);
  expect(hook.result.current.theme).toBe("pure-glass"); act(() => hook.result.current.changeTheme("soft-sage"));
  expect(hook.result.current.theme).toBe("soft-sage"); expect(localStorage.getItem(key)).toBe("soft-sage");
  expect(native.readFile).not.toHaveBeenCalled(); expect(native.writeFile).not.toHaveBeenCalled();
});

it("Web storage failure still allows in-memory appearance and supplies a warning", () => {
  native.platform = "web"; vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  const hook = renderHook(useV2ThemePreference); act(() => hook.result.current.changeTheme("pure-glass"));
  expect(hook.result.current.theme).toBe("pure-glass"); expect(hook.result.current.warning).toBeTruthy();
});

it("Settings visibly reports persistence failure while its existing data controls remain usable", async () => {
  native.writeFile.mockRejectedValue(new Error("full")); const keys = fakeAi().keys;
  function Settings() {
    const state = useV2ThemePreference();
    return <SettingsScreen theme={state.theme} onTheme={state.changeTheme} persistenceWarning={state.warning} keys={keys} onKeyChanged={() => {}} />;
  }
  render(<Settings />); fireEvent.click(screen.getByRole("radio", { name: /Pure Glass/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/外观/);
  expect(screen.getByRole("radio", { name: /Warm Ivory/ })).toBeChecked();
  expect(screen.getByRole("heading", { name: "数据与备份", level: 2 })).toBeInTheDocument();
});

it("clicking the still-confirmed radio during a pending write preserves the user's latest choice", async () => {
  const first = deferred<void>(), keys = fakeAi().keys;
  native.writeFile.mockImplementation(async ({ data }: { data: string }) => {
    if (data === "pure-glass") await first.promise;
    durable = data; return { uri: "file:///owned-theme-preference" };
  });
  function Settings() {
    const state = useV2ThemePreference();
    return <SettingsScreen theme={state.theme} onTheme={state.changeTheme} persistenceWarning={state.warning} keys={keys} onKeyChanged={() => {}} />;
  }
  render(<Settings />); fireEvent.click(screen.getByRole("radio", { name: /Pure Glass/ }));
  await waitFor(() => expect(native.writeFile).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("radio", { name: /Warm Ivory/ })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: /Warm Ivory/ }));
  await act(async () => { first.resolve(undefined); });
  await waitFor(() => expect(durable).toBe("warm-ivory"));
  expect(screen.getByRole("radio", { name: /Warm Ivory/ })).toBeChecked();
});
