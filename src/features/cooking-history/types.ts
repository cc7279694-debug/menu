import type { ActionResult } from "@/features/recipes/types";

export type CookingRecordPhoto = {
  id: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type CookingRecordSummary = {
  id: string;
  recipeId: string | null;
  recipeTitleSnapshot: string;
  mealPlanEntryId: string | null;
  startedAt: string;
  completedAt: string;
  actualServings: number;
  rating: number | null;
  improvementNotes: string | null;
  photos: CookingRecordPhoto[];
};

export type CookingHistoryStats = {
  totalCount: number;
  ratedCount: number;
  averageRating: number | null;
  latestImprovementNotes: string | null;
};

export type RecipeCookingHistory = {
  stats: CookingHistoryStats;
  recentRecords: CookingRecordSummary[];
};

export type MealPlanCookingContext = {
  mealPlanEntryId: string;
  targetServings: number;
};

export type CompleteCookingRecordInput = {
  cookingRecordId: string;
  recipeId: string;
  mealPlanEntryId: string | null;
  startedAt: string;
  actualServings: number;
  rating: number | null;
  improvementNotes: string | null;
  photos: Array<{
    photoId: string;
    storagePath: string;
    sortOrder: number;
  }>;
};

export type CookingRecordActionResult<T> = ActionResult<T>;
