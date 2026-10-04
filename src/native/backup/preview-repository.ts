import {
  getLocalDatabase,
  type RecipioLocalDatabase,
} from "@/features/offline/local-db";
import { fromLegacy, toLegacy } from "../preview-store";
import { undoMilliseconds } from "../recipe-store";
import {
  DataOperationCoordinator,
  libraryDataCoordinator,
} from "./coordinator";
import {
  canonicalSource,
  restoreCommitSchema,
  validateSourceSnapshot,
  type BackupRepository,
  type RestoreCommit,
} from "./repository";
import {
  collectImageReferences,
  sourceSnapshotSchema,
  type BackupSourceSnapshot,
} from "./references";
import { LocalMediaLifecycle, localMediaLifecycle } from "../media-lifecycle";
async function read(
  db: RecipioLocalDatabase,
  now: Date,
): Promise<BackupSourceSnapshot> {
  const all = await db.localRecipes.toArray();
  if (
    all.some(
      (r) =>
        r.deletedAt !== null &&
        Date.parse(r.deletedAt) > now.getTime() - undoMilliseconds,
    )
  )
    throw new Error("请先撤销删除或等待撤销时间结束，再备份");
  const recipes = all.filter((r) => r.deletedAt === null).map(fromLegacy);
  const ids = new Set(recipes.map((r) => r.id));
  return validateSourceSnapshot(
    sourceSnapshotSchema.parse({
      sourceSchemaVersion: 4,
      recipes: recipes.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        totalMinutes: r.totalMinutes,
        servings: r.servings,
        caloriesPerServing: r.caloriesPerServing,
        coverPath: r.coverPath,
        notes: r.notes,
      })),
      ingredients: recipes.flatMap((r) =>
        r.ingredients.map((i, position) => ({
          ...i,
          recipeId: r.id,
          position,
        })),
      ),
      steps: recipes.flatMap((r) =>
        r.steps.map((i, position) => ({ ...i, recipeId: r.id, position })),
      ),
      preparations: recipes.flatMap((r) =>
        r.preparations.map((i, position) => ({
          ...i,
          recipeId: r.id,
          position,
        })),
      ),
      keyTips: recipes.flatMap((r) =>
        r.keyTips.map((i, position) => ({ ...i, recipeId: r.id, position })),
      ),
      changes: (await db.recipeChanges.toArray()).filter((c) =>
        ids.has(c.recipeId),
      ),
      cookingRecords: (await db.nativeCookingRecords.toArray()).filter((c) =>
        ids.has(c.recipeId),
      ),
      settings: {},
    }),
  );
}
/** Preview projection only. Does not back up or erase the legacy cloud stores. */
export class PreviewBackupRepository implements BackupRepository {
  constructor(
    private readonly coordinator: DataOperationCoordinator | null = libraryDataCoordinator,
    private readonly clock = () => new Date(),
    private readonly media: LocalMediaLifecycle = localMediaLifecycle,
  ) {}
  exclusive<T>(work: (locked: BackupRepository) => Promise<T>): Promise<T> {
    const run = () =>
      work(new PreviewBackupRepository(null, this.clock, this.media));
    return this.coordinator ? this.coordinator.withExclusive(run) : run();
  }
  snapshot() {
    return this.exclusive(async () => {
      const db = await getLocalDatabase();
      return db.transaction(
        "r",
        db.localRecipes,
        db.recipeChanges,
        db.nativeCookingRecords,
        () => read(db, this.clock()),
      );
    });
  }
  async withPinnedSnapshot<T>(
    work: (source: BackupSourceSnapshot) => Promise<T>,
  ): Promise<T> {
    const pinned = await this.exclusive(async (locked) => {
      const source = await locked.snapshot();
      return {
        source,
        release: this.media.pin(collectImageReferences(source)),
      };
    });
    try {
      return await work(pinned.source);
    } finally {
      pinned.release();
    }
  }
  readRestoreCommit(): Promise<RestoreCommit | null> {
    const run = async () => {
      const row = await (
        await getLocalDatabase()
      ).nativeBackupState.get("active");
      return row
        ? restoreCommitSchema.parse({
            operationId: row.operationId,
            generationId: row.generationId,
            dataSha256: row.dataSha256,
            committedAt: row.committedAt,
          })
        : null;
    };
    return this.coordinator ? this.coordinator.withDataAccess(run) : run();
  }
  async replace(input: BackupSourceSnapshot, inputCommit: RestoreCommit) {
    const source = validateSourceSnapshot(input),
      commit = restoreCommitSchema.parse(inputCommit);
    const run = async () => {
      const db = await getLocalDatabase();
      await db.transaction(
        "rw",
        db.localRecipes,
        db.recipeChanges,
        db.nativeBackupState,
        db.nativeCookingRecords,
        async () => {
          await db.localRecipes.clear();
          await db.recipeChanges.clear();
          await db.nativeCookingRecords.clear();
          for (const r of source.recipes) {
            const input = {
              title: r.title,
              totalMinutes: r.totalMinutes,
              servings: r.servings,
              caloriesPerServing: r.caloriesPerServing,
              coverPath: r.coverPath,
              notes: r.notes,
              ingredients: source.ingredients
                .filter((i) => i.recipeId === r.id)
                .sort((a, b) => a.position - b.position)
                .map((i) => ({ name: i.name, amount: i.amount })),
              steps: source.steps
                .filter((i) => i.recipeId === r.id)
                .sort((a, b) => a.position - b.position)
                .map((i) => ({
                  instruction: i.instruction,
                  imagePath: i.imagePath,
                })),
              preparations: source.preparations
                .filter((i) => i.recipeId === r.id)
                .sort((a, b) => a.position - b.position)
                .map((i) => ({
                  instruction: i.instruction,
                  minutes: i.minutes,
                  timingText: i.timingText,
                })),
              keyTips: source.keyTips
                .filter((i) => i.recipeId === r.id)
                .sort((a, b) => a.position - b.position)
                .map((i) => ({
                  instruction: i.instruction,
                  stepNumber: i.stepNumber,
                })),
            };
            await db.localRecipes.add({
              ...toLegacy(input, r.id, r.updatedAt),
              createdAt: r.createdAt,
            });
          }
          await db.recipeChanges.bulkAdd(source.changes);
          await db.nativeCookingRecords.bulkAdd(source.cookingRecords);
          await db.nativeBackupState.put({ id: "active", ...commit });
          if (
            canonicalSource(await read(db, this.clock())) !==
            canonicalSource(source)
          )
            throw new Error("恢复数据回读不一致");
        },
      );
    };
    return this.coordinator ? this.coordinator.withExclusive(run) : run();
  }
}
