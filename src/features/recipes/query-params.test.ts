import { describe, expect, it } from "vitest";

import { parseRecipeListQuery } from "@/features/recipes/query-params";

const categoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("recipe list query parameters", () => {
  it("normalizes search, valid filters, trash view, and page", () => {
    expect(
      parseRecipeListQuery(
        new URLSearchParams(
          `q=%20番茄%20&category=${categoryId}&favorite=1&view=trash&page=3`,
        ),
      ),
    ).toEqual({
      query: "番茄",
      categoryId,
      tagId: null,
      favoriteOnly: true,
      deletedOnly: true,
      page: 3,
    });
  });

  it("rejects invalid IDs, booleans, and pages without throwing", () => {
    expect(
      parseRecipeListQuery(
        new URLSearchParams("category=not-a-uuid&tag=bad&favorite=no&view=other&page=0"),
      ),
    ).toEqual({
      query: "",
      categoryId: null,
      tagId: null,
      favoriteOnly: false,
      deletedOnly: false,
      page: 1,
    });
  });
});
