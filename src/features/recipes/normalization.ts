export function normalizeIngredientName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/gu, " ");
}
