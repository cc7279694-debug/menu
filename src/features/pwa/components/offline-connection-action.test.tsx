import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { OfflineConnectionAction } from "./offline-connection-action";

describe("OfflineConnectionAction", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
  });

  it("waits for the network before allowing a return to the online page", async () => {
    render(<OfflineConnectionAction href="/recipes" />);

    expect(await screen.findByRole("button", { name: "等待网络恢复" })).toBeDisabled();

    window.dispatchEvent(new Event("online"));

    expect(await screen.findByRole("link", { name: "返回在线页面" })).toHaveAttribute(
      "href",
      "/recipes",
    );
    expect(screen.getByRole("status")).toHaveTextContent("网络已恢复");
  });

  it("does not navigate automatically when the network comes back", async () => {
    render(<OfflineConnectionAction href="/recipes" />);

    window.dispatchEvent(new Event("online"));
    expect(await screen.findByRole("link", { name: "返回在线页面" })).toBeInTheDocument();
  });
});
