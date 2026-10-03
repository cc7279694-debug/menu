import { getLocalDatabase } from "@/features/offline/local-db";
import type { LocalRecipeRecord } from "@/features/local-data/types";
import {
  emptyDetails,
  matchesDuration,
  recipeDetailsSchema,
  type RecipeDetails,
  type RecipeDetailsInput,
  type RecipeLibrary,
  type DurationFilter,
} from "./recipe-model";
import { undoMilliseconds } from "./recipe-store";

function fromLegacy(r: LocalRecipeRecord): RecipeDetails {
  return {
    ...emptyDetails(r.title),
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    totalMinutes:
      r.totalMinutes ?? (r.totalMinutes === null ? null : r.cookMinutes),
    servings:
      r.referenceServings === undefined ? r.baseServings : r.referenceServings,
    caloriesPerServing: r.nutrition?.caloriesKcal ?? null,
    coverPath: r.coverPath,
    notes: r.personalNotes ?? "",
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      amount:
        i.quantityText ??
        [i.quantity, i.unit].filter((v) => v !== null).join(" "),
    })),
    steps: r.steps.map((s) => ({
      instruction: s.instruction,
      imagePath: s.imagePath,
    })),
    preparations: r.preparations.map((p) => ({
      instruction: p.instruction,
      minutes: p.leadTimeMinutes,
      timingText: p.timingText,
    })),
    keyTips: r.keyTips ?? [],
  };
}
function toLegacy(
  input: RecipeDetailsInput,
  id: string,
  now: string,
  previous?: LocalRecipeRecord,
): LocalRecipeRecord {
  return {
    ...previous,
    ...input,
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    description: previous?.description ?? null,
    categoryId: previous?.categoryId ?? null,
    tagIds: previous?.tagIds ?? [],
    baseServings: input.servings ?? 1,
    referenceServings: input.servings,
    prepMinutes: null,
    cookMinutes: input.totalMinutes,
    personalNotes: input.notes,
    nutrition:
      input.caloriesPerServing === null
        ? null
        : {
            caloriesKcal: input.caloriesPerServing,
            proteinGrams: null,
            fatGrams: null,
            carbsGrams: null,
            isEstimated: true,
          },
    ingredients: input.ingredients.map((r, i) => ({
      id: crypto.randomUUID(),
      name: r.name,
      quantity: null,
      quantityText: r.amount || null,
      unit: null,
      preparationNote: null,
      sortOrder: i,
    })),
    steps: input.steps.map((r, i) => ({
      id: crypto.randomUUID(),
      instruction: r.instruction,
      imagePath: r.imagePath,
      imageUrl: null,
      timerSeconds: null,
      sortOrder: i,
      ingredientLinks: [],
    })),
    preparations: input.preparations.map((r, i) => ({
      id: crypto.randomUUID(),
      recipeIngredientId: null,
      ingredientName: null,
      instruction: r.instruction,
      leadTimeMinutes: r.minutes,
      timingText: r.timingText,
      sortOrder: i,
    })),
  };
}
/** Development preview only; reuses the existing browser tables, not Android's source of truth. */
export class PreviewRecipeLibrary implements RecipeLibrary {
  constructor(private readonly clock = () => new Date()) {}
  async list(
    search = "",
    limit = 100,
    offset = 0,
    filter: DurationFilter = "all",
  ) {
    const db = await getLocalDatabase();
    const q = search.trim().toLocaleLowerCase();
    return (await db.localRecipes.toArray())
      .filter((r) => r.deletedAt === null)
      .map(fromLegacy)
      .filter(
        (r) =>
          (r.title.toLocaleLowerCase().includes(q) ||
            r.ingredients.some((i) =>
              i.name.toLocaleLowerCase().includes(q),
            )) &&
          matchesDuration(r.totalMinutes, filter),
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      )
      .slice(offset, offset + Math.min(100, limit))
      .map((r) => ({
        ...r,
        preparationHint: r.preparations[0]?.instruction ?? null,
      }));
  }
  async create(title: string) {
    const value = recipeDetailsSchema.parse(emptyDetails(title));
    const id = crypto.randomUUID();
    const now = this.clock().toISOString();
    const record = toLegacy(value, id, now);
    await (await getLocalDatabase()).localRecipes.add(record);
    return fromLegacy(record);
  }
  async createDetails(input: RecipeDetailsInput) {
    const value = recipeDetailsSchema.parse(input);
    const id = crypto.randomUUID();
    const now = this.clock().toISOString();
    const record = toLegacy(value, id, now);
    await (await getLocalDatabase()).localRecipes.add(record);
    return fromLegacy(record);
  }
  async getDetails(id: string): Promise<RecipeDetails | null> {
    const r = await (await getLocalDatabase()).localRecipes.get(id);
    return r && r.deletedAt === null ? fromLegacy(r) : null;
  }
  async saveDetails(id: string, input: RecipeDetailsInput) {
    const value = recipeDetailsSchema.parse(input);
    const db = await getLocalDatabase();
    const now = this.clock().toISOString();
    await db.transaction("rw", db.localRecipes, db.recipeChanges, async () => {
      const previous = await db.localRecipes.get(id);
      if (!previous || previous.deletedAt !== null)
        throw new Error("菜谱已删除或不存在");
      await db.localRecipes.put(toLegacy(value, id, now, previous));
      await db.recipeChanges.add({
        id: crypto.randomUUID(),
        recipeId: id,
        changedAt: now,
        before: fromLegacy(previous),
        after: value,
      });
    });
  }
  async remove(id: string) {
    const db = await getLocalDatabase();
    const now = this.clock();
    await db.transaction("rw", db.localRecipes, async () => {
      const r = await db.localRecipes.get(id);
      if (!r || r.deletedAt !== null) throw new Error("菜谱已删除或不存在");
      await db.localRecipes.update(id, {
        deletedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    });
    return now.getTime() + undoMilliseconds;
  }
  async undo(id: string) {
    const db = await getLocalDatabase();
    return db.transaction("rw", db.localRecipes, async () => {
      const r = await db.localRecipes.get(id);
      if (
        !r?.deletedAt ||
        Date.parse(r.deletedAt) <= this.clock().getTime() - undoMilliseconds
      )
        return false;
      await db.localRecipes.update(id, {
        deletedAt: null,
        updatedAt: this.clock().toISOString(),
      });
      return true;
    });
  }
  async purgeExpired() {
    const db = await getLocalDatabase();
    const cutoff = this.clock().getTime() - undoMilliseconds;
    await db.transaction("rw", db.localRecipes, db.recipeChanges, async () => {
      const expired = await db.localRecipes
        .filter(
          (r) => r.deletedAt !== null && Date.parse(r.deletedAt) <= cutoff,
        )
        .toArray();
      for (const r of expired) {
        await db.recipeChanges.where("recipeId").equals(r.id).delete();
        await db.localRecipes.delete(r.id);
      }
    });
  }
}
