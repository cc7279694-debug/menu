import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asOwner, asUser, createDatabase } from "@/test/database/bootstrap";
import { loadRecipeMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ingredientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const stepId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const foreignIngredientId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    recipeId,
    title: "番茄炒蛋",
    description: "家常做法",
    categoryId: null,
    tagIds: [],
    coverPath: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    personalNotes: null,
    ingredients: [
      {
        recipeIngredientId: ingredientId,
        name: "番茄",
        quantity: 2,
        quantityText: null,
        unit: "个",
        preparationNote: null,
        sortOrder: 0,
      },
    ],
    steps: [
      {
        stepId,
        instruction: "番茄切块。",
        imagePath: null,
        timerSeconds: null,
        sortOrder: 0,
        ingredientLinks: [
          {
            recipeIngredientId: ingredientId,
            quantityOverride: null,
            quantityTextOverride: null,
            note: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

async function save(database: PGlite, value: Record<string, unknown>) {
  return database.query<{ recipe_id: string }>(
    "select public.save_recipe($1::jsonb) as recipe_id",
    [JSON.stringify(value)],
  );
}

describe("recipe management security and transactions", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);
    await asUser(database, userA);
  });

  afterEach(async () => {
    await database.close();
  });

  it("saves a complete aggregate and hides it from another user", async () => {
    await save(database, payload());

    const ownRows = await database.query<{ title: string; ingredient_count: number }>(
      `
        select r.title, count(ri.id)::integer as ingredient_count
        from public.recipes r
        left join public.recipe_ingredients ri on ri.recipe_id = r.id
        group by r.id, r.title
      `,
    );
    expect(ownRows.rows).toEqual([{ title: "番茄炒蛋", ingredient_count: 1 }]);

    await asUser(database, userB);
    const foreignRows = await database.query("select id from public.recipes");
    expect(foreignRows.rows).toEqual([]);
  });

  it("rolls back nested rows when an invalid step link is submitted", async () => {
    await save(database, payload());

    await expect(
      save(
        database,
        payload({
          title: "应当回滚",
          ingredients: [
            {
              recipeIngredientId: foreignIngredientId,
              name: "鸡蛋",
              quantity: 2,
              quantityText: null,
              unit: "个",
              preparationNote: null,
              sortOrder: 0,
            },
          ],
          steps: [
            {
              stepId,
              instruction: "错误关联。",
              imagePath: null,
              timerSeconds: null,
              sortOrder: 0,
              ingredientLinks: [
                {
                  recipeIngredientId: ingredientId,
                  quantityOverride: null,
                  quantityTextOverride: null,
                  note: null,
                },
              ],
            },
          ],
        }),
      ),
    ).rejects.toThrow();

    const rows = await database.query<{ title: string; ingredient_name: string }>(
      `
        select r.title, i.display_name as ingredient_name
        from public.recipes r
        join public.recipe_ingredients ri on ri.recipe_id = r.id
        join public.ingredients i on i.id = ri.ingredient_id
      `,
    );
    expect(rows.rows).toEqual([{ title: "番茄炒蛋", ingredient_name: "番茄" }]);
  });

  it("rejects a category owned by another user", async () => {
    await asUser(database, userB);
    const category = await database.query<{ id: string }>(
      "insert into public.categories (user_id, name) values ($1, $2) returning id",
      [userB, "家常菜"],
    );

    await asUser(database, userA);
    await expect(save(database, payload({ categoryId: category.rows[0].id }))).rejects.toThrow();
    const recipes = await database.query("select id from public.recipes");
    expect(recipes.rows).toEqual([]);
  });

  it("applies title, ingredient, and tag search within the current user", async () => {
    const tagInsert = await database.query<{ id: string }>(
      "insert into public.tags (user_id, name) values ($1, $2) returning id",
      [userA, "快手"],
    );
    await save(database, payload({ tagIds: [tagInsert.rows[0].id] }));

    const byIngredient = await database.query<{ recipe_id: string }>(
      "select recipe_id from public.search_recipe_summaries($1, null, null, false, false, 24, 0)",
      ["番茄"],
    );
    const byTag = await database.query<{ recipe_id: string }>(
      "select recipe_id from public.search_recipe_summaries($1, null, null, false, false, 24, 0)",
      ["快手"],
    );
    expect(byIngredient.rows).toEqual([{ recipe_id: recipeId }]);
    expect(byTag.rows).toEqual([{ recipe_id: recipeId }]);

    await asUser(database, userB);
    const hidden = await database.query(
      "select recipe_id from public.search_recipe_summaries($1, null, null, false, false, 24, 0)",
      ["番茄"],
    );
    expect(hidden.rows).toEqual([]);
  });

  it("restricts private Storage objects to the first path folder", async () => {
    await database.query(
      "insert into storage.objects (bucket_id, name, owner_id) values ($1, $2, $3)",
      ["recipe-media", `${userA}/recipes/${recipeId}/cover/a.webp`, userA],
    );
    const update = await database.query(
      "update storage.objects set name = $1 where bucket_id = $2",
      [`${userA}/recipes/${recipeId}/cover/replaced.webp`, "recipe-media"],
    );
    expect(update.rowCount).toBe(0);

    await asUser(database, userB);
    const hidden = await database.query("select name from storage.objects");
    expect(hidden.rows).toEqual([]);

    await database.query(
      "delete from storage.objects where bucket_id = $1 and name = $2",
      ["recipe-media", `${userA}/recipes/${recipeId}/cover/a.webp`],
    );
    await asOwner(database);
    const remains = await database.query("select name from storage.objects");
    expect(remains.rows).toHaveLength(1);
  });
});
