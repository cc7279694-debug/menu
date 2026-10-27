import type { AiFieldCheck } from "../ai/contract";
import type { RecipeDetailsInput } from "../recipe-model";
import type { IntakeFieldBindings, IntakeFieldResolution } from "./field-bindings";

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

export function buildIntakeQualityReport(input: IntakeQualityInput): IntakeQualityReport {
  void input;
  throw new Error("G7 intake quality not implemented");
}
