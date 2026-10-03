import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { emptyDetails } from "./recipe-model";
import { RecipeEditor } from "./recipe-editor";

const media = vi.hoisted(() => ({ pickLocalImage: vi.fn(), saveLocalImage: vi.fn() }));
vi.mock("./media", () => ({ ...media, usesNativeImagePicker: () => true }));
vi.mock("./local-image", () => ({
  LocalImage: ({ path, alt }: { path?: string | null; alt: string }) =>
    path ? <img src={path} alt={alt} /> : <span>暂无图片</span>,
}));
const path = "images/123e4567-e89b-12d3-a456-426614174000.png";
beforeEach(() => { media.pickLocalImage.mockReset(); media.saveLocalImage.mockReset(); });
function editor() {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const initial = { ...emptyDetails(), title: "鸡翅", steps: [{ instruction: "小火焖煮", imagePath: null }] };
  const view = render(<RecipeEditor initial={initial} onSave={onSave} onCancel={vi.fn()} />);
  const inputs = view.container.querySelectorAll<HTMLInputElement>("input[type=file]");
  return { onSave, inputs };
}
it("imports cover and step image via the native picker, not FileReader", async () => {
  const { onSave, inputs } = editor();
  media.pickLocalImage.mockResolvedValue(path);
  fireEvent.click(inputs[0]);
  await screen.findByAltText("菜谱封面");
  fireEvent.click(inputs[1]);
  await screen.findByAltText("步骤 1 参考图");
  fireEvent.click(screen.getByRole("button", { name: "快速保存菜谱" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    coverPath: path, steps: [{ instruction: "小火焖煮", imagePath: path }],
  })));
  expect(media.saveLocalImage).not.toHaveBeenCalled();
});
it("cancelling selection leaves the old cover and text untouched and unlocks saving", async () => {
  const initial = { ...emptyDetails(), title: "鸡翅", coverPath: path };
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = render(<RecipeEditor initial={initial} onSave={onSave} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "保留输入" } });
  media.pickLocalImage.mockResolvedValue(null);
  fireEvent.click(view.container.querySelector<HTMLInputElement>("input[type=file]")!);
  await waitFor(() => expect(media.pickLocalImage).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole("button", { name: "快速保存菜谱" })).toBeEnabled());
  expect(screen.getByAltText("菜谱封面")).toHaveAttribute("src", path);
  expect(screen.getByLabelText("个人备注")).toHaveValue("保留输入");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("preserves text and the existing image when native copying fails", async () => {
  const { inputs } = editor();
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "不要丢失" } });
  media.pickLocalImage.mockRejectedValue(new Error("图片保存失败，请检查设备空间后重试"));
  fireEvent.click(inputs[0]);
  await screen.findByText("图片保存失败，请检查设备空间后重试");
  expect(screen.getByLabelText("个人备注")).toHaveValue("不要丢失");
  expect(screen.getByRole("button", { name: "快速保存菜谱" })).toBeEnabled();
});
