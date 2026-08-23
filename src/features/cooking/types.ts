export type CookingStepIngredient = {
  recipeIngredientId: string;
  name: string;
  amount: string;
  preparationNote: string | null;
  linkNote: string | null;
};

export type CookingRecipe = {
  baseServings: number;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    preparationNote: string | null;
    sortOrder: number;
  }>;
  steps: Array<{
    id: string;
    ingredientLinks: Array<{
      recipeIngredientId: string;
      quantityOverride: number | null;
      quantityTextOverride: string | null;
      note: string | null;
    }>;
  }>;
};
