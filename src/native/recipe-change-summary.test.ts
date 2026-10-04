import { expect, it } from "vitest";
import { emptyDetails, type RecipeDetailsInput } from "./recipe-model";
import type { RecipeChange } from "./cooking-model";
import { summarizeRecipeChange } from "./recipe-change-summary";
const before = {
  ...emptyDetails("糖醋鸭"),
  ingredients: [{ name: "糖", amount: "30g" }],
  steps: [{ instruction: "煎鸭", imagePath: null }],
  id: "duck",
  createdAt: "2026-10-04T01:00:00.000Z",
  updatedAt: "2026-10-04T01:00:00.000Z",
};
function change(patch: Partial<RecipeDetailsInput>): RecipeChange {
  return {
    id: "c",
    recipeId: "duck",
    changedAt: before.updatedAt,
    before: structuredClone(before),
    after: {
      ...emptyDetails("糖醋鸭"),
      ingredients: before.ingredients,
      steps: before.steps,
      ...patch,
    },
  };
}
it("shows exact old and new ingredient quantities", () => {
  expect(
    summarizeRecipeChange(
      change({ ingredients: [{ name: "糖", amount: "15g" }] }),
    ),
  ).toContain("糖：30g → 15g");
});
it.each([
  ["食材", { ingredients: [] }],
  ["步骤", { steps: [{ instruction: "小火煎鸭", imagePath: null }] }],
  [
    "步骤图片",
    { steps: [{ instruction: "煎鸭", imagePath: "images/aaaa.png" }] },
  ],
  [
    "提前准备",
    { preparations: [{ instruction: "腌鸭", minutes: 30, timingText: null }] },
  ],
  ["关键事项", { keyTips: [{ instruction: "别煮干", stepNumber: 1 }] }],
  ["总耗时", { totalMinutes: 30 }],
  ["个人备注", { notes: "少盐\n🍚" }],
  ["封面", { coverPath: "images/aaaa.png" }],
] satisfies Array<[string, Partial<RecipeDetailsInput>]>)(
  "summarizes %s without a version tree",
  (label, patch) => {
    expect(summarizeRecipeChange(change(patch)).join("\n")).toContain(label);
  },
);
it("retains actual old historical whitespace and offers no meaningless unchanged summary", () => {
  const c = change({ notes: "新备注" });
  c.before.notes = "  旧备注\n🍗  ";
  expect(summarizeRecipeChange(c).join("\n")).toContain("  旧备注\n🍗  ");
  expect(summarizeRecipeChange(change({}))).toEqual([]);
});
