import { z } from "zod";

import { recipeListQuerySchema } from "@/features/recipes/schemas";

export type RecipeListQuery = {
  query: string;
  categoryId: string | null;
  tagId: string | null;
  favoriteOnly: boolean;
  deletedOnly: boolean;
  page: number;
};

const uuidSchema = z.string().uuid();

const parseUuid = (value: string | null): string | null => {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

export function parseRecipeListQuery(params: URLSearchParams): RecipeListQuery {
  const candidate = {
    query: params.get("q") ?? "",
    categoryId: parseUuid(params.get("category")),
    tagId: parseUuid(params.get("tag")),
    favoriteOnly: params.get("favorite") === "1",
    deletedOnly: params.get("view") === "trash",
    page: parsePage(params.get("page")),
  };

  const parsed = recipeListQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      query: "",
      categoryId: null,
      tagId: null,
      favoriteOnly: false,
      deletedOnly: false,
      page: 1,
    };
  }

  return parsed.data;
}
