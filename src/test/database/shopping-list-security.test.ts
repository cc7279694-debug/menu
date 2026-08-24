import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asOwner, asUser, createDatabase } from "@/test/database/bootstrap";
import { loadShoppingMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

const recipeAId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recipeBId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const stepAId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const stepBId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const recipeIngredientAId = "12121212-1212-4212-8212-121212121212";
const recipeIngredientBId = "34343434-3434-4434-8434-343434343434";
let ingredientAId = "";
let ingredientBId = "";

type ShoppingPayload = {
  listId: string;
  name: string;
  sources: Array<{
    id: string;
    recipeId: string | null;
    recipeTitleSnapshot: string;
    selectedServings: number;
  }>;
  items: Array<{
    id: string;
    ingredientId: string | null;
    nameSnapshot: string;
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    aisle: string | null;
    isChecked: boolean;
    isManual: boolean;
    sortOrder: number;
  }>;
  itemSources: Array<{
    id: string;
    shoppingListItemId: string;
    shoppingListSourceId: string;
    recipeIngredientId: string | null;
    quantityContribution: number | null;
    quantityTextContribution: string | null;
    unitSnapshot: string | null;
  }>;
};

function recipePayload(params: {
  recipeId: string;
  recipeIngredientId: string;
  stepId: string;
  title: string;
  amount: number;
  unit: string;
  aisle?: string;
}) {
  return {
    recipeId: params.recipeId,
    title: params.title,
    description: null,
    categoryId: null,
    tagIds: [],
    coverPath: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    personalNotes: null,
    ingredients: [
      {
        recipeIngredientId: params.recipeIngredientId,
        name: params.title.replace("炒", ""),
        quantity: params.amount,
        quantityText: null,
        unit: params.unit,
        preparationNote: null,
        sortOrder: 0,
      },
    ],
    steps: [
      {
        stepId: params.stepId,
        instruction: "准备食材。",
        imagePath: null,
        timerSeconds: null,
        sortOrder: 0,
        ingredientLinks: [
          {
            recipeIngredientId: params.recipeIngredientId,
            quantityOverride: null,
            quantityTextOverride: null,
            note: null,
          },
        ],
      },
    ],
  };
}

function shoppingPayload(params: {
  listId: string;
  sourceId: string;
  itemId: string;
  itemSourceId: string;
  recipeId: string | null;
  recipeTitleSnapshot: string;
  recipeIngredientId: string | null;
  ingredientId: string | null;
  quantity: number | null;
  quantityText?: string | null;
  unit: string | null;
  aisle: string | null;
  sortOrder?: number;
  sourceRefId?: string;
  itemRefId?: string;
}) {
  const quantityText = params.quantityText ?? null;

  return {
    listId: params.listId,
    name: "当前购物清单",
    sources: [
      {
        id: params.sourceId,
        recipeId: params.recipeId,
        recipeTitleSnapshot: params.recipeTitleSnapshot,
        selectedServings: 2,
      },
    ],
    items: [
      {
        id: params.itemId,
        ingredientId: params.ingredientId,
        nameSnapshot: params.recipeTitleSnapshot,
        quantity: params.quantity,
        quantityText,
        unit: params.unit,
        aisle: params.aisle,
        isChecked: false,
        isManual: false,
        sortOrder: params.sortOrder ?? 0,
      },
    ],
    itemSources: [
      {
        id: params.itemSourceId,
        shoppingListItemId: params.itemRefId ?? params.itemId,
        shoppingListSourceId: params.sourceRefId ?? params.sourceId,
        recipeIngredientId: params.recipeIngredientId,
        quantityContribution: params.quantity,
        quantityTextContribution: quantityText,
        unitSnapshot: params.unit,
      },
    ],
  } satisfies ShoppingPayload;
}

async function saveRecipe(database: PGlite, value: Record<string, unknown>) {
  await database.query("select public.save_recipe($1::jsonb)", [JSON.stringify(value)]);
}

async function replaceActiveList(database: PGlite, value: ShoppingPayload) {
  return database.query<{ list_id: string }>(
    "select public.replace_active_shopping_list($1::jsonb) as list_id",
    [JSON.stringify(value)],
  );
}

describe("shopping list security and transactions", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadShoppingMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);

    await asUser(database, userA);
    await saveRecipe(
      database,
      recipePayload({
        recipeId: recipeAId,
        recipeIngredientId: recipeIngredientAId,
        stepId: stepAId,
        title: "番茄炒蛋",
        amount: 2,
        unit: "个",
      }),
    );
    await saveRecipe(
      database,
      recipePayload({
        recipeId: recipeBId,
        recipeIngredientId: recipeIngredientBId,
        stepId: stepBId,
        title: "青椒炒蛋",
        amount: 3,
        unit: "个",
      }),
    );

    const ingredientRows = await database.query<{ recipe_id: string; ingredient_id: string }>(
      `
        select recipe_id, ingredient_id
        from public.recipe_ingredients
        where id in ($1, $2)
        order by recipe_id
      `,
      [recipeIngredientAId, recipeIngredientBId],
    );

    ingredientAId = ingredientRows.rows.find((row) => row.recipe_id === recipeAId)?.ingredient_id ?? "";
    ingredientBId = ingredientRows.rows.find((row) => row.recipe_id === recipeBId)?.ingredient_id ?? "";
  });

  afterEach(async () => {
    await database.close();
  });

  it("keeps other users from selecting or mutating another user's list rows", async () => {
    const created = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "99999999-9999-4999-8999-999999999999",
        sourceId: "88888888-8888-4888-8888-888888888888",
        itemId: "77777777-7777-4777-8777-777777777777",
        itemSourceId: "66666666-6666-4666-8666-666666666666",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await asUser(database, userB);
    const hiddenLists = await database.query("select id from public.shopping_lists");
    expect(hiddenLists.rows).toEqual([]);

    const listUpdate = await database.query(
      "update public.shopping_lists set name = $1 where id = $2",
      ["别人的清单", created.rows[0].list_id],
    );
    expect(listUpdate.rowCount).toBe(0);

    const itemDelete = await database.query(
      "delete from public.shopping_list_items where shopping_list_id = $1",
      [created.rows[0].list_id],
    );
    expect(itemDelete.rowCount).toBe(0);
  });

  it("denies anonymous table and function access", async () => {
    const created = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "55555555-5555-4555-8555-555555555555",
        sourceId: "44444444-4444-4444-8444-444444444444",
        itemId: "33333333-3333-4333-8333-333333333333",
        itemSourceId: "23232323-2323-4232-8232-232323232323",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await database.exec("set role anon");
    await expect(
      database.query("select id from public.shopping_lists where id = $1", [created.rows[0].list_id]),
    ).rejects.toThrow();
    await expect(
      database.query("select public.replace_active_shopping_list($1::jsonb)", [
        JSON.stringify(
          shoppingPayload({
            listId: "13131313-1313-4313-8313-131313131313",
            sourceId: "14141414-1414-4414-8414-141414141414",
            itemId: "15151515-1515-4515-8515-151515151515",
            itemSourceId: "16161616-1616-4616-8616-161616161616",
            recipeId: recipeAId,
            recipeTitleSnapshot: "番茄炒蛋",
            recipeIngredientId: recipeIngredientAId,
            ingredientId: ingredientAId,
            quantity: 2,
            unit: "个",
            aisle: "蔬菜",
          }),
        ),
      ]),
    ).rejects.toThrow();
  });

  it("replaces the current list atomically and preserves the previous list as inactive", async () => {
    const first = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "17171717-1717-4717-8717-171717171717",
        sourceId: "18181818-1818-4818-8818-181818181818",
        itemId: "19191919-1919-4919-8919-191919191919",
        itemSourceId: "20202020-2020-4020-8020-202020202020",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    const second = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "21212121-2121-4212-8212-212121212121",
        sourceId: "22222222-2222-4222-9222-222222222223",
        itemId: "23232323-2323-4232-9232-232323232323",
        itemSourceId: "24242424-2424-4242-9242-242424242424",
        recipeId: recipeBId,
        recipeTitleSnapshot: "青椒炒蛋",
        recipeIngredientId: recipeIngredientBId,
        ingredientId: ingredientBId,
        quantity: 3,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    const currentRows = await database.query<{ id: string; is_active: boolean }>(
      "select id, is_active from public.shopping_lists order by created_at, id",
    );

    expect(second.rows[0].list_id).toBe("21212121-2121-4212-8212-212121212121");
    expect(currentRows.rows).toEqual([
      { id: first.rows[0].list_id, is_active: false },
      { id: second.rows[0].list_id, is_active: true },
    ]);
  });

  it("rolls back the whole replacement when a source recipe is deleted or foreign", async () => {
    await replaceActiveList(
      database,
      shoppingPayload({
        listId: "25252525-2525-4252-8252-252525252525",
        sourceId: "26262626-2626-4262-8262-262626262626",
        itemId: "27272727-2727-4272-8272-272727272727",
        itemSourceId: "28282828-2828-4282-8282-282828282828",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await database.query("update public.recipes set deleted_at = now() where id = $1", [recipeAId]);

    await expect(
      replaceActiveList(
        database,
        shoppingPayload({
          listId: "29292929-2929-4292-8292-292929292929",
          sourceId: "30303030-3030-4030-8030-303030303030",
          itemId: "31313131-3131-4131-8131-313131313131",
          itemSourceId: "32323232-3232-4232-8232-323232323232",
          recipeId: recipeAId,
          recipeTitleSnapshot: "番茄炒蛋",
          recipeIngredientId: recipeIngredientAId,
          ingredientId: ingredientAId,
          quantity: 2,
          unit: "个",
          aisle: "蔬菜",
        }),
      ),
    ).rejects.toThrow();

    const currentRows = await database.query<{ id: string; is_active: boolean }>(
      "select id, is_active from public.shopping_lists order by created_at, id",
    );
    expect(currentRows.rows).toEqual([
      { id: "25252525-2525-4252-8252-252525252525", is_active: true },
    ]);
  });

  it("aborts replacement when an item source links across lists", async () => {
    await replaceActiveList(
      database,
      shoppingPayload({
        listId: "41414141-4141-4414-8414-414141414141",
        sourceId: "42424242-4242-4424-8424-424242424242",
        itemId: "43434343-4343-4434-8434-434343434343",
        itemSourceId: "44444444-4444-4444-8444-444444444445",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await expect(
      replaceActiveList(
        database,
        shoppingPayload({
          listId: "45454545-4545-4454-8454-454545454545",
          sourceId: "46464646-4646-4464-8464-464646464646",
          itemId: "47474747-4747-4474-8474-474747474747",
          itemSourceId: "48484848-4848-4484-8484-484848484848",
          recipeId: recipeBId,
          recipeTitleSnapshot: "青椒炒蛋",
          recipeIngredientId: recipeIngredientBId,
          ingredientId: ingredientBId,
          quantity: 3,
          unit: "个",
          aisle: "蔬菜",
          sourceRefId: "42424242-4242-4424-8424-424242424242",
        }),
      ),
    ).rejects.toThrow();

    const currentRows = await database.query<{ id: string; is_active: boolean }>(
      "select id, is_active from public.shopping_lists order by created_at, id",
    );
    expect(currentRows.rows).toEqual([
      { id: "41414141-4141-4414-8414-414141414141", is_active: true },
    ]);
  });

  it("requires every active-list item exactly once for reorder and rejects foreign ids", async () => {
    const payload = {
      listId: "51515151-5151-4515-8515-515151515151",
      name: "当前购物清单",
      sources: [
        {
          id: "52525252-5252-4525-8525-525252525252",
          recipeId: recipeAId,
          recipeTitleSnapshot: "番茄炒蛋",
          selectedServings: 2,
        },
        {
          id: "53535353-5353-4535-8535-535353535353",
          recipeId: recipeBId,
          recipeTitleSnapshot: "青椒炒蛋",
          selectedServings: 2,
        },
      ],
      items: [
        {
          id: "54545454-5454-4545-8545-545454545454",
          ingredientId: ingredientAId,
          nameSnapshot: "番茄炒蛋",
          quantity: 2,
          quantityText: null,
          unit: "个",
          aisle: "蔬菜",
          isChecked: false,
          isManual: false,
          sortOrder: 0,
        },
        {
          id: "56565656-5656-4565-8565-565656565656",
          ingredientId: ingredientBId,
          nameSnapshot: "青椒炒蛋",
          quantity: 3,
          quantityText: null,
          unit: "个",
          aisle: "蔬菜",
          isChecked: false,
          isManual: false,
          sortOrder: 1,
        },
      ],
      itemSources: [
        {
          id: "57575757-5757-4575-8575-575757575757",
          shoppingListItemId: "54545454-5454-4545-8545-545454545454",
          shoppingListSourceId: "52525252-5252-4525-8525-525252525252",
          recipeIngredientId: recipeIngredientAId,
          quantityContribution: 2,
          quantityTextContribution: null,
          unitSnapshot: "个",
        },
        {
          id: "58585858-5858-4585-8585-585858585858",
          shoppingListItemId: "56565656-5656-4565-8565-565656565656",
          shoppingListSourceId: "53535353-5353-4535-8535-535353535353",
          recipeIngredientId: recipeIngredientBId,
          quantityContribution: 3,
          quantityTextContribution: null,
          unitSnapshot: "个",
        },
      ],
    } satisfies ShoppingPayload;

    const created = await replaceActiveList(database, payload);

    await expect(
      database.query("select public.reorder_shopping_items($1::uuid, $2::uuid[])", [
        created.rows[0].list_id,
        [
          "54545454-5454-4545-8545-545454545454",
          "54545454-5454-4545-8545-545454545454",
        ],
      ]),
    ).rejects.toThrow();

    await expect(
      database.query("select public.reorder_shopping_items($1::uuid, $2::uuid[])", [
        created.rows[0].list_id,
        [
          "54545454-5454-4545-8545-545454545454",
          "99999999-9999-4999-8999-999999999998",
        ],
      ]),
    ).rejects.toThrow();

    await database.query("select public.reorder_shopping_items($1::uuid, $2::uuid[])", [
      created.rows[0].list_id,
      [
        "56565656-5656-4565-8565-565656565656",
        "54545454-5454-4545-8545-545454545454",
      ],
    ]);

    const sorted = await database.query<{ id: string; sort_order: number }>(
      `
        select id, sort_order
        from public.shopping_list_items
        where shopping_list_id = $1
        order by sort_order, id
      `,
      [created.rows[0].list_id],
    );

    expect(sorted.rows).toEqual([
      { id: "56565656-5656-4565-8565-565656565656", sort_order: 0 },
      { id: "54545454-5454-4545-8545-545454545454", sort_order: 1 },
    ]);
  });

  it("preserves shopping snapshots when referenced recipe, ingredient, and recipe ingredient are physically deleted", async () => {
    const created = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "61616161-6161-4616-8616-616161616161",
        sourceId: "62626262-6262-4626-8626-626262626262",
        itemId: "63636363-6363-4636-8636-636363636363",
        itemSourceId: "64646464-6464-4646-8646-646464646464",
        recipeId: recipeAId,
        recipeTitleSnapshot: "番茄炒蛋",
        recipeIngredientId: recipeIngredientAId,
        ingredientId: ingredientAId,
        quantity: 2,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await asOwner(database);
    await database.query("delete from public.recipes where user_id = $1 and id = $2", [userA, recipeAId]);

    const sourceAfterRecipeDelete = await database.query<{
      user_id: string;
      shopping_list_id: string;
      recipe_id: string | null;
      recipe_title_snapshot: string;
    }>(
      `
        select user_id, shopping_list_id, recipe_id, recipe_title_snapshot
        from public.shopping_list_sources
        where id = $1
      `,
      ["62626262-6262-4626-8626-626262626262"],
    );

    expect(sourceAfterRecipeDelete.rows).toEqual([
      {
        user_id: userA,
        shopping_list_id: created.rows[0].list_id,
        recipe_id: null,
        recipe_title_snapshot: "番茄炒蛋",
      },
    ]);

    const itemAfterRecipeDelete = await database.query<{
      user_id: string;
      ingredient_id: string | null;
      name_snapshot: string;
    }>(
      `
        select user_id, ingredient_id, name_snapshot
        from public.shopping_list_items
        where id = $1
      `,
      ["63636363-6363-4636-8636-636363636363"],
    );

    expect(itemAfterRecipeDelete.rows).toEqual([
      {
        user_id: userA,
        ingredient_id: ingredientAId,
        name_snapshot: "番茄炒蛋",
      },
    ]);

    const itemSourceAfterRecipeDelete = await database.query<{
      user_id: string;
      recipe_ingredient_id: string | null;
      shopping_list_source_id: string;
      shopping_list_item_id: string;
    }>(
      `
        select user_id, recipe_ingredient_id, shopping_list_source_id, shopping_list_item_id
        from public.shopping_list_item_sources
        where id = $1
      `,
      ["64646464-6464-4646-8646-646464646464"],
    );

    expect(itemSourceAfterRecipeDelete.rows).toEqual([
      {
        user_id: userA,
        recipe_ingredient_id: null,
        shopping_list_source_id: "62626262-6262-4626-8626-626262626262",
        shopping_list_item_id: "63636363-6363-4636-8636-636363636363",
      },
    ]);
  });

  it("preserves shopping item snapshots when a referenced ingredient is physically deleted", async () => {
    const created = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "65656565-6565-4656-8656-656565656565",
        sourceId: "66666666-6666-4666-8666-666666666667",
        itemId: "67676767-6767-4676-8676-676767676767",
        itemSourceId: "68686868-6868-4686-8686-686868686868",
        recipeId: recipeBId,
        recipeTitleSnapshot: "青椒炒蛋",
        recipeIngredientId: recipeIngredientBId,
        ingredientId: ingredientBId,
        quantity: 3,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await asOwner(database);
    await database.query("delete from public.ingredients where user_id = $1 and id = $2", [userA, ingredientBId]);

    const itemAfterIngredientDelete = await database.query<{
      user_id: string;
      shopping_list_id: string;
      ingredient_id: string | null;
      name_snapshot: string;
    }>(
      `
        select user_id, shopping_list_id, ingredient_id, name_snapshot
        from public.shopping_list_items
        where id = $1
      `,
      ["67676767-6767-4676-8676-676767676767"],
    );

    expect(itemAfterIngredientDelete.rows).toEqual([
      {
        user_id: userA,
        shopping_list_id: created.rows[0].list_id,
        ingredient_id: null,
        name_snapshot: "青椒炒蛋",
      },
    ]);

    const itemSourceAfterIngredientDelete = await database.query<{
      user_id: string;
      recipe_ingredient_id: string | null;
      shopping_list_item_id: string;
    }>(
      `
        select user_id, recipe_ingredient_id, shopping_list_item_id
        from public.shopping_list_item_sources
        where id = $1
      `,
      ["68686868-6868-4686-8686-686868686868"],
    );

    expect(itemSourceAfterIngredientDelete.rows).toEqual([
      {
        user_id: userA,
        recipe_ingredient_id: null,
        shopping_list_item_id: "67676767-6767-4676-8676-676767676767",
      },
    ]);
  });

  it("preserves contribution snapshots when a referenced recipe ingredient is physically deleted", async () => {
    const created = await replaceActiveList(
      database,
      shoppingPayload({
        listId: "69696969-6969-4696-8696-696969696969",
        sourceId: "70707070-7070-4707-8707-707070707070",
        itemId: "71717171-7171-4717-8717-717171717171",
        itemSourceId: "72727272-7272-4727-8727-727272727272",
        recipeId: recipeBId,
        recipeTitleSnapshot: "青椒炒蛋",
        recipeIngredientId: recipeIngredientBId,
        ingredientId: ingredientBId,
        quantity: 3,
        unit: "个",
        aisle: "蔬菜",
      }),
    );

    await asOwner(database);
    await database.query("delete from public.recipe_ingredients where user_id = $1 and id = $2", [
      userA,
      recipeIngredientBId,
    ]);

    const itemSourceAfterIngredientDelete = await database.query<{
      user_id: string;
      shopping_list_id: string;
      shopping_list_source_id: string;
      recipe_ingredient_id: string | null;
      unit_snapshot: string | null;
    }>(
      `
        select user_id, shopping_list_id, shopping_list_source_id, recipe_ingredient_id, unit_snapshot
        from public.shopping_list_item_sources
        where id = $1
      `,
      ["72727272-7272-4727-8727-727272727272"],
    );

    expect(itemSourceAfterIngredientDelete.rows).toEqual([
      {
        user_id: userA,
        shopping_list_id: created.rows[0].list_id,
        shopping_list_source_id: "70707070-7070-4707-8707-707070707070",
        recipe_ingredient_id: null,
        unit_snapshot: "个",
      },
    ]);
  });
});
