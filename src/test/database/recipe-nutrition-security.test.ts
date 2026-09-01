import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asUser, createDatabase } from "@/test/database/bootstrap";
import { loadRecipeNutritionMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recipeB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("recipe nutrition security", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeNutritionMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);
    await asUser(database, userA);
    await database.query(`
      insert into public.recipes (id, user_id, title, base_servings)
      values ($1, $2, '番茄炒蛋', 2)
    `, [recipeA, userA]);
    await asUser(database, userB);
    await database.query(`
      insert into public.recipes (id, user_id, title, base_servings)
      values ($1, $2, '鱼香肉丝', 2)
    `, [recipeB, userB]);
    await asUser(database, userA);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("allows an owner to save, update and clear per-serving nutrition atomically", async () => {
    const save = await database.query<{ id: string }>(
      "select public.save_recipe($1::jsonb) as id",
      [JSON.stringify({
        recipeId: recipeA,
        title: "番茄炒蛋",
        categoryId: null,
        tagIds: [],
        baseServings: 2,
        prepMinutes: null,
        cookMinutes: 10,
        personalNotes: null,
        ingredients: [
          {
            recipeIngredientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
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
            stepId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac",
            instruction: "炒熟",
            imagePath: null,
            timerSeconds: null,
            heatLevel: null,
            sortOrder: 0,
            ingredientLinks: [],
          },
        ],
        preparations: [],
        nutrition: {
          caloriesKcal: 320,
          proteinGrams: 28,
          fatGrams: null,
          carbsGrams: null,
          isEstimated: true,
        },
      })],
    );

    expect(save.rows[0].id).toBe(recipeA);
    expect((await database.query("select calories_kcal::float8 as calories_kcal, protein_grams::float8 as protein_grams, is_estimated from public.recipe_nutrition where recipe_id = $1", [recipeA])).rows).toEqual([
      { calories_kcal: 320, protein_grams: 28, is_estimated: true },
    ]);

    const clearPayload = JSON.stringify({
      recipeId: recipeA,
      title: "番茄炒蛋",
      categoryId: null,
      tagIds: [],
      baseServings: 2,
      prepMinutes: null,
      cookMinutes: 10,
      personalNotes: null,
      ingredients: [
        {
          recipeIngredientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad",
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
          stepId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae",
          instruction: "炒熟",
          imagePath: null,
          timerSeconds: null,
          heatLevel: null,
          sortOrder: 0,
          ingredientLinks: [],
        },
      ],
      preparations: [],
      nutrition: null,
    });

    await database.query("select public.save_recipe($1::jsonb)", [clearPayload]);
    expect((await database.query("select recipe_id from public.recipe_nutrition where recipe_id = $1", [recipeA])).rows).toEqual([]);
  });

  it("keeps nutrition rows private and rejects cross-user recipe links", async () => {
    await database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id, calories_kcal, protein_grams, is_estimated)
      values ($1, $2, 320, 28, true)
    `, [userA, recipeA]);

    await asUser(database, userB);
    expect((await database.query("select recipe_id from public.recipe_nutrition")).rows).toEqual([]);
    expect((await database.query("update public.recipe_nutrition set calories_kcal = 1 where recipe_id = $1", [recipeA])).rowCount).toBe(0);
    await expect(database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id, calories_kcal)
      values ($1, $2, 100)
    `, [userB, recipeA])).rejects.toThrow();
  });

  it("enforces partial values, zero values and numeric bounds", async () => {
    await database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id, calories_kcal, fat_grams, is_estimated)
      values ($1, $2, 0, 0, false)
    `, [userA, recipeA]);

    await expect(database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id, protein_grams)
      values ($1, $2, -1)
    `, [userA, recipeA])).rejects.toThrow();

    await expect(database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id, protein_grams)
      values ($1, $2, 10001)
    `, [userA, recipeB])).rejects.toThrow();

    await expect(database.query(`
      insert into public.recipe_nutrition
        (user_id, recipe_id)
      values ($1, $2)
    `, [userA, recipeA])).rejects.toThrow();
  });
});
