import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clearOfflineData = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/features/offline/database", () => ({ clearOfflineData }));
vi.mock("@/features/auth/actions", () => ({ signOut }));

import { OfflineSettingsControls } from "@/features/offline/components/offline-settings-controls";

describe("OfflineSettingsControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOfflineData.mockResolvedValue(undefined);
    signOut.mockResolvedValue(undefined);
  });

  it("clears local offline data without signing out", async () => {
    render(<OfflineSettingsControls />);
    fireEvent.click(screen.getByRole("button", { name: "清除离线数据" }));

    await waitFor(() => expect(clearOfflineData).toHaveBeenCalledTimes(1));
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("离线数据已清除");
  });

  it("clears local data before invoking sign out", async () => {
    render(<OfflineSettingsControls />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(clearOfflineData.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });

  it("keeps local clear completed and reports a sign-out error", async () => {
    signOut.mockRejectedValue(new Error("network unavailable"));
    render(<OfflineSettingsControls />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("退出登录失败"));
    expect(clearOfflineData).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate actions while pending", async () => {
    let resolveClear!: () => void;
    clearOfflineData.mockImplementation(() => new Promise<void>((resolve) => { resolveClear = resolve; }));
    render(<OfflineSettingsControls />);
    const button = screen.getByRole("button", { name: "清除离线数据" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(clearOfflineData).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    resolveClear();
  });
});
