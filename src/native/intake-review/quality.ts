import type { AiFieldCheck } from "../ai/contract";
import { recipeDetailsSchema, type RecipeDetailsInput } from "../recipe-model";
import { currentFieldId, resolveOriginalField, type IntakeArrayGroup, type IntakeFieldBindings, type IntakeFieldResolution } from "./field-bindings";

export type IntakeEditState = "unchanged" | "filled" | "edited" | "removed" | "unlocatable";

export type IntakeEvidence = {
  readonly id: string;
  readonly check: Readonly<AiFieldCheck>;
  readonly mapping: IntakeFieldResolution;
  readonly currentState: IntakeEditState;
};

export type IntakeQualityIssue = {
  id: string;
  priority: "error" | "missing" | "source";
  currentPath: string | null;
  label: string;
  reasons: string[];
  evidence: IntakeEvidence[];
};

export type IntakeQualityReport = {
  summary: { ingredientCount: number; stepCount: number; preparationCount: number; keyTipCount: number; servings: number | null };
  issues: IntakeQualityIssue[];
  originalChecks: IntakeEvidence[];
  warnings: readonly string[];
  canSave: boolean;
};

export type IntakeQualityInput = {
  currentRecipe: RecipeDetailsInput;
  originalRecipe?: RecipeDetailsInput;
  originalFieldChecks?: readonly Readonly<AiFieldCheck>[];
  warnings?: readonly string[];
  fieldBindings: IntakeFieldBindings;
  mode: "manual" | "parser" | "ai";
};

const priorityRank = { error: 0, missing: 1, source: 2 };
const fieldOrder = ["title", "totalMinutes", "servings", "caloriesPerServing", "coverPath", "ingredients", "steps", "preparations", "keyTips", "notes"];
const rowFieldOrder: Readonly<Record<IntakeArrayGroup, readonly string[]>> = {
  ingredients: ["name", "amount"],
  steps: ["instruction", "imagePath"],
  preparations: ["instruction", "minutes", "timingText"],
  keyTips: ["instruction", "stepNumber"],
};
const wholeLabels: Readonly<Record<string, string>> = {
  title: "菜名", totalMinutes: "总耗时", servings: "原始份量", caloriesPerServing: "每份参考热量", coverPath: "封面照片", notes: "个人备注",
  ingredients: "食材", steps: "步骤", preparations: "提前准备", keyTips: "关键事项",
};
const rowLabels: Readonly<Record<string, string>> = { name: "名称", amount: "用量", instruction: "内容", imagePath: "图片", minutes: "分钟", timingText: "时间提示", stepNumber: "关联步骤" };

function pathLabel(path: string): string {
  const row = /^(ingredients|steps|preparations|keyTips)\[(\d+)\]\.(\w+)$/.exec(path);
  return row ? `${wholeLabels[row[1]]} ${Number(row[2]) + 1}${rowLabels[row[3]] ?? row[3]}` : wholeLabels[path] ?? path;
}

function readField(recipe: RecipeDetailsInput, path: string): { found: boolean; value: unknown } {
  if (fieldOrder.includes(path)) return { found: true, value: recipe[path as keyof RecipeDetailsInput] };
  const row = /^(ingredients|steps|preparations|keyTips)\[(0|[1-9]\d*)\]\.([A-Za-z]+)$/.exec(path);
  if (!row) return { found: false, value: undefined };
  const group = row[1] as IntakeArrayGroup;
  if (!rowFieldOrder[group].includes(row[3])) return { found: false, value: undefined };
  const record = recipe[group][Number(row[2])];
  return record && Object.prototype.hasOwnProperty.call(record, row[3])
    ? { found: true, value: (record as unknown as Record<string, unknown>)[row[3]] }
    : { found: false, value: undefined };
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>, rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length && keys.every(key => Object.prototype.hasOwnProperty.call(rightRecord, key) && sameValue(leftRecord[key], rightRecord[key]));
}

function editState(input: IntakeQualityInput, mapping: IntakeFieldResolution): IntakeEditState {
  if (mapping.status === "removed") return "removed";
  if (mapping.status !== "located" || mapping.currentPath === null || !input.originalRecipe) return "unlocatable";
  const original = readField(input.originalRecipe, mapping.originalPath), current = readField(input.currentRecipe, mapping.currentPath);
  if (!original.found || !current.found) return "unlocatable";
  if (sameValue(original.value, current.value)) return "unchanged";
  return isEmpty(original.value) && !isEmpty(current.value) ? "filled" : "edited";
}

function sourceReason(evidence: IntakeEvidence): string {
  if (evidence.currentState === "unlocatable") return "原审核字段无法安全定位，请查看原审核信息并对照来源。";
  if (evidence.check.status === "explicit") return "原结果来源明确；当前值已人工修改，尚未重新核对来源。";
  if (evidence.check.status === "inferred") return evidence.currentState === "edited" || evidence.currentState === "filled"
    ? "原结果为 AI 推断；当前值已人工修改，尚未重新核对来源。"
    : "原结果为 AI 推断，请对照来源核对。";
  return evidence.currentState === "filled" ? "原结果标为缺失；当前已填写，尚未重新核对来源。"
    : evidence.currentState === "edited" ? "原结果标为缺失；当前值已人工修改，尚未重新核对来源。"
      : "原结果缺失待确认，请按实际情况核对。";
}

function pathOrder(path: string | null): readonly [number, number, number] {
  if (path === null) return [fieldOrder.length, 0, 0];
  const row = /^(ingredients|steps|preparations|keyTips)\[(\d+)\]\.(\w+)$/.exec(path);
  if (!row) {
    const index = fieldOrder.indexOf(path);
    return [index === -1 ? fieldOrder.length : index, -1, -1];
  }
  return [fieldOrder.indexOf(row[1]), Number(row[2]), rowFieldOrder[row[1] as IntakeArrayGroup].indexOf(row[3])];
}

export function buildIntakeQualityReport(input: IntakeQualityInput): IntakeQualityReport {
  const current = input.currentRecipe;
  const validation = recipeDetailsSchema.safeParse(current);
  const issues = new Map<string, IntakeQualityIssue>();
  function addIssue(id: string, currentPath: string | null, priority: IntakeQualityIssue["priority"], label: string, reason: string, evidence?: IntakeEvidence) {
    const existing = issues.get(id);
    if (existing) {
      if (priorityRank[priority] < priorityRank[existing.priority]) existing.priority = priority;
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      if (evidence && !existing.evidence.some(item => item.id === evidence.id)) existing.evidence.push(evidence);
    } else issues.set(id, { id, currentPath, priority, label, reasons: [reason], evidence: evidence ? [evidence] : [] });
  }
  function currentIssue(path: string, priority: IntakeQualityIssue["priority"], reason: string) {
    addIssue(currentFieldId(path, input.fieldBindings), path, priority, pathLabel(path), reason);
  }

  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const path = issue.path.reduce<string>((result, part) => typeof part === "number" ? `${result}[${part}]` : result ? `${result}.${String(part)}` : String(part), "");
      currentIssue(path, "error", issue.message);
    }
  }
  if (current.servings === null) currentIssue("servings", "missing", "原始份量未填写，暂时不能使用人份换算。");
  if (current.ingredients.length === 0) currentIssue("ingredients", "missing", "还没有食材，可以按实际情况补充。");
  if (current.steps.length === 0) currentIssue("steps", "missing", "还没有步骤，可以按实际情况补充。");
  current.ingredients.forEach((ingredient, index) => {
    if (ingredient.name.trim() && !ingredient.amount.trim()) currentIssue(`ingredients[${index}].amount`, "missing", "已填写食材名称，用量尚未填写；可保留适量、少许等来源文字。");
  });

  const originalChecks = (input.originalFieldChecks ?? []).map((check, index): IntakeEvidence => {
    const mapping = resolveOriginalField(check.path, input.fieldBindings);
    return { id: `${check.path}#${index}`, check, mapping, currentState: editState(input, mapping) };
  });
  for (const evidence of originalChecks) {
    if (evidence.currentState === "removed" || (evidence.check.status === "explicit" && evidence.currentState === "unchanged")) continue;
    const { mapping } = evidence;
    const path = mapping.currentPath;
    const label = path === null ? evidence.check.label || evidence.check.path : pathLabel(path);
    addIssue(mapping.fieldId, path, "source", label, sourceReason(evidence), evidence);
    if (evidence.check.message) addIssue(mapping.fieldId, path, "source", label, evidence.check.message);
  }

  const sorted = [...issues.values()].sort((left, right) => {
    const priority = priorityRank[left.priority] - priorityRank[right.priority];
    if (priority !== 0) return priority;
    const leftOrder = pathOrder(left.currentPath), rightOrder = pathOrder(right.currentPath);
    for (let index = 0; index < leftOrder.length; index++) {
      if (leftOrder[index] !== rightOrder[index]) return leftOrder[index] - rightOrder[index];
    }
    return 0;
  });
  return {
    summary: { ingredientCount: current.ingredients.length, stepCount: current.steps.length, preparationCount: current.preparations.length, keyTipCount: current.keyTips.length, servings: current.servings },
    issues: sorted,
    originalChecks,
    warnings: input.warnings ? [...input.warnings] : [],
    canSave: validation.success,
  };
}
