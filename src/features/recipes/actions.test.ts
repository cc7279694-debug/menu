import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveRecipeAction, setRecipeFavoriteAction } from "@/features/recipes/actions";

const recipeInput = {
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "番茄炒蛋",
  description: null,
  categoryId: null,
  tagIds: [],
  coverPath: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  personalNotes: null,
  ingredients: [
    {
      recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "番茄",
      quantity: 2,
      quantityText: null,
      unit: "个",
      preparationNote: null,
      sortOrder: 0,
    },
  ],
  steps: [
    {
      stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      instruction: "切块。",
      imagePath: null,
      timerSeconds: null,
      sortOrder: 0,
      ingredientLinks: [
        {
          recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          quantityOverride: null,
          quantityTextOverride: null,
          note: null,
        },
      ],
    },
  ],
};

function createSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "11111111-1111-4111-8111-111111111111", email: "a@example.test" } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: recipeInput.recipeId, error: null }),
    from: vi.fn(),
    ...overrides,
  };
}

describe("recipe actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated recipe saves", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      createSupabase({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      }),
    );

    await expect(saveRecipeAction(recipeInput)).resolves.toEqual({
      ok: false,
      message: "请先登录后再保存菜谱",
    });
  });

  it("validates before calling the atomic save RPC and revalidates on success", async () => {
    const supabase = createSupabase();
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(saveRecipeAction({ ...recipeInput, title: "" })).resolves.toMatchObject({
      ok: false,
    });
    expect(supabase.rpc).not.toHaveBeenCalled();

    await expect(saveRecipeAction(recipeInput)).resolves.toEqual({
      ok: true,
      data: { recipeId: recipeInput.recipeId },
    });
    expect(supabase.rpc).toHaveBeenCalledWith("save_recipe", {
      p_payload: expect.objectContaining({ title: "番茄炒蛋" }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/recipes");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/favorites");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/recipes/${recipeInput.recipeId}`);
  });

  it("updates favorites only for the current user's active recipe", async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: recipeInput.recipeId }, error: null }),
    };
    const supabase = createSupabase({ from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(chain) }) });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(setRecipeFavoriteAction(recipeInput.recipeId, true)).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(supabase.from).toHaveBeenCalledWith("recipes");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "11111111-1111-4111-8111-111111111111");
  });
});
