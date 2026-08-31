import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ImportProgress } from "@/features/recipe-imports/components/import-progress";

describe("ImportProgress", () => {
  it("shows a concise extracting state", () => {
    render(<ImportProgress importId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" initialStatus="extracting" initialErrorCode={null} />);
    expect(screen.getByText("正在整理食材和步骤…")).toBeInTheDocument();
  });

  it("offers screenshot and text fallbacks after a failure", () => {
    render(<ImportProgress importId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" initialStatus="failed" initialErrorCode="source_unreadable" />);
    expect(screen.getByRole("link", { name: "上传截图" })).toHaveAttribute("href", "/recipes/import?mode=images");
    expect(screen.getByRole("link", { name: "粘贴文案" })).toHaveAttribute("href", "/recipes/import?mode=text");
  });

  it("explains the failure reason and retries only when requested", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true, status: "review" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ImportProgress importId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" initialStatus="failed" initialErrorCode="ai_unauthorized" />);

    expect(screen.getByText("AI 服务密钥无效，请检查配置后重试。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "重新导入" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/recipe-imports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/process",
      { method: "POST" },
    ));
    vi.unstubAllGlobals();
  });
});
