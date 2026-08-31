import {
  recipeImportDraftModelSchema,
  recipeImportDraftSchema,
  type RecipeImportDraft,
  type RecipeImportFieldCheck,
  type RecipeImportFieldStatus,
  type RecipeImportModelDraft,
} from "@/features/recipe-imports/schemas";

const rootPaths = new Set([
  "title",
  "baseServings",
  "prepMinutes",
  "cookMinutes",
  "suggestedCategoryName",
  "suggestedTagNames",
]);

const indexedFields = {
  ingredients: new Set(["quantity", "quantityText", "unit", "groupType", "preparationNote"]),
  steps: new Set(["heatLevel", "timerSeconds", "ingredientNames"]),
  preparations: new Set(["leadTimeMinutes", "timingText"]),
} as const;

const statusRank: Record<RecipeImportFieldStatus, number> = {
  explicit: 0,
  inferred: 1,
  missing: 2,
};

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function parseIndexedPath(path: string): { collection: keyof typeof indexedFields; index: number; field: string } | null {
  const match = /^(ingredients|steps|preparations)\.(\d+)\.([a-zA-Z][a-zA-Z0-9]*)$/.exec(path);
  if (!match) return null;
  const collection = match[1] as keyof typeof indexedFields;
  const index = Number(match[2]);
  const field = match[3]!;
  return Number.isInteger(index) && index >= 0 && indexedFields[collection].has(field)
    ? { collection, index, field }
    : null;
}

function fieldLabel(draft: RecipeImportModelDraft, path: string): string {
  const rootLabels: Record<string, string> = {
    title: "菜谱名称",
    baseServings: "基础份数",
    prepMinutes: "总准备时间",
    cookMinutes: "总烹饪时间",
    suggestedCategoryName: "建议分类",
    suggestedTagNames: "建议标签",
  };
  if (rootLabels[path]) return rootLabels[path];
  const parsed = parseIndexedPath(path);
  if (!parsed) return "待确认字段";
  const item = draft[parsed.collection][parsed.index] as Record<string, unknown> | undefined;
  if (parsed.collection === "ingredients") {
    const name = typeof item?.name === "string" ? item.name : `第 ${parsed.index + 1} 项食材`;
    return `${name}的${parsed.field === "quantity" ? "数字用量" : parsed.field === "quantityText" ? "文字用量" : parsed.field === "unit" ? "单位" : parsed.field === "groupType" ? "分组" : "处理说明"}`;
  }
  if (parsed.collection === "steps") {
    return `第 ${parsed.index + 1} 步${parsed.field === "heatLevel" ? "火候" : parsed.field === "timerSeconds" ? "计时" : "关联食材"}`;
  }
  return `第 ${parsed.index + 1} 项提前准备${parsed.field === "leadTimeMinutes" ? "精确时间" : "文字时间"}`;
}

function defaultStatus(value: unknown): RecipeImportFieldStatus {
  return hasValue(value) ? "inferred" : "missing";
}

function checkMessage(status: RecipeImportFieldStatus, label: string, message: string | null): string {
  if (message?.trim()) return message.trim();
  if (status === "missing") return `来源未明确提供${label}，请确认后补充。`;
  if (status === "inferred") return `${label}可能由 AI 根据上下文整理，请检查。`;
  return "来源中已识别到该信息，请核对原文或画面。";
}

function compareChecks(a: RecipeImportFieldCheck, b: RecipeImportFieldCheck): number {
  const statusDifference = statusRank[b.status] - statusRank[a.status];
  return statusDifference || a.path.localeCompare(b.path, "zh-CN");
}

function createMissingChecks(draft: RecipeImportModelDraft, checks: RecipeImportFieldCheck[]): RecipeImportFieldCheck[] {
  const known = new Set(checks.map((check) => check.path));
  const additions: RecipeImportFieldCheck[] = [];
  const add = (path: string, value: unknown) => {
    if (known.has(path)) return;
    const status = defaultStatus(value);
    additions.push({ path, status, label: fieldLabel(draft, path), message: null });
    known.add(path);
  };

  add("prepMinutes", draft.prepMinutes);
  add("cookMinutes", draft.cookMinutes);
  draft.ingredients.forEach((ingredient, index) => {
    const amountPath = `ingredients.${index}.quantity`;
    if (!hasValue(ingredient.quantity) && !hasValue(ingredient.quantityText)) add(amountPath, null);
    if (hasValue(ingredient.quantity) && !hasValue(ingredient.unit)) add(`ingredients.${index}.unit`, null);
  });
  draft.steps.forEach((step, index) => {
    add(`steps.${index}.heatLevel`, step.heatLevel);
    add(`steps.${index}.timerSeconds`, step.timerSeconds);
  });
  draft.preparations.forEach((preparation, index) => {
    if (!hasValue(preparation.leadTimeMinutes) && !hasValue(preparation.timingText)) add(`preparations.${index}.leadTimeMinutes`, null);
  });
  if (draft.suggestedCategoryName) add("suggestedCategoryName", draft.suggestedCategoryName);
  if (draft.suggestedTagNames.length) add("suggestedTagNames", draft.suggestedTagNames);
  return additions;
}

export function isRecipeImportFieldPath(path: string, draft: RecipeImportModelDraft): boolean {
  if (rootPaths.has(path)) return true;
  const parsed = parseIndexedPath(path);
  return Boolean(parsed && parsed.index < draft[parsed.collection].length);
}

export function buildRecipeImportQualityDraft(model: RecipeImportModelDraft): RecipeImportDraft {
  const initialChecks = model.fieldChecks
    .filter((check) => isRecipeImportFieldPath(check.path, model))
    .map((check) => ({
      ...check,
      label: fieldLabel(model, check.path),
      message: check.message?.trim() || null,
    }));
  const checksByPath = new Map<string, RecipeImportFieldCheck>();
  [...initialChecks, ...createMissingChecks(model, initialChecks)].forEach((check) => {
    const current = checksByPath.get(check.path);
    if (!current || statusRank[check.status] > statusRank[current.status]) checksByPath.set(check.path, check);
  });

  const fieldChecks = [...checksByPath.values()]
    .sort(compareChecks)
    .map((check) => ({
      ...check,
      message: checkMessage(check.status, check.label, check.message),
    }))
    .slice(0, 300);

  const normalized = {
    ...model,
    ingredients: model.ingredients.map((ingredient, index) => {
      const quantityCheck = checksByPath.get(`ingredients.${index}.quantity`);
      const unitCheck = checksByPath.get(`ingredients.${index}.unit`);
      return {
        ...ingredient,
        quantity: quantityCheck && quantityCheck.status !== "explicit" ? null : ingredient.quantity,
        unit: unitCheck && unitCheck.status === "missing" ? null : ingredient.unit,
      };
    }),
    prepMinutes: checksByPath.get("prepMinutes")?.status === "explicit" ? model.prepMinutes : null,
    cookMinutes: checksByPath.get("cookMinutes")?.status === "explicit" ? model.cookMinutes : null,
    steps: model.steps.map((step, index) => ({
      ...step,
      timerSeconds: checksByPath.get(`steps.${index}.timerSeconds`)?.status === "explicit" ? step.timerSeconds : null,
      heatLevel: checksByPath.get(`steps.${index}.heatLevel`)?.status === "missing" ? null : step.heatLevel,
    })),
    preparations: model.preparations.map((preparation, index) => ({
      ...preparation,
      leadTimeMinutes: checksByPath.get(`preparations.${index}.leadTimeMinutes`)?.status === "explicit" ? preparation.leadTimeMinutes : null,
    })),
  };

  const warnings = [...new Set([
    ...model.warnings,
    ...fieldChecks
      .filter((check) => check.status !== "explicit")
      .map((check) => `${check.label}：${check.message}`),
  ])].slice(0, 20);

  return {
    ...normalized,
    warnings,
    review: {
      fieldChecks,
      requiresConfirmation: fieldChecks.some((check) => check.status !== "explicit"),
      confirmedAt: null,
    },
  };
}

export function parseStoredRecipeImportDraft(value: unknown): RecipeImportDraft | null {
  const stored = recipeImportDraftSchema.safeParse(value);
  if (stored.success) return stored.data;
  const legacy = recipeImportDraftModelSchema.safeParse(value);
  return legacy.success ? buildRecipeImportQualityDraft(legacy.data) : null;
}
