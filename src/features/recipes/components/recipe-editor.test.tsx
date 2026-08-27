import { render, screen, waitFor } from "@testing-library/react";
import { Profiler } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

const { removeMedia } = vi.hoisted(() => ({ removeMedia: vi.fn() }));

vi.mock("@/lib/supabase/browser", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ remove: removeMedia }) },
  }),
}));

const userId = "11111111-1111-4111-8111-111111111111";

describe("RecipeEditor", () => {
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
