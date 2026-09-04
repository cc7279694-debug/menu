import type { RecipeDetail } from "@/features/recipes/types";
import type { ShoppingActiveList } from "@/features/shopping/types";

export type OfflineProfile = { userId: string; lastAuthenticatedAt: string };

export type OfflineRecipeDetail = Omit<RecipeDetail, "coverUrl" | "coverPath" | "steps"> & {
  coverUrl: null;
  coverPath: null;
  steps: Array<Omit<RecipeDetail["steps"][number], "imageUrl" | "imagePath"> & {
    imageUrl: null;
    imagePath: null;
  }>;
};

export type OfflineRecipeSnapshot = {
  userId: string;
  recipeId: string;
  cachedAt: string;
  lastOpenedAt: string;
  dataVersion: 3;
  /** Local tombstone state used when a cached recipe is moved to trash offline. */
  deleted?: boolean;
  recipe: OfflineRecipeDetail;
};

export type OfflineShoppingSnapshot = {
  userId: string;
  listId: string;
  cachedAt: string;
  serverUpdatedAt: string;
  dataVersion: 1;
  list: ShoppingActiveList;
};

export type OfflineShoppingToggle = {
  userId: string;
  listId: string;
  itemId: string;
  targetChecked: boolean;
  clientMutationId: string;
  queuedAt: string;
  attemptCount: number;
  lastError: string | null;
};
