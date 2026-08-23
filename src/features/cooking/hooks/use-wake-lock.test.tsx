import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWakeLock } from "./use-wake-lock";

type ReleaseListener = () => void;

function createSentinel() {
  const listeners = new Set<ReleaseListener>();
  return {
    released: false,
    addEventListener: vi.fn((_event: "release", listener: ReleaseListener) => listeners.add(listener)),
    removeEventListener: vi.fn((_event: "release", listener: ReleaseListener) => listeners.delete(listener)),
    release: vi.fn(async () => undefined),
    emitRelease() { listeners.forEach((listener) => listener()); },
  };
}

function setWakeLock(value: unknown) {
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value });
}

beforeEach(() => {
  setWakeLock(undefined);
});

afterEach(() => {
  setWakeLock(undefined);
});

describe("useWakeLock", () => {
  it("reports unsupported without throwing", async () => {
    const { result } = renderHook(() => useWakeLock(true));

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(result.current.message).not.toBeNull();
  });

  it("requests, releases on disable and reacquires when the document becomes visible", async () => {
    const first = createSentinel();
    const second = createSentinel();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    setWakeLock({ request });

    const { result, rerender } = renderHook(({ enabled }) => useWakeLock(enabled), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current.status).toBe("active"));
    expect(request).toHaveBeenCalledWith("screen");

    act(() => first.emitRelease());
    expect(result.current.status).toBe("released");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    rerender({ enabled: false });
    await waitFor(() => expect(second.release).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("released");
  });

  it("reports request errors without throwing", async () => {
    setWakeLock({ request: vi.fn().mockRejectedValue(new Error("denied")) });

    const { result } = renderHook(() => useWakeLock(true));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.message).not.toBeNull();
  });

  it("releases an active lock when unmounted", async () => {
    const sentinel = createSentinel();
    setWakeLock({ request: vi.fn().mockResolvedValue(sentinel) });
    const { result, unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => expect(result.current.status).toBe("active"));
    unmount();

    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });
});
