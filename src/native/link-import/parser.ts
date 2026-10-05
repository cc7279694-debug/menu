import { load } from "cheerio/slim";
import { emptyDetails, recipeDetailsSchema, type RecipeDetailsInput } from "../recipe-model";
import type { ParsedPage, ParserQuality, RecipeCandidate } from "./contract";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const MAX_NODES = 4000;
const MAX_DEPTH = 32;
function warn(warnings: string[], message: string) { if (warnings.length < 20 && !warnings.includes(message)) warnings.push(message); }
export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  // Inert parsing only: never insert source markup into the live document.
  const $ = load(value); $("script,style,iframe,object,embed,form").remove();
  return $.root().text().replace(/\s+/gu, " ").trim();
}
export function parseDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/u.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return Number.isSafeInteger(minutes) && minutes > 0 && minutes <= 525600 ? minutes : null;
}
export function parseYield(value: unknown): number | null {
  const match = typeof value === "number" ? String(value) : typeof value === "string" ? /^(?:约\s*)?(\d+(?:\.\d+)?)\s*(?:servings?|人份|份|人)?$/iu.exec(value.trim())?.[1] : undefined;
  if (match === undefined) return null;
  const count = Number(match); return Number.isFinite(count) && count >= 0.1 && count <= 10000 ? count : null;
}
export function parseCalories(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)\s*(?:kcal|calories|千卡)$/iu.exec(value.trim());
  if (!match) return null;
  const calories = Number(match[1]); return Number.isFinite(calories) && calories <= 100000 ? calories : null;
}
export function parseIngredientLine(value: string): RecipeDetailsInput["ingredients"][number] {
  const line = plainText(value);
  const quantity = "\\d+(?:\\.\\d+)?\\s*(?:千克|公斤|毫升|克|斤|两|升|罐|个|勺|茶匙|汤匙|(?:kg|mg|ml|g|l|cups?|cans?|tbsp|tsp|oz|lbs?)(?![a-z]))";
  const prefix = new RegExp(`^(${quantity})\\s*(.+)$`, "iu").exec(line);
  const suffix = new RegExp(`^(.+?)\\s*(${quantity}|适量|少许)$`, "iu").exec(line);
  if (prefix?.[2].trim()) return { name: prefix[2].trim(), amount: prefix[1].trim() };
  if (suffix?.[1].trim()) return { name: suffix[1].trim(), amount: suffix[2].trim() };
  return { name: line, amount: "" };
}
function hasType(value: unknown, type: string): boolean {
  return (Array.isArray(value) ? value : [value]).some(item => typeof item === "string" && (item === type || item === `https://schema.org/${type}` || item === `http://schema.org/${type}`));
}
export function flattenInstructions(value: unknown, warnings: string[]): string[] {
  const result: string[] = []; let nodes = 0;
  const visit = (item: unknown, depth: number) => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH || result.length >= 300) { warn(warnings, "部分步骤超出安全解析上限，请检查。"); return; }
    if (Array.isArray(item)) { for (const child of item) visit(child, depth + 1); return; }
    if (typeof item === "string") {
      const instruction = plainText(item);
      if (instruction && instruction.length <= 10000) result.push(instruction);
      else warn(warnings, "已跳过无法读取的步骤，请检查。");
      return;
    }
    const object = record(item);
    if (object && hasType(object["@type"], "HowToSection")) { visit(object.itemListElement, depth + 1); return; }
    if (object && hasType(object["@type"], "HowToStep") && typeof object.text === "string") { visit(object.text, depth + 1); return; }
    if (item !== undefined) warn(warnings, "已跳过无法读取的步骤，请检查。");
  };
  visit(value, 0); return result;
}
export function candidateQuality(recipe: RecipeDetailsInput): ParserQuality {
  return !recipe.title || (!recipe.ingredients.length && !recipe.steps.length) ? "none" : recipe.ingredients.length && recipe.steps.length ? "complete" : "partial";
}
function matchesPage(value: unknown, finalUrl: string): boolean {
  const object = record(value);
  const address = typeof value === "string" ? value : object?.["@id"];
  if (typeof address !== "string") return false;
  try { const source = new URL(address, finalUrl); const target = new URL(finalUrl); source.hash = ""; target.hash = ""; return source.href === target.href; } catch { return false; }
}
function candidate(object: Record<string, unknown>, finalUrl: string, order: number): RecipeCandidate | null {
  const title = plainText(object.name); if (!title || title.length > 120) return null;
  const warnings: string[] = [];
  const ingredients: RecipeDetailsInput["ingredients"] = [];
  if (Array.isArray(object.recipeIngredient)) {
    for (const line of object.recipeIngredient.slice(0, 300)) {
      if (typeof line !== "string") { warn(warnings, "已跳过无法读取的食材，请检查。"); continue; }
      const item = parseIngredientLine(line);
      if (item.name && item.name.length <= 10000 && item.amount.length <= 500) ingredients.push(item);
      else warn(warnings, "已跳过无法读取的食材，请检查。");
    }
    if (object.recipeIngredient.length > 300) warn(warnings, "部分食材超出安全解析上限，请检查。");
  }
  const prep = parseDuration(object.prepTime), cook = parseDuration(object.cookTime);
  const totalMinutes = parseDuration(object.totalTime) ?? (prep !== null && cook !== null && prep + cook <= 525600 ? prep + cook : null);
  const recipe: RecipeDetailsInput = {
    ...emptyDetails(title), totalMinutes, servings: parseYield(object.recipeYield), caloriesPerServing: parseCalories(record(object.nutrition)?.calories), ingredients,
    steps: flattenInstructions(object.recipeInstructions, warnings).map(instruction => ({ instruction, imagePath: null })),
  };
  const quality = candidateQuality(recipe);
  if (quality === "none" || !recipeDetailsSchema.safeParse(recipe).success) return null;
  const thresholds = (count: number) => [1, 3, 6].filter(limit => count >= limit).length * 10;
  const score = 20 + thresholds(ingredients.length) + thresholds(recipe.steps.length)
    + [recipe.totalMinutes, recipe.servings, recipe.caloriesPerServing].filter(item => item !== null).length * 5
    + (matchesPage(object.url, finalUrl) || matchesPage(object["@id"], finalUrl) || matchesPage(object.mainEntityOfPage, finalUrl) ? 5 : 0);
  if (quality === "partial") warn(warnings, "网页只提供部分菜谱，请补齐缺失内容。");
  return { id: `candidate-${order}`, recipe, quality, score, documentOrder: order, warnings };
}
export function parseRecipePage(html: string, finalUrl: string): ParsedPage {
  const $ = load(html); const candidates: RecipeCandidate[] = [], warnings: string[] = [];
  let nodes = 0, order = 0;
  const visit = (value: unknown, depth: number) => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH || candidates.length >= 100) { warn(warnings, "网页结构超出安全解析上限，请检查结果。"); return; }
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    const object = record(value); if (!object) return;
    if (hasType(object["@type"], "Recipe")) { const parsed = candidate(object, finalUrl, order++); if (parsed) candidates.push(parsed); }
    for (const item of Object.values(object)) if (item !== null && typeof item === "object") visit(item, depth + 1);
  };
  $("script").each((_, element) => {
    if (!/^application\/ld\+json(?:\s*;.*)?$/iu.test($(element).attr("type")?.trim() ?? "")) return;
    try { const value: unknown = JSON.parse($(element).text()); visit(value, 0); }
    catch { warn(warnings, "部分网页结构无法解析，已继续读取其他菜谱信息。"); }
  });
  candidates.sort((a, b) => b.score - a.score || b.recipe.ingredients.length - a.recipe.ingredients.length || b.recipe.steps.length - a.recipe.steps.length || a.documentOrder - b.documentOrder);
  const complete = candidates.filter(item => item.quality === "complete");
  return { candidates, needsSelection: complete.length >= 2 && complete[0].score - complete[1].score <= 10, title: plainText($("title").first().text() || $("h1").first().text()), warnings };
}
