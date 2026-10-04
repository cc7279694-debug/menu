import type { LibraryCleanupResult } from "./cooking-model";
import type { CookingRecord, RecipeChange } from "./cooking-model";
import type { RecipeDetails, RecipeDetailsInput } from "./recipe-model";
import { localImagePath } from "./recipe-model";
import type { SqlDriver } from "./recipe-store";
import { deleteLocalImages } from "./media";
import { z } from "zod";
export function collectRecipeImagePaths(recipe: RecipeDetailsInput): string[] {
  return [
    ...new Set(
      [recipe.coverPath, ...recipe.steps.map((s) => s.imagePath)]
        .filter((v): v is string => v !== null)
        .map((v) => localImagePath.parse(v)),
    ),
  ];
}
export function collectLibraryImagePaths(
  recipes: RecipeDetails[],
  changes: RecipeChange[],
  records: CookingRecord[],
): string[] {
  return [
    ...new Set([
      ...recipes.flatMap(collectRecipeImagePaths),
      ...changes.flatMap((c) => [
        ...collectRecipeImagePaths(c.before),
        ...collectRecipeImagePaths(c.after),
      ]),
      ...records
        .map((r) => r.finishedPhotoPath)
        .filter((p): p is string => p !== null),
    ]),
  ].sort();
}
const snapshotImages = z.object({
  coverPath: localImagePath.nullable(),
  steps: z.array(z.object({ imagePath: localImagePath.nullable() })),
});
/** Includes soft-deleted rows. Optional cutoff selects only expiry candidates. Caller owns the data gate. */
export async function readSqlImagePaths(
  driver: SqlDriver,
  cutoff?: string,
): Promise<string[]> {
  const condition = cutoff
    ? " WHERE deleted_at IS NOT NULL AND deleted_at<=?"
    : "";
  const child = cutoff
    ? " WHERE recipe_id IN (SELECT id FROM recipes WHERE deleted_at IS NOT NULL AND deleted_at<=?)"
    : "";
  const values = cutoff ? [cutoff] : [];
  const paths: string[] = [];
  for (const [sql, key] of [
    [`SELECT cover_path FROM recipes${condition}`, "cover_path"],
    [`SELECT image_path FROM recipe_steps${child}`, "image_path"],
    [
      `SELECT finished_photo_path FROM cooking_records${child}`,
      "finished_photo_path",
    ],
  ])
    for (const raw of await driver.query(sql, values)) {
      const r = z.record(z.string(), z.unknown()).parse(raw);
      const p = localImagePath.nullable().parse(r[key]);
      if (p !== null) paths.push(p);
    }
  for (const raw of await driver.query(
    `SELECT before_json,after_json FROM recipe_changes${child}`,
    values,
  )) {
    const r = z.record(z.string(), z.unknown()).parse(raw);
    for (const key of ["before_json", "after_json"]) {
      const s = snapshotImages.parse(JSON.parse(z.string().parse(r[key])));
      if (s.coverPath) paths.push(s.coverPath);
      for (const step of s.steps)
        if (step.imagePath) paths.push(step.imagePath);
    }
  }
  return [...new Set(paths)].sort();
}
export class LocalMediaLifecycle {
  private readonly pins = new Map<string, number>();
  constructor(
    private readonly unlink: (paths: readonly string[]) => Promise<void>,
  ) {}
  pin(paths: readonly string[]) {
    const unique = [...new Set(paths.map((p) => localImagePath.parse(p)))];
    for (const p of unique) this.pins.set(p, (this.pins.get(p) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const p of unique) {
        const n = (this.pins.get(p) ?? 1) - 1;
        if (n > 0) this.pins.set(p, n);
        else this.pins.delete(p);
      }
    };
  }
  async pruneCandidates(
    candidates: readonly string[],
    readReferences: () => Promise<readonly string[]>,
  ): Promise<LibraryCleanupResult> {
    try {
      const valid = [
        ...new Set(candidates.map((p) => localImagePath.parse(p))),
      ];
      if (!valid.length) return { cleanupWarning: null };
      const live = new Set(
        (await readReferences()).map((p) => localImagePath.parse(p)),
      );
      const deletable = valid.filter((p) => !live.has(p) && !this.pins.has(p));
      if (deletable.length) await this.unlink(deletable);
      return { cleanupWarning: null };
    } catch {
      return {
        cleanupWarning:
          "数据已保存；未能安全清理无引用图片，文件保留或待清理，请勿清除应用数据。",
      };
    }
  }
}
export const localMediaLifecycle = new LocalMediaLifecycle(deleteLocalImages);
