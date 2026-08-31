import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { RecipeSaveInput } from "@/features/recipes/schemas";

import { RecipePreparationsEditor } from "./recipe-preparations-editor";

const ingredientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function TestForm() {
  const form = useForm<RecipeSaveInput>({
    defaultValues: {
      recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "测试",
      description: null,
      categoryId: null,
      tagIds: [],
      coverPath: null,
      baseServings: 2,
      prepMinutes: null,
      cookMinutes: null,
      personalNotes: null,
      ingredients: [{ recipeIngredientId: ingredientId, name: "牛肉", quantity: null, quantityText: null, unit: null, preparationNote: null, sortOrder: 0 }],
      steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "炒", imagePath: null, timerSeconds: null, heatLevel: null, sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    },
  });
  const preparations = useWatch({ control: form.control, name: "preparations" });

  return (
    <>
      <RecipePreparationsEditor control={form.control} errors={form.formState.errors} register={form.register} setValue={form.setValue} />
      <output data-testid="preparations-value">{JSON.stringify(preparations)}</output>
    </>
  );
}

describe("RecipePreparationsEditor", () => {
  it("converts selected units to canonical minutes and preserves the linked ingredient", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByRole("button", { name: "添加提前准备" }));
    await user.selectOptions(screen.getByLabelText("关联食材 1"), ingredientId);
    await user.type(screen.getByLabelText("准备说明 1"), "加入调料抓匀腌制");
    await user.selectOptions(screen.getByLabelText("时间单位 1"), "hour");
    await user.type(screen.getByLabelText("提前时间 1"), "1.5");

    expect(JSON.parse(screen.getByTestId("preparations-value").textContent ?? "[]")[0]).toMatchObject({
      recipeIngredientId: ingredientId,
      leadTimeMinutes: 90,
      instruction: "加入调料抓匀腌制",
    });
  });

  it("shows validation for an empty time and supports text time", async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await user.click(screen.getByRole("button", { name: "添加提前准备" }));
    await user.type(screen.getByLabelText("准备说明 1"), "提前解冻");
    await user.type(screen.getByLabelText("文字时间 1"), "提前一晚");
    expect(JSON.parse(screen.getByTestId("preparations-value").textContent ?? "[]")[0].timingText).toBe("提前一晚");
  });
});
