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

export function createFieldBindings(recipe: RecipeDetailsInput): IntakeFieldBindings {
  void recipe;
  throw new Error("G7 field bindings not implemented");
}

export function insertFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, index: number): IntakeFieldBindings {
  void bindings; void group; void index;
  throw new Error("G7 field bindings not implemented");
}

export function removeFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, index: number): IntakeFieldBindings {
  void bindings; void group; void index;
  throw new Error("G7 field bindings not implemented");
}

export function moveFieldBinding(bindings: IntakeFieldBindings, group: IntakeArrayGroup, from: number, to: number): IntakeFieldBindings {
  void bindings; void group; void from; void to;
  throw new Error("G7 field bindings not implemented");
}

export function resolveOriginalField(originalPath: string, bindings: IntakeFieldBindings): IntakeFieldResolution {
  void originalPath; void bindings;
  throw new Error("G7 field bindings not implemented");
}

export function currentFieldId(currentPath: string, bindings: IntakeFieldBindings): string {
  void currentPath; void bindings;
  throw new Error("G7 field bindings not implemented");
}
