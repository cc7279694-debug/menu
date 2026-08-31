import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadCookingRecordPhotos = vi.hoisted(() => vi.fn());
const removeCookingRecordPhotoPaths = vi.hoisted(() => vi.fn());
const completeCookingRecordAction = vi.hoisted(() => vi.fn());
const getBrowserSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/features/cooking-history/media", () => ({ uploadCookingRecordPhotos, removeCookingRecordPhotoPaths }));
vi.mock("@/features/cooking-history/actions", () => ({ completeCookingRecordAction }));
vi.mock("@/lib/supabase/browser", () => ({ getBrowserSupabaseClient }));

import { CookingReflectionDialog } from "@/features/cooking-history/components/cooking-reflection-dialog";

const props = {
  open: true,
  userId: "11111111-1111-4111-8111-111111111111",
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  mealPlanEntryId: null,
  startedAt: Date.parse("2026-08-31T10:00:00.000Z"),
  defaultServings: 2,
  onOpenChange: vi.fn(),
  onCompleted: vi.fn(),
  onSkip: vi.fn(),
};

describe("CookingReflectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBrowserSupabaseClient.mockReturnValue({ storage: { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) } });
    uploadCookingRecordPhotos.mockResolvedValue({ photos: [], uploadedPaths: [] });
    completeCookingRecordAction.mockResolvedValue({ ok: true, data: { cookingRecordId: "record" } });
  });

  it("shows default servings and saves optional fields as null/empty", async () => {
    render(<CookingReflectionDialog {...props} />);
    expect(screen.getByLabelText("实际份数")).toHaveValue(2);
    fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
    await waitFor(() => expect(completeCookingRecordAction).toHaveBeenCalled());
    expect(completeCookingRecordAction.mock.calls[0]?.[0]).toMatchObject({ actualServings: 2, rating: null, improvementNotes: null, photos: [] });
    expect(props.onCompleted).toHaveBeenCalledWith("record");
  });

  it("keeps the dialog open after a save error and allows an explicit skip", async () => {
    completeCookingRecordAction.mockResolvedValue({ ok: false, message: "烹饪记录保存失败，请稍后重试" });
    render(<CookingReflectionDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("烹饪记录保存失败"));
    expect(props.onCompleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "本次不保存记录并退出" }));
    expect(props.onSkip).toHaveBeenCalled();
  });
});
