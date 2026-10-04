import { recipeDetailsSchema, type RecipeDetailsInput } from "../recipe-model";
import { AI_LIMITS, aiModelOutputSchema, type AiFieldCheck, type AiModelOutput, type AiReviewDraft, type AiSourceContext } from "./contract";

const rank = { explicit: 0, inferred: 1, missing: 2 };
const vagueTime = /一会[儿兒]?|片刻|提前一晚|过夜|隔夜|若干|适当时间|overnight|a while/i;
const injection = /忽略.{0,16}(指令|规则)|(?:输出|泄露|显示).{0,8}(?:API\s*Key|密钥|system\s*prompt)|<script\b|```(?:js|sql|python)|(?:DELETE|DROP)\s+(?:TABLE|FROM)/i;
const compact = (value: string) => value.replace(/\s+/g, "");
function hasSourceNumber(text:string,value:number,units:string):boolean {
  const token=String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(?:^|[^\\d.])${token}\\s*(?:${units})`,"i").test(text);
}
function fields(recipe: RecipeDetailsInput): Array<{ path: string; label: string; value: unknown }> {
  const result: Array<{ path: string; label: string; value: unknown }> = [
    { path: "title", label: "菜名", value: recipe.title }, { path: "totalMinutes", label: "总耗时", value: recipe.totalMinutes },
    { path: "servings", label: "份数", value: recipe.servings }, { path: "caloriesPerServing", label: "每份参考热量", value: recipe.caloriesPerServing },
  ];
  if (recipe.notes) result.push({ path: "notes", label: "备注", value: recipe.notes });
  for (const group of ["ingredients", "steps", "preparations", "keyTips"] as const) {
    const keys = group === "ingredients" ? ["name", "amount"] : group === "steps" ? ["instruction"] : group === "preparations" ? ["instruction", "minutes", "timingText"] : ["instruction", "stepNumber"];
    const groupLabel = { ingredients: "食材", steps: "步骤", preparations: "提前准备", keyTips: "关键事项" }[group];
    const keyLabels: Record<string, string> = { name: "名称", amount: "用量", instruction: "内容", minutes: "分钟", timingText: "时间提示", stepNumber: "关联步骤" };
    recipe[group].forEach((item, index) => keys.forEach(key => result.push({ path: `${group}[${index}].${key}`, label: `${groupLabel}${index + 1}${keyLabels[key]}`, value: (item as unknown as Record<string, unknown>)[key] })));
    if ((group === "ingredients" || group === "steps") && recipe[group].length === 0) result.push({ path: group, label: `${groupLabel}未提供`, value: null });
  }
  return result;
}
function sourceAmount(name: string, text: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const vague = "适量|少许|一包|一小撮|按口味";
  return text.match(new RegExp(`${escaped}\\s*(${vague})`))?.[1] ?? text.match(new RegExp(`(${vague})\\s*${escaped}`))?.[1] ?? null;
}
export function normalizeAiDraft(checked: AiModelOutput, source: AiSourceContext): AiReviewDraft {
  const recipe: RecipeDetailsInput = { ...checked.recipe, ingredients: checked.recipe.ingredients.map(i => ({ ...i })), steps: checked.recipe.steps.map(i => ({ ...i })), preparations: checked.recipe.preparations.map(i => ({ ...i })), keyTips: checked.recipe.keyTips.map(i => ({ ...i })) };
  const warnings = [...checked.warnings];
  const allowed = new Set(fields(recipe).map(f => f.path));
  const declared = new Map<string, AiFieldCheck>();
  for (const check of checked.fieldChecks) {
    if (!allowed.has(check.path)) continue;
    const previous = declared.get(check.path);
    if (!previous || rank[check.status] > rank[previous.status]) declared.set(check.path, check);
  }
  const override = new Map<string, AiFieldCheck["status"]>();
  const sourceText = compact(source.text);
  recipe.ingredients.forEach((item, index) => {
    const path = `ingredients[${index}].amount`;
    const original = sourceAmount(item.name, source.text);
    if (original && original !== item.amount) {
      item.amount = original; override.set(path, "inferred");
      warnings.push(`食材${index + 1}用量已保留来源文字，请核对。`);
    } else if (!source.hasImages && item.amount && /\d/.test(item.amount) && !sourceText.includes(compact(`${item.name}${item.amount}`)) && !sourceText.includes(compact(`${item.amount}${item.name}`))) {
      item.amount = ""; override.set(path, "missing");
      warnings.push(`食材${index + 1}数量无法在文字来源核对，已留空。`);
    }
  });
  recipe.preparations.forEach((prep, index) => {
    const path = `preparations[${index}].minutes`;
    if (declared.get(path)?.status !== "explicit" || vagueTime.test(`${prep.instruction} ${prep.timingText ?? ""}`) || (!source.hasImages && prep.minutes !== null && !hasSourceNumber(source.text,prep.minutes,"分钟|分|min"))) prep.minutes = null;
  });
  if (declared.get("totalMinutes")?.status !== "explicit" || (!source.hasImages && recipe.totalMinutes !== null && !hasSourceNumber(source.text,recipe.totalMinutes,"分钟|分|min"))) recipe.totalMinutes = null;
  if (recipe.servings !== null && (!source.hasImages && !hasSourceNumber(source.text,recipe.servings,"份|人"))) override.set("servings", "inferred");
  if (recipe.caloriesPerServing !== null) {
    if (recipe.servings === null || recipe.ingredients.length === 0 || recipe.ingredients.some(item => !item.amount)) recipe.caloriesPerServing = null;
    else override.set("caloriesPerServing", "inferred");
  }
  const fieldChecks = fields(recipe).map(({ path, label, value }): AiFieldCheck => {
    const check = declared.get(path);
    let status: AiFieldCheck["status"] = override.get(path) ?? check?.status ?? "inferred";
    if (value === null || value === "") status = "missing";
    else if (!source.hasImages && typeof value === "string" && !sourceText.includes(compact(value)) && status === "explicit") status = "inferred";
    return { path, label, status, message: check?.message ?? (status === "missing" ? "来源信息不足，请检查。" : status === "inferred" ? "尚未能在来源中明确核对，请检查。" : null) };
  });
  if (injection.test([recipe.title, recipe.notes, ...recipe.ingredients.flatMap(i => [i.name, i.amount]), ...recipe.steps.map(s => s.instruction), ...recipe.preparations.map(p => p.instruction), ...recipe.keyTips.map(k => k.instruction)].join("\n"))) throw new Error("invalid_output");
  return { recipe: recipeDetailsSchema.parse(recipe), review: { fieldChecks, requiresConfirmation: fieldChecks.some(check => check.status !== "explicit") }, warnings: [...new Set(warnings)] };
}
export function parseAiDraft(rawJson: string, source: AiSourceContext): AiReviewDraft {
  if (new TextEncoder().encode(rawJson).byteLength > AI_LIMITS.responseBytes) throw new Error("response_too_large");
  let parsed: unknown;
  try { parsed = JSON.parse(rawJson); } catch { throw new Error("invalid_output"); }
  const checked = aiModelOutputSchema.safeParse(parsed);
  if (!checked.success) throw new Error("invalid_output");
  return normalizeAiDraft(checked.data, source);
}
