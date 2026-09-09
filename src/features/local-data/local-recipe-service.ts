import type { RecipeSaveInput } from "@/features/recipes/schemas";

import { createDexieRecipeRepository } from "./dexie-recipe-repository";
import {
  recipeSaveInputToLocalWriteInput,
  type LocalRecipeTaxonomy,
  type LocalRecipeSaveSeed,
} from "./local-recipe-mapper";
import type { RecipeRepository } from "./recipe-repository";
import type { LocalRecipeRecord } from "./types";

export type LocalRecipeListFilters = {
  query?: string;
  categoryId?: string | null;
  tagId?: string | null;
  favoriteOnly?: boolean;
};

export type LocalRecipeService = {
  list(filters?: LocalRecipeListFilters): Promise<LocalRecipeRecord[]>;
  get(id: string): Promise<LocalRecipeRecord | null>;
  save(input: RecipeSaveInput, taxonomy: LocalRecipeTaxonomy, seed?: LocalRecipeSaveSeed | null): Promise<LocalRecipeRecord>;
};

export function createLocalRecipeService(repository: RecipeRepository): LocalRecipeService {
  return {
    async list(filters = {}) {
      const records = await repository.list();
      const query = filters.query?.trim().toLocaleLowerCase("zh-CN") ?? "";

      return records.filter((record) => {
        if (filters.categoryId && record.categoryId !== filters.categoryId) return false;
        if (filters.tagId && !record.tagIds.includes(filters.tagId)) return false;
        if (filters.favoriteOnly && !record.isFavorite) return false;
        if (!query) return true;

        const searchable = [
          record.title,
          record.description,
          record.categoryName,
          ...(record.tags ?? []).map((tag) => tag.name),
          ...record.ingredients.map((ingredient) => ingredient.name),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLocaleLowerCase("zh-CN");
        return searchable.includes(query);
      });
    },
    get(id) {
      return repository.get(id);
    },
    async save(input, taxonomy, seed = null) {
      const previous = await repository.get(input.recipeId) ?? seed;
      return repository.save(recipeSaveInputToLocalWriteInput(input, taxonomy, previous));
    },
  };
}

export const localRecipeService = createLocalRecipeService(createDexieRecipeRepository());
