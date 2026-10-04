import { getLocalDatabase } from "@/features/offline/local-db";
import { z } from "zod";
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
import {
  DataOperationCoordinator,
  libraryDataCoordinator,
} from "./backup/coordinator";
import {
  cookingRecordSchema,
  cookingRecordExtrasSchema,
  cookingCursorSchema,
  changeCursorSchema,
  historyLimit,
  type CookingRecordExtras,
  type CookingCursor,
  type ChangeCursor,
  type RecipeChange,
} from "./cooking-model";
import { entityIdSchema } from "./record-validation";
import { sourceSnapshotSchema } from "./backup/references";
import { sameEditableDetails, toHistorySnapshot } from "./recipe-history";
import {
  LocalMediaLifecycle,
  localMediaLifecycle,
  collectLibraryImagePaths,
} from "./media-lifecycle";

export function fromLegacy(r: LocalRecipeRecord): RecipeDetails {
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
export function toLegacy(
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
  constructor(
    private readonly clock = () => new Date(),
    private readonly coordinator: DataOperationCoordinator = libraryDataCoordinator,
    private readonly media: LocalMediaLifecycle = localMediaLifecycle,
  ) {}
  private async imageReferences() {
    const db = await getLocalDatabase();
    return collectLibraryImagePaths(
      (await db.localRecipes.toArray()).map(fromLegacy),
      (await db.recipeChanges.toArray()).map((r) =>
        sourceSnapshotSchema.shape.changes.element.parse(r),
      ),
      (await db.nativeCookingRecords.toArray()).map((r) =>
        cookingRecordSchema.parse(r),
      ),
    );
  }
  list(search = "", limit = 100, offset = 0, filter: DurationFilter = "all") {
    return this.coordinator.withDataAccess(() =>
      this.readList(search, limit, offset, filter),
    );
  }
  create(title: string) {
    return this.coordinator.withDataAccess(() => this.createUnlocked(title));
  }
  createDetails(input: RecipeDetailsInput, creationId?: string, assertCurrent?: () => void) {
    return this.coordinator.withDataAccess(() => {
      assertCurrent?.();
      return this.createDetailsUnlocked(input, creationId);
    });
  }
  hasExactTitle(title: string) {
    return this.coordinator.withDataAccess(async () => {
      const value = recipeDetailsSchema.shape.title.parse(title);
      return (await (await getLocalDatabase()).localRecipes.filter(record => record.deletedAt === null && record.title === value).limit(1).toArray()).length > 0;
    });
  }
  getDetails(id: string) {
    return this.coordinator.withDataAccess(() => this.getUnlocked(id));
  }
  saveDetails(id: string, input: RecipeDetailsInput) {
    return this.coordinator.withDataAccess(() => this.saveUnlocked(id, input));
  }
  remove(id: string) {
    return this.coordinator.withDataAccess(() => this.removeUnlocked(id));
  }
  undo(id: string) {
    return this.coordinator.withDataAccess(() => this.undoUnlocked(id));
  }
  purgeExpired() {
    return this.coordinator.withDataAccess(() => this.purgeUnlocked());
  }
  recordCooking(recipeId: string, recordId: string) {
    return this.coordinator.withDataAccess(async () => {
      const db = await getLocalDatabase();
      entityIdSchema.parse(recordId);
      return db.transaction(
        "rw",
        db.localRecipes,
        db.nativeCookingRecords,
        async () => {
          if (!(await this.getUnlocked(recipeId)))
            throw new Error("菜谱已删除或不存在");
          const old = await db.nativeCookingRecords.get(recordId);
          if (old) {
            if (old.recipeId !== recipeId)
              throw new Error("记录标识已用于另一道菜");
            return cookingRecordSchema.parse(old);
          }
          const record = cookingRecordSchema.parse({
            id: recordId,
            recipeId,
            cookedAt: this.clock().toISOString(),
            finishedPhotoPath: null,
            evaluation: null,
            note: null,
          });
          await db.nativeCookingRecords.add(record);
          return record;
        },
      );
    });
  }
  updateCookingRecord(id: string, extras: CookingRecordExtras) {
    return this.coordinator.withDataAccess(async () => {
      const value = cookingRecordExtrasSchema.parse(extras),
        db = await getLocalDatabase();
      return db.transaction(
        "rw",
        db.localRecipes,
        db.nativeCookingRecords,
        async () => {
          const old = await db.nativeCookingRecords.get(
            entityIdSchema.parse(id),
          );
          if (!old) throw new Error("做菜记录不存在");
          if (!(await this.getUnlocked(old.recipeId)))
            throw new Error("菜谱已删除或不存在");
          const record = cookingRecordSchema.parse({ ...old, ...value });
          await db.nativeCookingRecords.put(record);
          return record;
        },
      );
    });
  }
  deleteCookingRecord(id: string) {
    return this.coordinator.withDataAccess(async () => {
      const db = await getLocalDatabase();
      const candidates: string[] = [];
      await db.transaction(
        "rw",
        db.localRecipes,
        db.nativeCookingRecords,
        async () => {
          const r = await db.nativeCookingRecords.get(entityIdSchema.parse(id));
          if (!r) throw new Error("做菜记录不存在");
          if (!(await this.getUnlocked(r.recipeId)))
            throw new Error("菜谱已删除或不存在");
          if (r.finishedPhotoPath) candidates.push(r.finishedPhotoPath);
          await db.nativeCookingRecords.delete(id);
        },
      );
      return this.media.pruneCandidates(candidates, () =>
        this.imageReferences(),
      );
    });
  }
  listCookingRecords(recipeId: string, limit?: number, cursor?: CookingCursor) {
    return this.coordinator.withDataAccess(async () => {
      if (!(await this.getUnlocked(recipeId)))
        throw new Error("菜谱已删除或不存在");
      const c = cursor ? cookingCursorSchema.parse(cursor) : null;
      return (
        await (
          await getLocalDatabase()
        ).nativeCookingRecords
          .where("[recipeId+cookedAt+id]")
          .between(
            [recipeId, "", ""],
            c ? [recipeId, c.cookedAt, c.id] : [recipeId, "\uffff", "\uffff"],
            true,
            !c,
          )
          .reverse()
          .limit(historyLimit(limit))
          .toArray()
      ).map((r) => cookingRecordSchema.parse(r));
    });
  }
  getCookingSummary(recipeId: string) {
    return this.coordinator.withDataAccess(async () => {
      if (!(await this.getUnlocked(recipeId)))
        throw new Error("菜谱已删除或不存在");
      const rows = await (
        await getLocalDatabase()
      ).nativeCookingRecords
        .where("recipeId")
        .equals(recipeId)
        .toArray();
      return {
        count: rows.length,
        lastCookedAt: rows.reduce<string | null>(
          (last, r) => (last === null || r.cookedAt > last ? r.cookedAt : last),
          null,
        ),
      };
    });
  }
  listRecipeChanges(
    recipeId: string,
    limit?: number,
    cursor?: ChangeCursor,
  ): Promise<RecipeChange[]> {
    return this.coordinator.withDataAccess(async () => {
      if (!(await this.getUnlocked(recipeId)))
        throw new Error("菜谱已删除或不存在");
      const c = cursor ? changeCursorSchema.parse(cursor) : null;
      return (
        await (
          await getLocalDatabase()
        ).recipeChanges
          .where("[recipeId+changedAt+id]")
          .between(
            [recipeId, "", ""],
            c ? [recipeId, c.changedAt, c.id] : [recipeId, "\uffff", "\uffff"],
            true,
            !c,
          )
          .reverse()
          .limit(historyLimit(limit))
          .toArray()
      ).map((r) => sourceSnapshotSchema.shape.changes.element.parse(r));
    });
  }
  setCookingPhotoAsCover(recordId: string) {
    return this.coordinator.withDataAccess(async () => {
      const r = await (
        await getLocalDatabase()
      ).nativeCookingRecords.get(entityIdSchema.parse(recordId));
      if (!r?.finishedPhotoPath) throw new Error("请先添加成品照片");
      const before = await this.getUnlocked(r.recipeId);
      if (!before) throw new Error("菜谱已删除或不存在");
      await this.saveUnlocked(r.recipeId, {
        ...before,
        coverPath: r.finishedPhotoPath,
      });
      const saved = await this.getUnlocked(r.recipeId);
      if (!saved) throw new Error("保存后无法读取菜谱");
      return saved;
    });
  }
  private async readList(
    search = "",
    limit = 100,
    offset = 0,
    filter: DurationFilter = "all",
  ) {
    const db = await getLocalDatabase();
    const q = search.trim().toLocaleLowerCase();
    const cooking = await db.nativeCookingRecords.toArray();
    const last = new Map<string, string>();
    for (const r of cooking)
      if (!last.has(r.recipeId) || r.cookedAt > last.get(r.recipeId)!)
        last.set(r.recipeId, r.cookedAt);
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
        lastCookedAt: last.get(r.id) ?? null,
      }));
  }
  private async createUnlocked(title: string) {
    const value = recipeDetailsSchema.parse(emptyDetails(title));
    const id = crypto.randomUUID();
    const now = this.clock().toISOString();
    const record = toLegacy(value, id, now);
    await (await getLocalDatabase()).localRecipes.add(record);
    return fromLegacy(record);
  }
  private async createDetailsUnlocked(input: RecipeDetailsInput, creationId?: string) {
    const value = recipeDetailsSchema.parse(input);
    const id = creationId === undefined ? crypto.randomUUID() : z.uuid().parse(creationId);
    const db = await getLocalDatabase();
    return db.transaction("rw", db.localRecipes, async () => {
      if (creationId !== undefined) {
        const existing = await db.localRecipes.get(id);
        if (existing) {
          if (existing.deletedAt !== null || !sameEditableDetails(fromLegacy(existing), value)) throw new Error("创建编号已存在，不能覆盖或恢复已删除菜谱");
          return fromLegacy(existing);
        }
      }
      const record = toLegacy(value, id, this.clock().toISOString());
      await db.localRecipes.add(record);
      return fromLegacy(record);
    });
  }
  private async getUnlocked(id: string): Promise<RecipeDetails | null> {
    const r = await (await getLocalDatabase()).localRecipes.get(id);
    return r && r.deletedAt === null ? fromLegacy(r) : null;
  }
  private async saveUnlocked(id: string, input: RecipeDetailsInput) {
    const value = recipeDetailsSchema.parse(input);
    const db = await getLocalDatabase();
    const now = this.clock().toISOString();
    await db.transaction("rw", db.localRecipes, db.recipeChanges, async () => {
      const previous = await db.localRecipes.get(id);
      if (!previous || previous.deletedAt !== null)
        throw new Error("菜谱已删除或不存在");
      if (sameEditableDetails(fromLegacy(previous), value)) return;
      await db.localRecipes.put(toLegacy(value, id, now, previous));
      await db.recipeChanges.add({
        id: crypto.randomUUID(),
        recipeId: id,
        changedAt: now,
        before: toHistorySnapshot(fromLegacy(previous)),
        after: value,
      });
    });
  }
  private async removeUnlocked(id: string) {
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
  private async undoUnlocked(id: string) {
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
  private async purgeUnlocked() {
    const db = await getLocalDatabase();
    const cutoff = this.clock().getTime() - undoMilliseconds;
    const candidates: string[] = [];
    await db.transaction(
      "rw",
      db.localRecipes,
      db.recipeChanges,
      db.nativeCookingRecords,
      async () => {
        const expired = await db.localRecipes
          .filter(
            (r) => r.deletedAt !== null && Date.parse(r.deletedAt) <= cutoff,
          )
          .toArray();
        for (const r of expired) {
          const changes = (
            await db.recipeChanges.where("recipeId").equals(r.id).toArray()
          ).map((c) => sourceSnapshotSchema.shape.changes.element.parse(c));
          const records = await db.nativeCookingRecords
            .where("recipeId")
            .equals(r.id)
            .toArray();
          candidates.push(
            ...collectLibraryImagePaths([fromLegacy(r)], changes, records),
          );
          await db.recipeChanges.where("recipeId").equals(r.id).delete();
          await db.nativeCookingRecords.where("recipeId").equals(r.id).delete();
          await db.localRecipes.delete(r.id);
        }
      },
    );
    return this.media.pruneCandidates(candidates, () => this.imageReferences());
  }
}
