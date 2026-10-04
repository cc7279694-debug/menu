import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyDetails } from "../recipe-model";
import { aiModelOutputSchema, AI_JSON_SCHEMA } from "./contract";
import { intakeFixture } from "./fixtures.test-support";

describe("strict AI output contract", () => {
  it("accepts a title-only recipe without default servings or invented steps", () => {
    const checked = aiModelOutputSchema.parse({ recipe: emptyDetails("绿豆汤🍲\n家常做法"), fieldChecks: [], warnings: [] });
    expect(checked.recipe.servings).toBeNull();
    expect(checked.recipe.steps).toEqual([]);
  });
  it("keeps native provider schema aligned with the actual local validator", () => {
    const asset = JSON.parse(readFileSync("android/app/src/main/assets/recipio-ai-intake-contract.json", "utf8"));
    expect(asset.schema).toEqual(AI_JSON_SCHEMA);
    expect(asset.schema.required).toEqual(["recipe", "fieldChecks", "warnings"]);
    expect(asset.schema.additionalProperties).toBe(false);
  });
  it.each([
    ["ingredients", 300], ["steps", 300], ["preparations", 100], ["keyTips", 100],
  ] as const)("accepts %s at its real limit but rejects one extra", (field, limit) => {
    const value = intakeFixture();
    const item = field === "ingredients" ? { name: "盐", amount: "适量" } : field === "steps" ? { instruction: "搅拌", imagePath: null } : field === "preparations" ? { instruction: "先泡", minutes: null, timingText: "提前一晚" } : { instruction: "别糊锅", stepNumber: 1 };
    const atLimit = { ...value, recipe: { ...value.recipe, [field]: Array.from({ length: limit }, () => item) } };
    expect(aiModelOutputSchema.safeParse(atLimit).success).toBe(true);
    expect(aiModelOutputSchema.safeParse({ ...atLimit, recipe: { ...atLimit.recipe, [field]: Array.from({ length: limit + 1 }, () => item) } }).success).toBe(false);
  });
  it.each([
    ["empty title", { title: " " }], ["long title", { title: "菜".repeat(121) }],
    ["number string", { servings: "2" }], ["NaN", { servings: NaN }], ["Infinity", { servings: Infinity }],
    ["zero servings", { servings: 0 }], ["large servings", { servings: 10001 }],
    ["unknown field", { userId: "other-user" }], ["source metadata", { provider: "qwen" }],
    ["bad total minutes", { totalMinutes: 0 }], ["fractional minutes", { totalMinutes: 1.5 }],
    ["negative calories", { caloriesPerServing: -1 }], ["too many calories", { caloriesPerServing: 100001 }],
    ["permanent cover", { coverPath: "images/abc.jpg" }], ["long notes", { notes: "a".repeat(20001) }],
    ["missing ingredient name", { ingredients: [{ name: "", amount: "1克" }] }],
    ["extra ingredient key", { ingredients: [{ name: "盐", amount: "", grams: 1 }] }],
    ["long amount", { ingredients: [{ name: "盐", amount: "a".repeat(501) }] }],
    ["step image", { steps: [{ instruction: "炒", imagePath: "images/abc.jpg" }] }],
    ["missing step", { steps: [{ instruction: "", imagePath: null }] }],
    ["bad step reference", { keyTips: [{ instruction: "注意", stepNumber: 2 }] }],
    ["long timing text", { preparations: [{ instruction: "泡", minutes: null, timingText: "a".repeat(501) }] }],
  ])("rejects %s instead of coercing or silently stripping it", (_name, patch) => {
    const value = intakeFixture();
    expect(aiModelOutputSchema.safeParse({ ...value, recipe: { ...value.recipe, ...patch } }).success).toBe(false);
  });
  it("rejects missing required keys and AI-supplied confirmation", () => {
    expect(aiModelOutputSchema.safeParse({ recipe: emptyDetails("鸭") }).success).toBe(false);
    expect(aiModelOutputSchema.safeParse({ ...intakeFixture(), confirmedAt: "now" }).success).toBe(false);
  });
  it("bounds checks and warnings without truncating", () => {
    const check = { path: "title", status: "explicit", label: "菜名", message: null };
    expect(aiModelOutputSchema.safeParse({ ...intakeFixture(), fieldChecks: Array(1600).fill(check) }).success).toBe(true);
    expect(aiModelOutputSchema.safeParse({ ...intakeFixture(), fieldChecks: Array(1601).fill(check) }).success).toBe(false);
    expect(aiModelOutputSchema.safeParse({ ...intakeFixture(), warnings: Array(21).fill("警告") }).success).toBe(false);
    expect(aiModelOutputSchema.safeParse({ ...intakeFixture(), warnings: ["a".repeat(501)] }).success).toBe(false);
  });
});
