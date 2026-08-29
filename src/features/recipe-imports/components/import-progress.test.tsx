import { render, screen } from "@testing-library/react";
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
});
