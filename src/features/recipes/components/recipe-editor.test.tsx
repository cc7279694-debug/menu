import { render, screen, waitFor, within } from "@testing-library/react";
import { Profiler } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

const { removeMedia } = vi.hoisted(() => ({ removeMedia: vi.fn() }));
const importActionMocks = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue({ ok: true, data: null }),
  finalize: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));
const nutritionActionMocks = vi.hoisted(() => ({ analyze: vi.fn() }));

vi.mock("@/lib/supabase/browser", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ remove: removeMedia }) },
  }),
}));
vi.mock("@/features/recipe-imports/actions", () => ({
  confirmRecipeImportReviewAction: importActionMocks.confirm,
  finalizeRecipeImportAction: importActionMocks.finalize,
}));
vi.mock("@/features/nutrition-analysis/actions", () => ({ analyzeNutritionAction: nutritionActionMocks.analyze }));

const userId = "11111111-1111-4111-8111-111111111111";

describe("RecipeEditor", () => {
  it("fills per-serving nutrition from the current ingredients without saving", async () => {
    const user = userEvent.setup();
    const initialValue: RecipeSaveInput = {
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
      nutrition: null,
      ingredients: [{ recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "牛肉", quantity: 200, quantityText: null, unit: "克", preparationNote: null, sortOrder: 0 }],
      steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "煎熟", imagePath: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    };
    nutritionActionMocks.analyze.mockResolvedValue({
      ok: true,
      data: {
        total: { caloriesKcal: 400, proteinGrams: 40, fatGrams: null, carbsGrams: null },
        perServing: { caloriesKcal: 200, proteinGrams: 20, fatGrams: null, carbsGrams: null },
        ingredients: [], assumptions: ["按生重"], omittedItems: [], confidence: "medium",
      },
    });
    const saveRecipe = vi.fn();
    render(<RecipeEditor mode="edit" userId={userId} categories={[]} tags={[]} initialValue={initialValue} onSaved={vi.fn()} saveRecipe={saveRecipe} />);

    await user.click(screen.getByRole("button", { name: "AI 营养分析" }));
    await waitFor(() => expect(nutritionActionMocks.analyze).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已填入每份营养，请检查后保存"));
    expect(nutritionActionMocks.analyze).toHaveBeenCalledWith({ ingredientText: "牛肉 200克", servings: 2 });
    expect(screen.getByLabelText("热量（千卡）")).toHaveValue(200);
    expect(screen.getByLabelText("蛋白质（克）")).toHaveValue(20);
    expect(screen.getByText("已填入每份营养，请检查后保存")).toBeInTheDocument();
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  it("asks for an ingredient before analysis when names are blank", async () => {
    const user = userEvent.setup();
    render(<RecipeEditor mode="create" userId={userId} categories={[]} tags={[]} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "AI 营养分析" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("请先填写至少一种食材和用量");
    expect(nutritionActionMocks.analyze).not.toHaveBeenCalled();
  });

  it("requires confirmation before saving an imported draft", async () => {
    const user = userEvent.setup();
    const initialValue: RecipeSaveInput = {
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
      ingredients: [{ recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "番茄", quantity: null, quantityText: "适量", unit: null, preparationNote: null, sortOrder: 0 }],
      steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "切块", imagePath: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    };
    const saveRecipe = vi.fn().mockResolvedValue({ ok: true, data: { recipeId: initialValue.recipeId } });
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        initialValue={initialValue}
        importId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        importReview={{
          fieldChecks: [{ path: "prepMinutes", status: "missing", label: "总准备时间", message: "来源未明确提供总准备时间，请确认后补充。" }],
          requiresConfirmation: true,
          confirmedAt: null,
        }}
        onSaved={vi.fn()}
        saveRecipe={saveRecipe}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存菜谱" }));
    expect(await screen.findByText("请先确认 AI 推断和缺失内容")).toBeInTheDocument();
    expect(saveRecipe).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
    await user.click(screen.getByRole("button", { name: "保存菜谱" }));
    await waitFor(() => expect(importActionMocks.confirm).toHaveBeenCalledWith("dddddddd-dddd-4ddd-8ddd-dddddddddddd"));
    expect(saveRecipe).toHaveBeenCalledTimes(1);
  });

  it("edits step timers as minutes and seconds while saving total seconds", async () => {
    const user = userEvent.setup();
    const initialValue: RecipeSaveInput = {
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
      ingredients: [{ recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "番茄", quantity: null, quantityText: null, unit: null, preparationNote: null, sortOrder: 0 }],
      steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "煮熟", imagePath: null, timerSeconds: 90, sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    };
    const saveRecipe = vi.fn().mockResolvedValue({ ok: true, data: { recipeId: initialValue.recipeId } });

    render(
      <RecipeEditor
        mode="edit"
        userId={userId}
        categories={[]}
        tags={[]}
        initialValue={initialValue}
        onSaved={vi.fn()}
        saveRecipe={saveRecipe}
      />,
    );

    expect(screen.getByLabelText("第 1 步计时分钟")).toHaveValue(1);
    expect(screen.getByLabelText("第 1 步计时秒")).toHaveValue(30);
    await user.clear(screen.getByLabelText("第 1 步计时分钟"));
    await user.type(screen.getByLabelText("第 1 步计时分钟"), "2");
    await user.clear(screen.getByLabelText("第 1 步计时秒"));
    await user.type(screen.getByLabelText("第 1 步计时秒"), "5");
    await user.click(screen.getByRole("button", { name: "保存菜谱" }));

    await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
    expect(saveRecipe.mock.calls[0][0].steps[0].timerSeconds).toBe(125);
  });

  it("keeps save actions reachable while editing on mobile", () => {
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={vi.fn()}
      />,
    );

    const actions = screen.getByRole("region", { name: "菜谱编辑操作" });
    expect(actions).toHaveClass("sticky");
    expect(actions).toHaveClass("top-2");
    expect(within(actions).getByRole("button", { name: "保存菜谱" })).toBeInTheDocument();
  });

  it("keeps the editor shell from rerendering for every step keystroke", async () => {
    const user = userEvent.setup();
    const onRender = vi.fn();

    render(
      <Profiler id="recipe-editor" onRender={onRender}>
        <RecipeEditor
          mode="create"
          userId={userId}
          categories={[]}
          tags={[]}
          onSaved={vi.fn()}
        />
      </Profiler>,
    );

    const rendersBeforeTyping = onRender.mock.calls.length;
    await user.type(screen.getByLabelText("步骤说明"), "先切块再翻炒");

    expect(onRender.mock.calls.length - rendersBeforeTyping).toBeLessThan(3);
  });

  it("starts with editable basics and lets the user add ingredients and steps", async () => {
    const user = userEvent.setup();
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "新建菜谱" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("食材名称")).toHaveLength(1);
    expect(screen.getAllByLabelText("单位")).toHaveLength(1);
    expect(screen.getAllByLabelText("步骤说明")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "添加食材" }));
    await user.click(screen.getByRole("button", { name: "添加步骤" }));

    expect(screen.getAllByLabelText("食材名称")).toHaveLength(2);
    expect(screen.getAllByLabelText("步骤说明")).toHaveLength(2);
  });

  it("moves an ingredient up without losing its entered value", async () => {
    const user = userEvent.setup();
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getAllByLabelText("食材名称")[0], "番茄");
    await user.click(screen.getByRole("button", { name: "添加食材" }));
    await user.type(screen.getAllByLabelText("食材名称")[1], "鸡蛋");
    await user.click(screen.getByRole("button", { name: "上移食材 2" }));

    expect(screen.getAllByLabelText("食材名称")[0]).toHaveValue("鸡蛋");
    expect(screen.getAllByLabelText("食材名称")[1]).toHaveValue("番茄");
  });

  it("moves a step down without losing its entered value", async () => {
    const user = userEvent.setup();
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getAllByLabelText("步骤说明")[0], "先切块");
    await user.click(screen.getByRole("button", { name: "添加步骤" }));
    await user.type(screen.getAllByLabelText("步骤说明")[1], "再翻炒");
    await user.click(screen.getByRole("button", { name: "下移步骤 1" }));

    expect(screen.getAllByLabelText("步骤说明")[0]).toHaveValue("再翻炒");
    expect(screen.getAllByLabelText("步骤说明")[1]).toHaveValue("先切块");
  });

  it("cleans a removed existing image after a successful save", async () => {
    const user = userEvent.setup();
    const oldCoverPath = `${userId}/recipes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover/old.webp`;
    const initialValue: RecipeSaveInput = {
      recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "番茄炒蛋",
      description: null,
      categoryId: null,
      tagIds: [],
      coverPath: oldCoverPath,
      baseServings: 2,
      prepMinutes: null,
      cookMinutes: null,
      personalNotes: null,
      ingredients: [{ recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "番茄", quantity: null, quantityText: null, unit: null, preparationNote: null, sortOrder: 0 }],
      steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "切块", imagePath: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    };
    removeMedia.mockResolvedValue({ data: [], error: null });

    render(
      <RecipeEditor
        mode="edit"
        userId={userId}
        categories={[]}
        tags={[]}
        initialValue={initialValue}
        coverPreviewUrl="https://example.test/old.webp"
        onSaved={vi.fn()}
        saveRecipe={vi.fn().mockResolvedValue({ ok: true, data: { recipeId: initialValue.recipeId } })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "移除图片" }));
    await user.click(screen.getByRole("button", { name: "保存菜谱" }));

    await waitFor(() => expect(removeMedia).toHaveBeenCalledWith([oldCoverPath]));
  });

  it("keeps entered data when validation fails and calls save only with valid data", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const saveRecipe = vi.fn().mockResolvedValue({
      ok: true,
      data: { recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    });
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={onSaved}
        saveRecipe={saveRecipe}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "保存菜谱" })[0]);
    expect(await screen.findByText("请先填写菜谱名称")).toBeInTheDocument();
    expect(saveRecipe).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("菜名"), "番茄炒蛋");
    await user.type(screen.getAllByLabelText("食材名称")[0], "番茄");
    await user.type(screen.getAllByLabelText("步骤说明")[0], "切块。");
    await user.click(screen.getAllByRole("button", { name: "保存菜谱" })[0]);

    await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
    expect(saveRecipe.mock.calls[0][0]).toMatchObject({ title: "番茄炒蛋" });
    expect(onSaved).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
