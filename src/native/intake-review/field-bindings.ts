import type { RecipeDetailsInput } from "../recipe-model";

export type IntakeArrayGroup = "ingredients" | "steps" | "preparations" | "keyTips";

export type IntakeFieldBindings = {
  readonly originalRows: Readonly<Record<IntakeArrayGroup, readonly string[]>>;
  readonly currentRows: Readonly<Record<IntakeArrayGroup, readonly string[]>>;
  readonly nextRowKey: number;
};

export type IntakeFieldResolution = {
  readonly originalPath: string;
  readonly status: "located" | "removed" | "unlocatable" | "unknown";
  readonly currentPath: string | null;
  readonly fieldId: string;
  readonly rowKey?: string;
};

const groups: readonly IntakeArrayGroup[] = ["ingredients", "steps", "preparations", "keyTips"];
const scalarFields = new Set(["title", "totalMinutes", "servings", "caloriesPerServing", "coverPath", "notes"]);
const rowFields: Readonly<Record<IntakeArrayGroup, readonly string[]>> = {
  ingredients: ["name", "amount"],
  steps: ["instruction", "imagePath"],
  preparations: ["instruction", "minutes", "timingText"],
  keyTips: ["instruction", "stepNumber"],
};

function parseRowPath(path: string): { group: IntakeArrayGroup; index: number; field: string } | null {
  const match = /^(ingredients|steps|preparations|keyTips)\[(0|[1-9]\d*)\]\.([A-Za-z]+)$/.exec(path);
  if (!match) return null;
  const group = match[1] as IntakeArrayGroup;
  if (!rowFields[group].includes(match[3])) return null;
  return { group, index: Number(match[2]), field: match[3] };
}

function isWholeField(path: string): boolean {
  return scalarFields.has(path) || groups.some(group => group === path);
}

function rowFieldId(rowKey: string, field: string): string {
  return `field:${rowKey}:${field}`;
}

export function createFieldBindings(recipe: RecipeDetailsInput): IntakeFieldBindings {
  const originalRows = {
    ingredients: recipe.ingredients.map((_, index) => `ingredients:original:${index}`),
    steps: recipe.steps.map((_, index) => `steps:original:${index}`),
    preparations: recipe.preparations.map((_, index) => `preparations:original:${index}`),
    keyTips: recipe.keyTips.map((_, index) => `keyTips:original:${index}`),
  };
  return { originalRows, currentRows: { ...originalRows }, nextRowKey: 0 };
}

export function insertFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, index: number): IntakeFieldBindings {
  const rows = bindings.currentRows[group];
  if (!Number.isInteger(index) || index < 0 || index > rows.length) return bindings;
  const rowKey = `${group}:added:${bindings.nextRowKey}`;
  return {
    ...bindings,
    currentRows: { ...bindings.currentRows, [group]: [...rows.slice(0, index), rowKey, ...rows.slice(index)] },
    nextRowKey: bindings.nextRowKey + 1,
  };
}

export function removeFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, index: number): IntakeFieldBindings {
  const rows = bindings.currentRows[group];
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) return bindings;
  return { ...bindings, currentRows: { ...bindings.currentRows, [group]: rows.filter((_, rowIndex) => rowIndex !== index) } };
}

export function moveFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, from: number, to: number): IntakeFieldBindings {
  const rows = bindings.currentRows[group];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= rows.length || to >= rows.length || from === to) return bindings;
  const reordered = [...rows];
  const [row] = reordered.splice(from, 1);
  reordered.splice(to, 0, row);
  return { ...bindings, currentRows: { ...bindings.currentRows, [group]: reordered } };
}

export function resolveOriginalField(originalPath: string, bindings: IntakeFieldBindings): IntakeFieldResolution {
  if (isWholeField(originalPath)) return { originalPath, status: "located", currentPath: originalPath, fieldId: `field:${originalPath}` };
  const row = parseRowPath(originalPath);
  if (!row) return { originalPath, status: "unknown", currentPath: null, fieldId: `unknown:${originalPath}` };
  const rowKey = bindings.originalRows[row.group][row.index];
  if (!rowKey) return { originalPath, status: "unlocatable", currentPath: null, fieldId: `unlocatable:${originalPath}` };
  const index = bindings.currentRows[row.group].indexOf(rowKey);
  const fieldId = rowFieldId(rowKey, row.field);
  return index === -1
    ? { originalPath, status: "removed", currentPath: null, fieldId, rowKey }
    : { originalPath, status: "located", currentPath: `${row.group}[${index}].${row.field}`, fieldId, rowKey };
}

export function currentFieldId(currentPath: string, bindings: IntakeFieldBindings): string {
  if (isWholeField(currentPath)) return `field:${currentPath}`;
  const row = parseRowPath(currentPath);
  if (!row) return `unknown:${currentPath}`;
  const rowKey = bindings.currentRows[row.group][row.index];
  return rowKey ? rowFieldId(rowKey, row.field) : `unlocatable:${currentPath}`;
}
