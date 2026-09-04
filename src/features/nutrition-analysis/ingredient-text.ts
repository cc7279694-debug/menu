import type { RecipeSaveInput } from "@/features/recipes/schemas";

type RecipeIngredientForNutrition = Pick<
  RecipeSaveInput["ingredients"][number],
  "name" | "quantity" | "quantityText" | "unit" | "preparationNote"
>;

function formatAmount(ingredient: RecipeIngredientForNutrition): string | null {
  if (ingredient.quantity !== null && ingredient.quantity !== undefined && Number.isFinite(ingredient.quantity)) {
    return `${ingredient.quantity}${ingredient.unit?.trim() ?? ""}`;
  }
  const quantityText = ingredient.quantityText?.trim();
  return quantityText || null;
}

export function buildRecipeIngredientText(ingredients: RecipeIngredientForNutrition[]): string {
  return ingredients
    .map((ingredient) => {
      const name = ingredient.name.trim();
      if (!name) return null;
      const amount = formatAmount(ingredient);
      const note = ingredient.preparationNote?.trim();
      return `${name}${amount ? ` ${amount}` : ""}${note ? `（${note}）` : ""}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
