import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CookingCompletion } from "./cooking-completion";
import { emptyDetails } from "./recipe-model";
import type { CookingRecordExtras } from "./cooking-model";
const picker = vi.hoisted(() => ({ pick: vi.fn() }));
vi.mock("./media", () => ({
  usesNativeImagePicker: () => true,
  pickLocalImage: picker.pick,
  saveLocalImage: vi.fn(),
}));
vi.mock("./local-image", () => ({
  LocalImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
const record = {
  id: "c",
  recipeId: "r",
  cookedAt: "2026-10-04T01:00:00.000Z",
  finishedPhotoPath: null,
  evaluation: null,
  note: null,
};
function setup() {
  const update = vi.fn(async (extras: CookingRecordExtras) => ({
      ...record,
      ...extras,
    })),
    cover = vi.fn(async () => ({
      ...emptyDetails("鸭"),
      id: "r",
      createdAt: record.cookedAt,
      updatedAt: record.cookedAt,
    })),
    done = vi.fn(),
    adjust = vi.fn();
  render(
    <CookingCompletion
      record={record}
      onUpdate={update}
      onSetCover={cover}
      onDone={done}
      onAdjust={adjust}
    />,
  );
  return { update, cover, done, adjust };
}
beforeEach(() => {
  picker.pick.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
it("an empty optional form immediately returns with the already saved minimum record", async () => {
  const { update, done } = setup();
  expect(
    screen.getByRole("heading", { name: "已记录做过这道菜" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "完成并返回" }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(update).not.toHaveBeenCalled();
});
it("failed extras preserve text and minimal record, with explicit skip and retry", async () => {
  const { update, done } = setup();
  update.mockRejectedValueOnce(new Error("磁盘暂不可写"));
  fireEvent.change(screen.getByLabelText("这次的备注"), {
    target: { value: "少放盐\n🍗" },
  });
  fireEvent.click(screen.getByRole("button", { name: "完成并返回" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("这次的备注")).toHaveValue("少放盐\n🍗");
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "仅保留做过记录" }));
  expect(done).toHaveBeenCalledOnce();
});
it("picker cancellation preserves unsaved notes and never automatically sets the cover", async () => {
  const { update, cover } = setup();
  picker.pick.mockResolvedValue(null);
  fireEvent.change(screen.getByLabelText("这次的备注"), {
    target: { value: "保留" },
  });
  fireEvent.click(screen.getByRole("button", { name: "添加成品照片" }));
  await waitFor(() => expect(picker.pick).toHaveBeenCalledOnce());
  expect(screen.getByLabelText("这次的备注")).toHaveValue("保留");
  expect(update).not.toHaveBeenCalled();
  expect(cover).not.toHaveBeenCalled();
});
it("explicit set-cover first saves the same picked photo path, without replacing cookedAt", async () => {
  const { update, cover } = setup();
  picker.pick.mockResolvedValue("images/aaaa.png");
  fireEvent.click(screen.getByRole("button", { name: "添加成品照片" }));
  await screen.findByRole("img", { name: "这次的成品照片" });
  fireEvent.click(screen.getByRole("button", { name: "设为菜谱封面" }));
  await waitFor(() => expect(cover).toHaveBeenCalledOnce());
  expect(update).toHaveBeenCalledWith({
    finishedPhotoPath: "images/aaaa.png",
    evaluation: null,
    note: null,
  });
  expect(update.mock.invocationCallOrder[0]).toBeLessThan(
    cover.mock.invocationCallOrder[0],
  );
});
it("native Back keeps declined dirty input and explicit discard never deletes the record", () => {
  const { done } = setup();
  fireEvent.change(screen.getByLabelText("这次的备注"), {
    target: { value: "未保存" },
  });
  vi.mocked(window.confirm).mockReturnValue(false);
  const event = new Event("recipio:back", { cancelable: true });
  fireEvent(window, event);
  expect(event.defaultPrevented).toBe(true);
  expect(done).not.toHaveBeenCalled();
  expect(screen.getByLabelText("这次的备注")).toHaveValue("未保存");
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  expect(done).toHaveBeenCalledOnce();
});
