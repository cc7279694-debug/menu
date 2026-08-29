import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), attach: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/recipe-imports/actions", () => ({ createRecipeImportAction: mocks.create, attachRecipeImportImagesAction: mocks.attach }));
vi.mock("@/features/recipe-imports/upload-import-images", () => ({ uploadImportImages: vi.fn() }));

import { ImportForm } from "@/features/recipe-imports/components/import-form";

describe("ImportForm", () => {
  it("offers link, image, and text modes and validates short text before submit", () => {
    render(<ImportForm />);
    expect(screen.getByRole("button", { name: "粘贴链接" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "粘贴文字" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "粘贴文字" }));
    fireEvent.change(screen.getByLabelText("菜谱文字"), { target: { value: "太短" } });
    fireEvent.submit(screen.getByRole("button", { name: "生成菜谱草稿" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("至少粘贴 40 个字");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("disables the submit button while creating a job", async () => {
    mocks.create.mockReturnValue(new Promise(() => undefined));
    render(<ImportForm />);
    fireEvent.change(screen.getByLabelText("网页或视频链接"), { target: { value: "https://example.com/recipe" } });
    fireEvent.submit(screen.getByRole("button", { name: "生成菜谱草稿" }).closest("form")!);
    expect(await screen.findByRole("button", { name: "正在准备导入…" })).toBeDisabled();
  });
});
