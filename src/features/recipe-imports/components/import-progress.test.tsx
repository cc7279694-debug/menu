import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { getRecipeImportFailureInfo, ImportProgress } from "@/features/recipe-imports/components/import-progress";

describe("ImportProgress", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["unsafe_url", "该链接不符合安全访问要求", false],
    ["source_unreadable", "页面内容无法公开读取", true],
    ["source_too_large", "页面内容过大", false],
    ["ai_rate_limited", "AI 请求过于频繁", true],
    ["ai_unauthorized", "AI 服务配置不可用", true],
    ["ai_unavailable", "AI 服务暂时不可用", true],
    ["invalid_ai_output", "AI 返回内容不完整", true],
    ["processing_failed", "导入处理失败", true],
  ])("maps %s to actionable copy", (code, text, retryable) => {
    expect(getRecipeImportFailureInfo(code)).toMatchObject({ retryable });
    expect(getRecipeImportFailureInfo(code).description).toContain(text);
  });

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

    expect(screen.getByText("AI 服务配置不可用，请检查密钥后重试。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "重新尝试" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/recipe-imports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/process",
      { method: "POST" },
    ));
  });

  it.each(["unsafe_url", "source_too_large"])("does not offer retry for non-retryable error %s", (errorCode) => {
    render(<ImportProgress importId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" initialStatus="failed" initialErrorCode={errorCode} />);
    expect(screen.queryByRole("button", { name: "重新尝试" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "粘贴文案" })).toHaveAttribute("href", "/recipes/import?mode=text");
    expect(screen.getByRole("link", { name: "上传截图" })).toHaveAttribute("href", "/recipes/import?mode=images");
    expect(screen.getByRole("link", { name: "重新选择来源" })).toHaveAttribute("href", "/recipes/import");
  });
});
