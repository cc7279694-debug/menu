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

    expect(await screen.findByRole("status")).toHaveTextContent(
      "请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。",
    );
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
