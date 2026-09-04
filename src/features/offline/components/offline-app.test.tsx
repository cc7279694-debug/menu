import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineRecipeSnapshot, OfflineShoppingSnapshot } from "@/features/offline/types";

const databaseMocks = vi.hoisted(() => ({
  getLastOfflineProfile: vi.fn(),
  listRecipeSnapshots: vi.fn(),
  getRecipeSnapshot: vi.fn(),
  getShoppingSnapshot: vi.fn(),
  queueShoppingToggle: vi.fn(),
}));
const navigationMocks = vi.hoisted(() => ({
  useSearchParams: vi.fn(() => new URLSearchParams(window.location.search)),
}));

vi.mock("@/features/offline/database", () => databaseMocks);
vi.mock("@/features/offline/media-cache", () => ({ getRecipeMedia: vi.fn().mockResolvedValue(null) }));
vi.mock("next/navigation", () => navigationMocks);
vi.mock("@/features/cooking/components/cooking-screen", () => ({
  CookingScreen: ({ recipe }: { recipe: { title: string; coverUrl: string | null; coverPath: string | null; steps: Array<{ imageUrl: string | null; imagePath: string | null }> } }) => (
    <div data-cover-path={recipe.coverPath ?? "null"} data-cover-url={recipe.coverUrl ?? "null"} data-step-image-path={recipe.steps[0]?.imagePath ?? "null"} data-step-image-url={recipe.steps[0]?.imageUrl ?? "null"} data-testid="offline-cooking-screen">正在烹饪：{recipe.title}</div>
  ),
}));

import { OfflineApp } from "@/features/offline/components/offline-app";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "22222222-2222-4222-8222-222222222222";
const LIST_ID = "33333333-3333-4333-8333-333333333333";

const recipe: OfflineRecipeSnapshot = {
  userId: USER_ID,
  recipeId: RECIPE_ID,
  cachedAt: "2026-08-28T00:00:00.000Z",
  lastOpenedAt: "2026-08-28T00:00:00.000Z",
  dataVersion: 3,
  recipe: {
    id: RECIPE_ID,
    title: "番茄炒蛋",
    description: "家常菜",
    coverUrl: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 8,
    isFavorite: false,
    category: null,
    tags: [],
    preparationCount: 0,
    maxLeadTimeMinutes: null,
    updatedAt: "2026-08-28T00:00:00.000Z",
    personalNotes: "少放盐",
    coverPath: null,
    ingredients: [{ id: "ingredient-1", name: "鸡蛋", quantity: 2, quantityText: null, unit: "个", preparationNote: null, sortOrder: 0 }],
    steps: [{ id: "step-1", instruction: "炒熟鸡蛋", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
    preparations: [{ id: "prep-1", recipeIngredientId: "ingredient-1", ingredientName: "鸡蛋", instruction: "提前腌制", leadTimeMinutes: 240, timingText: null, sortOrder: 1 }],
  },
};

const shopping: OfflineShoppingSnapshot = {
  userId: USER_ID,
  listId: LIST_ID,
  cachedAt: "2026-08-28T00:00:00.000Z",
  serverUpdatedAt: "2026-08-28T00:00:00.000Z",
  dataVersion: 1,
  list: {
    id: LIST_ID,
    name: "本周采购",
    updatedAt: "2026-08-28T00:00:00.000Z",
    sources: [],
    items: [{ id: "item-1", ingredientId: null, nameSnapshot: "鸡蛋", quantity: 2, quantityText: null, unit: "个", aisle: "蔬菜", isChecked: false, isManual: false, sortOrder: 0, sources: [] }],
  },
};

function setTarget(path: string) {
  window.history.replaceState({}, "", `/offline/app?path=${encodeURIComponent(path)}`);
}

describe("OfflineApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.getLastOfflineProfile.mockResolvedValue({ userId: USER_ID, lastAuthenticatedAt: "2026-08-28T00:00:00.000Z" });
    databaseMocks.listRecipeSnapshots.mockResolvedValue([recipe]);
    databaseMocks.getRecipeSnapshot.mockResolvedValue(recipe);
    databaseMocks.getShoppingSnapshot.mockResolvedValue(shopping);
    databaseMocks.queueShoppingToggle.mockResolvedValue({ userId: USER_ID, listId: LIST_ID, itemId: "item-1", targetChecked: true, clientMutationId: "mutation-1", queuedAt: "2026-08-28T00:00:00.000Z", attemptCount: 0, lastError: null });
  });

  it("shows recent cached recipes for the recipe list target", async () => {
    setTarget("/recipes");
    render(<OfflineApp />);

    expect(await screen.findByRole("heading", { name: "最近离线菜谱" })).toBeInTheDocument();
    expect(screen.getByText("番茄炒蛋")).toBeInTheDocument();
  });

  it("shows read-only recipe detail without server actions", async () => {
    setTarget(`/recipes/${RECIPE_ID}`);
    render(<OfflineApp />);

    expect(await screen.findByRole("heading", { name: "番茄炒蛋" })).toBeInTheDocument();
    expect(screen.getByText("炒熟鸡蛋")).toBeInTheDocument();
    expect(screen.getByText("提前 4 小时")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /收藏|编辑/ })).not.toBeInTheDocument();
  });

  it("updates the rendered target when the offline path changes without remounting", async () => {
    setTarget("/recipes");
    const view = render(<OfflineApp />);

    expect(await screen.findByRole("heading", { name: "最近离线菜谱" })).toBeInTheDocument();

    await act(async () => {
      window.history.pushState({}, "", `/offline/app?path=${encodeURIComponent(`/recipes/${RECIPE_ID}`)}`);
      view.rerender(<OfflineApp />);
    });

    expect(await screen.findByRole("heading", { name: "食材清单" })).toBeInTheDocument();
  });

  it("renders cooking for an encoded cooking target", async () => {
    setTarget(`/recipes/${RECIPE_ID}/cook?servings=4`);
    render(<OfflineApp />);

    expect(await screen.findByTestId("offline-cooking-screen")).toHaveTextContent("番茄炒蛋");
  });

  it("strips media URLs before rendering offline cooking", async () => {
    const unsafeRecipe = structuredClone(recipe);
    Object.assign(unsafeRecipe.recipe, { coverUrl: "https://private.example/cover.jpg", coverPath: "private/cover.jpg" });
    Object.assign(unsafeRecipe.recipe.steps[0], { imageUrl: "https://private.example/step.jpg", imagePath: "private/step.jpg" });
    databaseMocks.getRecipeSnapshot.mockResolvedValue(unsafeRecipe);
    setTarget(`/recipes/${RECIPE_ID}/cook`);
    render(<OfflineApp />);

    expect(await screen.findByTestId("offline-cooking-screen")).toHaveTextContent("番茄炒蛋");
    expect(screen.getByTestId("offline-cooking-screen")).toHaveAttribute("data-cover-url", "null");
    expect(screen.getByTestId("offline-cooking-screen")).toHaveAttribute("data-cover-path", "null");
    expect(screen.getByTestId("offline-cooking-screen")).toHaveAttribute("data-step-image-url", "null");
    expect(screen.getByTestId("offline-cooking-screen")).toHaveAttribute("data-step-image-path", "null");
  });

  it("shows a clear empty state when no recipe snapshots exist", async () => {
    databaseMocks.listRecipeSnapshots.mockResolvedValue([]);
    setTarget("/recipes");
    render(<OfflineApp />);

    expect(await screen.findByText("没有可用的离线菜谱")).toBeInTheDocument();
  });

  it("shows a fixed-ratio media placeholder on recipe detail", async () => {
    setTarget(`/recipes/${RECIPE_ID}`);
    render(<OfflineApp />);

    expect(await screen.findByLabelText("菜谱图片离线不可用")).toBeInTheDocument();
  });

  it("shows a recoverable storage error state", async () => {
    databaseMocks.getLastOfflineProfile.mockRejectedValue(new Error("OFFLINE_STORAGE_UNAVAILABLE"));
    setTarget("/recipes");
    render(<OfflineApp />);

    expect(await screen.findByText("此设备暂时无法使用离线数据")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回在线页面" })).toHaveAttribute("href", "/recipes");
  });

  it("returns to the current supported online target from an error state", async () => {
    databaseMocks.getShoppingSnapshot.mockRejectedValue(new Error("OFFLINE_STORAGE_UNAVAILABLE"));
    setTarget("/shopping");
    render(<OfflineApp />);

    expect(await screen.findByText("此设备暂时无法使用离线数据")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回在线页面" })).toHaveAttribute("href", "/shopping");
  });

  it("queues an offline shopping checkbox change", async () => {
    setTarget("/shopping");
    render(<OfflineApp />);

    const checkbox = await screen.findByRole("checkbox", { name: /鸡蛋/ });
    fireEvent.click(checkbox);

    await waitFor(() => expect(databaseMocks.queueShoppingToggle).toHaveBeenCalledWith({ userId: USER_ID, listId: LIST_ID, itemId: "item-1", targetChecked: true }));
    expect(screen.getByText("待同步")).toBeInTheDocument();
  });

  it("shows an empty state when there is no offline profile", async () => {
    databaseMocks.getLastOfflineProfile.mockResolvedValue(null);
    setTarget("/recipes");
    render(<OfflineApp />);

    expect(await screen.findByText("没有可用的离线数据")).toBeInTheDocument();
  });

  it("rejects unknown and external targets", async () => {
    setTarget("//evil.example");
    render(<OfflineApp />);

    expect(await screen.findByText("该页面暂不支持离线使用")).toBeInTheDocument();
  });
});
