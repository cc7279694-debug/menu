import { z } from "zod";
import type { SqlDriver } from "./recipe-store";
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
const row = z.record(z.string(), z.unknown());
export function cookingFromRow(input: unknown) {
  const r = row.parse(input);
  return cookingRecordSchema.parse({
    id: r.id,
    recipeId: r.recipe_id,
    cookedAt: r.cooked_at,
    finishedPhotoPath: r.finished_photo_path,
    evaluation: r.evaluation,
    note: r.note,
  });
}
export async function activeRecipe(driver: SqlDriver, recipeId: string) {
  entityIdSchema.parse(recipeId);
  if (
    !(
      await driver.query(
        "SELECT id FROM recipes WHERE id=? AND deleted_at IS NULL",
        [recipeId],
      )
    ).length
  )
    throw new Error("菜谱已删除或不存在");
}
export async function readCooking(driver: SqlDriver, id: string) {
  const r = await driver.query("SELECT * FROM cooking_records WHERE id=?", [
    entityIdSchema.parse(id),
  ]);
  return r.length ? cookingFromRow(r[0]) : null;
}
export async function insertCooking(
  driver: SqlDriver,
  recipeId: string,
  id: string,
  now: string,
) {
  await activeRecipe(driver, recipeId);
  entityIdSchema.parse(id);
  const old = await readCooking(driver, id);
  if (old) {
    if (old.recipeId !== recipeId) throw new Error("记录标识已用于另一道菜");
    return old;
  }
  const record = cookingRecordSchema.parse({
    id,
    recipeId,
    cookedAt: now,
    finishedPhotoPath: null,
    evaluation: null,
    note: null,
  });
  await driver.run(
    "INSERT INTO cooking_records(id,recipe_id,cooked_at,finished_photo_path,evaluation,note) VALUES(?,?,?,?,?,?)",
    [id, recipeId, record.cookedAt, null, null, null],
  );
  return record;
}
export async function updateCooking(
  driver: SqlDriver,
  id: string,
  extras: CookingRecordExtras,
) {
  const value = cookingRecordExtrasSchema.parse(extras),
    old = await readCooking(driver, id);
  if (!old) throw new Error("做菜记录不存在");
  await activeRecipe(driver, old.recipeId);
  await driver.run(
    "UPDATE cooking_records SET finished_photo_path=?,evaluation=?,note=? WHERE id=?",
    [value.finishedPhotoPath, value.evaluation, value.note, id],
  );
  return { ...old, ...value };
}
export async function listCooking(
  driver: SqlDriver,
  recipeId: string,
  limit?: number,
  cursor?: CookingCursor,
) {
  await activeRecipe(driver, recipeId);
  const c = cursor ? cookingCursorSchema.parse(cursor) : null;
  return (
    await driver.query(
      `SELECT * FROM cooking_records WHERE recipe_id=? ${c ? "AND (cooked_at<? OR (cooked_at=? AND id<?))" : ""} ORDER BY cooked_at DESC,id DESC LIMIT ?`,
      c
        ? [recipeId, c.cookedAt, c.cookedAt, c.id, historyLimit(limit)]
        : [recipeId, historyLimit(limit)],
    )
  ).map(cookingFromRow);
}
export async function cookingSummary(driver: SqlDriver, recipeId: string) {
  await activeRecipe(driver, recipeId);
  const r = row.parse(
    (
      await driver.query(
        "SELECT count(*) count,max(cooked_at) last FROM cooking_records WHERE recipe_id=?",
        [recipeId],
      )
    )[0],
  );
  return {
    count: z.number().int().min(0).parse(r.count),
    lastCookedAt: z.string().nullable().parse(r.last),
  };
}
export async function listChanges(
  driver: SqlDriver,
  recipeId: string,
  limit?: number,
  cursor?: ChangeCursor,
): Promise<RecipeChange[]> {
  await activeRecipe(driver, recipeId);
  const c = cursor ? changeCursorSchema.parse(cursor) : null;
  return (
    await driver.query(
      `SELECT * FROM recipe_changes WHERE recipe_id=? ${c ? "AND (changed_at<? OR (changed_at=? AND id<?))" : ""} ORDER BY changed_at DESC,id DESC LIMIT ?`,
      c
        ? [recipeId, c.changedAt, c.changedAt, c.id, historyLimit(limit)]
        : [recipeId, historyLimit(limit)],
    )
  ).map((v) => {
    const r = row.parse(v);
    return sourceSnapshotSchema.shape.changes.element.parse({
      id: r.id,
      recipeId: r.recipe_id,
      changedAt: r.changed_at,
      before: JSON.parse(z.string().parse(r.before_json)),
      after: JSON.parse(z.string().parse(r.after_json)),
    });
  });
}
