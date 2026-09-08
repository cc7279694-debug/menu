import type { LocalRecipeRecord, LocalRecipeWriteInput } from "./types";

export interface RecipeRepository {
  list(options?: { includeDeleted?: boolean }): Promise<LocalRecipeRecord[]>;
  get(id: string): Promise<LocalRecipeRecord | null>;
  save(input: LocalRecipeWriteInput): Promise<LocalRecipeRecord>;
  moveToTrash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  permanentlyDelete(id: string): Promise<void>;
}
