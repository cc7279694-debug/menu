export type LocalRecipeNutrition = {
  caloriesKcal: number | null;
  proteinGrams: number | null;
  fatGrams: number | null;
  carbsGrams: number | null;
  isEstimated: boolean;
};

export type LocalRecipeIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  preparationNote: string | null;
  groupType?: "main" | "seasoning" | "other";
  sortOrder: number;
};

export type LocalRecipeStep = {
  id: string;
  instruction: string;
  imagePath: string | null;
  imageUrl: string | null;
  timerSeconds: number | null;
  heatLevel?: string | null;
  sortOrder: number;
  ingredientLinks: Array<{
    recipeIngredientId: string;
    quantityOverride: number | null;
    quantityTextOverride: string | null;
    note: string | null;
  }>;
};

export type LocalRecipePreparation = {
  id: string;
  recipeIngredientId: string | null;
  ingredientName: string | null;
  instruction: string;
  leadTimeMinutes: number | null;
  timingText: string | null;
  sortOrder: number;
};

export type LocalRecipePayload = {
  title: string;
  description: string | null;
  categoryId: string | null;
  tagIds: string[];
  coverPath: string | null;
  baseServings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  personalNotes: string | null;
  nutrition: LocalRecipeNutrition | null;
  ingredients: LocalRecipeIngredient[];
  steps: LocalRecipeStep[];
  preparations: LocalRecipePreparation[];
  source?: {
    sourceType: "url" | "text" | "images";
    sourceUrl: string | null;
    sourceTitle: string | null;
    sourceAuthor: string | null;
    sourcePlatform: string | null;
  } | null;
};

export type LocalRecipeRecord = LocalRecipePayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LocalRecipeWriteInput = LocalRecipePayload & {
  id?: string;
};
