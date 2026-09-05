import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineRecipeDetail, OfflineRecipeSnapshot } from "@/features/offline/types";
import type { RecipeSummary } from "@/features/recipes/types";

const mocks = vi.hoisted(() => ({
  getLastOfflineProfile: vi.fn(),
  listRecipeSnapshots: vi.fn(),
  listRecipeSummaryPage: vi.fn(),
  rememberOfflineProfile: vi.fn(),
  putRecipeSummaryPage: vi.fn(),
  getRecipeSnapshot: vi.fn(),
  loadRecipeListAction: vi.fn(),
  loadRecipeDetailAction: vi.fn(),
}));

vi.mock("@/features/offline/database", () => ({
  getLastOfflineProfile: mocks.getLastOfflineProfile,
  listRecipeSnapshots: mocks.listRecipeSnapshots,
  listRecipeSummaryPage: mocks.listRecipeSummaryPage,
  rememberOfflineProfile: mocks.rememberOfflineProfile,
  putRecipeSummaryPage: mocks.putRecipeSummaryPage,
  getRecipeSnapshot: mocks.getRecipeSnapshot,
}));
vi.mock("@/features/recipes/actions", () => ({
  loadRecipeListAction: mocks.loadRecipeListAction,
  loadRecipeDetailAction: mocks.loadRecipeDetailAction,
}));
vi.mock("@/features/offline/components/offline-recipe-cache", () => ({
  OfflineRecipeCache: () => <div data-testid="offline-recipe-cache" />,
}));
vi.mock("@/features/offline/components/offline-recipe-detail", () => ({
  OfflineRecipeDetail: ({ recipe }: { recipe: { title: string } }) => <div data-testid="offline-recipe-detail">本地：{recipe.title}</div>,
}));
vi.mock("@/features/recipes/components/recipe-detail", () => ({
  RecipeDetailView: ({ recipe, userId }: { recipe: { title: string }; userId?: string | null }) => <div data-testid="recipe-detail-view" data-user-id={userId ?? "null"}>云端：{recipe.title}</div>,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { RecipeDetailLocalFirstPage } from "./recipe-detail-local-first-page";
import { RecipeListLocalFirstPage } from "./recipe-list-local-first-page";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "22222222-2222-4222-8222-222222222222";
const updatedAt = "2026-08-28T00:00:00.000Z";

const summary: RecipeSummary = {
  id: RECIPE_ID,
  title: "本地番茄炒蛋",
  description: "本地缓存",
  coverUrl: null,
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 8,
  isFavorite: false,
  category: null,
  tags: [],
  preparationCount: 0,
  maxLeadTimeMinutes: null,
  nutrition: null,
  updatedAt,
};

const detail: OfflineRecipeDetail = {
  ...summary,
  title: "本地番茄炒蛋",
  coverUrl: null,
  personalNotes: null,
  coverPath: null,
  ingredients: [],
  steps: [],
  preparations: [],
};

const snapshot: OfflineRecipeSnapshot = {
  userId: USER_ID,
  recipeId: RECIPE_ID,
  cachedAt: updatedAt,
  lastOpenedAt: updatedAt,
  dataVersion: 3,
  recipe: detail,
};

describe("recipe local-first pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLastOfflineProfile.mockResolvedValue({ userId: USER_ID, lastAuthenticatedAt: updatedAt });
    mocks.listRecipeSnapshots.mockResolvedValue([snapshot]);
    mocks.listRecipeSummaryPage.mockResolvedValue([]);
    mocks.rememberOfflineProfile.mockResolvedValue(undefined);
    mocks.putRecipeSummaryPage.mockResolvedValue(undefined);
    mocks.getRecipeSnapshot.mockResolvedValue(snapshot);
  });

  it("renders cached recipe summaries before the cloud refresh resolves", async () => {
    let resolveRemote: (value: unknown) => void = () => undefined;
    mocks.loadRecipeListAction.mockReturnValue(new Promise((resolve) => { resolveRemote = resolve; }));

    render(<RecipeListLocalFirstPage title="我的菜谱" />);

    expect(await screen.findByRole("heading", { name: "我的菜谱" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /本地番茄炒蛋/ })).toBeInTheDocument();
    expect(screen.getByText("已使用本机缓存，正在同步云端…")).toBeInTheDocument();

    resolveRemote({ ok: true, data: { items: [summary], totalCount: 1, categories: [], tags: [], userId: USER_ID } });
    await waitFor(() => expect(mocks.loadRecipeListAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.putRecipeSummaryPage).toHaveBeenCalledWith(USER_ID, [summary], false));
  });

  it("keeps the cached detail visible while refreshing it in the background", async () => {
    let resolveRemote: (value: unknown) => void = () => undefined;
    mocks.loadRecipeDetailAction.mockReturnValue(new Promise((resolve) => { resolveRemote = resolve; }));

    render(<RecipeDetailLocalFirstPage recipeId={RECIPE_ID} />);

    expect(await screen.findByTestId("offline-recipe-detail")).toHaveTextContent("本地：本地番茄炒蛋");
    expect(screen.getByText("正在后台同步最新内容…")).toBeInTheDocument();

    const remoteDetail = { ...detail, title: "云端番茄炒蛋" };
    resolveRemote({ ok: true, data: { recipe: remoteDetail, cookingHistory: { stats: { totalCount: 0, ratedCount: 0, averageRating: null, latestImprovementNotes: null }, recentRecords: [] }, userId: USER_ID } });
    const detailView = await screen.findByTestId("recipe-detail-view");
    expect(detailView).toHaveTextContent("云端：云端番茄炒蛋");
    expect(detailView).toHaveAttribute("data-user-id", USER_ID);
  });
});
