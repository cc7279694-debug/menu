export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  baseServings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  isFavorite: boolean;
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string }>;
  updatedAt: string;
};

export type RecipeListResult = {
  items: RecipeSummary[];
  totalCount: number;
};

export type RecipeDetail = RecipeSummary & {
  personalNotes: string | null;
  coverPath: string | null;
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
    instruction: string;
    imagePath: string | null;
    imageUrl: string | null;
    timerSeconds: number | null;
    sortOrder: number;
    ingredientLinks: Array<{
      recipeIngredientId: string;
      quantityOverride: number | null;
      quantityTextOverride: string | null;
      note: string | null;
    }>;
  }>;
};
