import type { ActionResult } from "@/features/recipes/types";

export type ShoppingActionResult<T> = ActionResult<T>;

export type ShoppingRecipeSelection = {
  recipeId: string;
  selectedServings: number;
};

export type ShoppingGenerationInput = {
  selections: ShoppingRecipeSelection[];
  excludedRecipeIngredientIds: string[];
};

export type ShoppingGenerationRecipeIngredient = {
  recipeIngredientId: string;
  ingredientId: string | null;
  name: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  aisle: string | null;
  sortOrder: number;
};

export type ShoppingGenerationRecipe = {
  id: string;
  title: string;
  baseServings: number;
  ingredients: ShoppingGenerationRecipeIngredient[];
};

export type ShoppingContribution = {
  recipeId: string;
  recipeTitleSnapshot: string;
  selectedServings: number;
  recipeOrder: number;
  recipeIngredientId: string;
  ingredientId: string | null;
  nameSnapshot: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  normalizedUnit: string | null;
  aisle: string | null;
  recipeIngredientOrder: number;
  isManual: boolean;
};

export type ShoppingDraftItemSource = {
  recipeId: string;
  recipeTitleSnapshot: string;
  selectedServings: number;
  recipeIngredientId: string | null;
  quantityContribution: number | null;
  quantityTextContribution: string | null;
  unitSnapshot: string | null;
  aisleSnapshot: string | null;
  recipeOrder: number;
  recipeIngredientOrder: number;
};

export type ShoppingDraftItem = {
  ingredientId: string | null;
  nameSnapshot: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  aisle: string | null;
  isManual: boolean;
  sortOrder: number;
  sources: ShoppingDraftItemSource[];
};
