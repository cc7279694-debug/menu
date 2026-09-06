import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstallAppButton } from "./install-app-button";

type BeforeInstallPromptEventMock = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function createInstallPrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt") as BeforeInstallPromptEventMock;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe("InstallAppButton", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the browser install prompt when available", async () => {
    const promptEvent = createInstallPrompt();
    const user = userEvent.setup();
    render(<InstallAppButton />);
    window.dispatchEvent(promptEvent);

    await user.click(await screen.findByRole("button", { name: "下载应用" }));

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("应用已准备安装");
  });

  it("explains how to install when the browser has no native prompt", async () => {
    const user = userEvent.setup();
    render(<InstallAppButton />);

    await user.click(screen.getByRole("button", { name: "下载应用" }));

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("请查看安装步骤。");
    expect(screen.getByRole("dialog", { name: "安装谱序" })).toBeInTheDocument();
  });

  it("opens Safari instructions for an iOS browser without a native prompt", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
    });
    const user = userEvent.setup();
    render(<InstallAppButton />);

    await user.click(screen.getByRole("button", { name: "下载应用" }));

    expect(await screen.findByRole("dialog", { name: "安装谱序" })).toBeInTheDocument();
    expect(screen.getByText("点击 Safari 底部或顶部的分享按钮。")).toBeInTheDocument();
  });

  it("marks the app installed after the browser emits appinstalled", async () => {
    render(<InstallAppButton />);
    window.dispatchEvent(new Event("appinstalled"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "应用已安装" })).toBeDisabled();
    });
  });

  it("marks the app as installed when it is already running standalone", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    render(<InstallAppButton />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "应用已安装" })).toBeDisabled();
    });
  });
});
