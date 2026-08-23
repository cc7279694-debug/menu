export type CookingStepIngredient = {
  recipeIngredientId: string;
  name: string;
  amount: string;
  preparationNote: string | null;
  linkNote: string | null;
};

export type CookingRecipe = {
  id?: string;
  updatedAt?: string;
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
    sortOrder?: number;
    ingredientLinks: Array<{
      recipeIngredientId: string;
      quantityOverride: number | null;
      quantityTextOverride: string | null;
      note: string | null;
    }>;
  }>;
};

export type CookingSessionRecipe = Omit<CookingRecipe, "id" | "updatedAt" | "steps"> & {
  id: string;
  updatedAt: string;
  steps: Array<CookingRecipe["steps"][number] & { sortOrder: number }>;
};

export type CookingTimer = {
  stepId: string;
  label: string;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  notifiedAt: number | null;
};

export type CookingTimerView = CookingTimer & {
  remainingSeconds: number;
  status: "running" | "finished";
};

export type CookingSessionV1 = {
  version: 1;
  recipeId: string;
  recipeUpdatedAt: string;
  targetServings: number;
  currentStepId: string;
  timers: CookingTimer[];
  startedAt: number;
  updatedAt: number;
};
