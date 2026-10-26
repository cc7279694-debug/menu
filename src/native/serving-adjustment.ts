export type IngredientAmountAdjustment = {
  originalAmount: string;
  displayAmount: string;
  state: "original" | "scaled" | "unsupported" | "unavailable" | "unsafe";
  approximate: boolean;
};

// RED-stage placeholders: exports compile, but the new behavior is not present yet.
export function isValidTargetServings(value: unknown): value is number {
  void value;
  return false;
}

export function parseTargetServings(text: string): number | null {
  void text;
  return null;
}

export function adjustIngredientAmount(
  originalAmount: string,
  originalServings: number | null,
  targetServings: number | null,
): IngredientAmountAdjustment {
  void originalServings;
  void targetServings;
  return {
    originalAmount,
    displayAmount: originalAmount,
    state: "unavailable",
    approximate: false,
  };
}
