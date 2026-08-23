import { describe, expect, it } from "vitest";

import { mapRecipeSearchRow, parseRecipeSearchTags } from "@/features/recipes/queries";

describe("recipe query view mapping", () => {
  it("keeps numeric servings usable and maps private cover paths to signed URLs", () => {
    const summary = mapRecipeSearchRow(
      {
        recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "番茄炒蛋",
        description: null,
        cover_path: "111/recipes/a/cover.webp",
        base_servings: 2,
        prep_minutes: null,
        cook_minutes: 10,
        is_favorite: true,
        category_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        category_name: "家常菜",
        tags: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "快手" }],
        updated_at: "2026-08-23T00:00:00.000Z",
        total_count: 1,
      },
      { "111/recipes/a/cover.webp": "https://signed.test/cover" },
    );

    expect(summary).toMatchObject({
      title: "番茄炒蛋",
      baseServings: 2,
      coverUrl: "https://signed.test/cover",
      category: { name: "家常菜" },
      tags: [{ name: "快手" }],
    });
  });

  it("ignores malformed JSON tags instead of exposing arbitrary values", () => {
    expect(parseRecipeSearchTags(["invalid", { id: 1, name: "bad" }])).toEqual([]);
  });
});
