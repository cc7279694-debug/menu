// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyDetails, recipeDetailsSchema } from "../recipe-model";
import { parseRecipePage, parseDuration, parseYield, parseCalories, parseIngredientLine, flattenInstructions, candidateQuality } from "./parser";
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
const page = (value: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(value)}</script></head><body><main>测试正文</main></body></html>`;
const recipe = (changes: Record<string, unknown> = {}) => ({ "@type": "Recipe", name: "测试菜", recipeIngredient: ["盐适量"], recipeInstructions: ["拌匀。"], ...changes });
describe("inert Schema.org recipe parser", () => {
  it("reads explicit recipe values but never keeps images, URLs or notes", () => {
    const result = parseRecipePage(fixture("standard-recipe"), "https://recipes.example/dish");
    expect(result.needsSelection).toBe(false);
    expect(result.candidates[0].quality).toBe("complete");
    expect(result.candidates[0].recipe).toEqual({ ...emptyDetails("测试可乐鸡翅"), totalMinutes: 30, servings: 4, caloriesPerServing: 520, ingredients: [{ name: "鸡翅", amount: "500克" }, { name: "可乐", amount: "1罐" }, { name: "盐", amount: "适量" }], steps: ["焯水。", "小火焖20分钟。", "最后收汁。"].map(instruction => ({ instruction, imagePath: null })) });
    expect(JSON.stringify(result.candidates[0].recipe)).not.toContain("https:");
    expect(recipeDetailsSchema.safeParse(result.candidates[0].recipe).success).toBe(true);
  });
  it.each([recipe(), [recipe()], { "@graph": [recipe()] }, [{ "@graph": [recipe({ "@type": ["Thing", "Recipe"] })] }]])("supports object, array, graph and combined type shapes", value => {
    expect(parseRecipePage(page(value), "https://recipes.example/dish").candidates[0].recipe.title).toBe("测试菜");
  });
  it("chooses better candidates by score rather than first document position", () => {
    const result = parseRecipePage(page([recipe({ name: "先出现", recipeIngredient: [] }), recipe({ name: "完整", totalTime: "PT30M", recipeYield: "4 servings", nutrition: { calories: "520 kcal" }, url: "https://recipes.example/dish" })]), "https://recipes.example/dish");
    expect(result.candidates[0].recipe.title).toBe("完整"); expect(result.needsSelection).toBe(false);
    expect(result.candidates[0].score).toBe(60);
  });
  it("requires selection for two complete candidates within ten points", () => {
    const first = parseRecipePage(fixture("multiple-recipes"), "https://recipes.example/dish");
    expect(first.needsSelection).toBe(true); expect(first.candidates.map(c => c.recipe.title)).toEqual(["鸡翅", "绿豆汤"]);
    expect(parseRecipePage(fixture("multiple-recipes"), "https://recipes.example/dish")).toEqual(first);
  });
  it("continues past broken JSON and single malformed instructions with warnings", () => {
    const result = parseRecipePage(fixture("malformed-jsonld"), "https://recipes.example/dish");
    expect(result.candidates[0].recipe.steps).toEqual([{ instruction: "拌匀。", imagePath: null }]);
    expect(result.warnings.length + result.candidates[0].warnings.length).toBeGreaterThan(0);
  });
  it("does not invent missing title, ingredients, steps or ambiguous scalars", () => {
    expect(parseRecipePage(page(recipe({ name: undefined })), "https://recipes.example/dish").candidates).toEqual([]);
    expect(parseRecipePage(fixture("partial-recipe"), "https://recipes.example/dish").candidates[0].quality).toBe("partial");
    expect(parseRecipePage(page(recipe({ recipeIngredient: [] })), "https://recipes.example/dish").candidates[0].quality).toBe("partial");
    expect(parseRecipePage(fixture("no-jsonld-readable"), "https://recipes.example/dish").candidates).toEqual([]);
    const draft = parseRecipePage(page(recipe({ totalTime: "about half an hour", prepTime: "PT10M", recipeYield: "2-3人", nutrition: { calories: "unknown" } })), "https://recipes.example/dish").candidates[0].recipe;
    expect([draft.totalMinutes, draft.servings, draft.caloriesPerServing]).toEqual([null, null, null]);
  });
  it("adds prep and cook only when both are explicit valid durations", () => {
    expect(parseRecipePage(page(recipe({ prepTime: "PT10M", cookTime: "PT20M" })), "https://recipes.example/dish").candidates[0].recipe.totalMinutes).toBe(30);
    expect(parseRecipePage(page(recipe({ prepTime: "PT10M", cookTime: "PT20M", totalTime: "PT25M" })), "https://recipes.example/dish").candidates[0].recipe.totalMinutes).toBe(25);
  });
  it("flattens nested sections in document order without treating section names as instructions", () => {
    expect(parseRecipePage(fixture("howto-section"), "https://recipes.example/dish").candidates[0].recipe.steps.map(s => s.instruction)).toEqual(["洗菜。", "切菜。", "煮熟。"]);
    const warnings: string[] = [];
    expect(flattenInstructions(["第一步", { "@type": "HowToStep", text: "第二步" }, {}, null, "第三步"], warnings)).toEqual(["第一步", "第二步", "第三步"]);
    expect(warnings.length).toBeGreaterThan(0);
    expect(flattenInstructions("拌匀。", [])).toEqual(["拌匀。"]);
  });
  it("classifies completeness deterministically without AI", () => {
    expect(candidateQuality(emptyDetails("测试"))).toBe("none");
    expect(candidateQuality({ ...emptyDetails("测试"), ingredients: [{ name: "盐", amount: "适量" }] })).toBe("partial");
    expect(candidateQuality({ ...emptyDetails("测试"), ingredients: [{ name: "盐", amount: "适量" }], steps: [{ instruction: "拌匀", imagePath: null }] })).toBe("complete");
  });
  it("handles bounded adversarial nesting and never executes page code", () => {
    let nested: unknown = recipe(); for (let i = 0; i < 100; i++) nested = { "@graph": [nested] };
    expect(() => parseRecipePage(page(nested), "https://recipes.example/dish")).not.toThrow();
    expect(parseRecipePage(fixture("prompt-injection"), "https://recipes.example/dish").candidates).toEqual([]);
  });
});
describe("explicit values only", () => {
  it.each([["PT30M", 30], ["PT1H20M", 80], ["PT2H", 120], ["PT0M", null], ["half hour", null], ["PT", null], ["P1Y", null]])("duration %s", (value, expected) => expect(parseDuration(value)).toBe(expected));
  it.each([["4", 4], [4, 4], ["4 servings", 4], ["4人份", 4], ["约4人份", 4], ["2-3人", null], ["一家人", null], ["4 cups", null]])("yield %s", (value, expected) => expect(parseYield(value)).toBe(expected));
  it.each([["520 kcal", 520], ["520 calories", 520], ["520千卡", 520], ["520", null], ["520-600 kcal", null], ["about 520", null]])("calories %s", (value, expected) => expect(parseCalories(value)).toBe(expected));
  it.each([
    ["500克 鸡翅", "鸡翅", "500克"], ["鸡翅 500克", "鸡翅", "500克"], ["盐适量", "盐", "适量"], ["一小把葱", "一小把葱", ""],
    ["2 cans crushed tomatoes", "crushed tomatoes", "2 cans"], ["a generous handful of parsley", "a generous handful of parsley", ""],
    ["牛肉（熟）200克", "牛肉（熟）", "200克"], ["一罐可乐", "一罐可乐", ""],
    ["2 green onions", "2 green onions", ""], ["1 lemon", "1 lemon", ""], ["100 grams rice", "100 grams rice", ""],
  ])("preserves ingredient %s", (line, name, amount) => expect(parseIngredientLine(line)).toEqual({ name, amount }));
});
