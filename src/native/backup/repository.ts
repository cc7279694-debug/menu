import { z } from "zod";
import type { SqlDriver } from "../recipe-store";
import { schemaVersion, undoMilliseconds } from "../recipe-store";
import { DataOperationCoordinator, libraryDataCoordinator } from "./coordinator";
import { assetIdSchema, utcTimeSchema, validateDataRelations } from "./format";
import { collectImageReferences, sourceSnapshotSchema, toPortableData, type BackupSourceSnapshot } from "./references";

export const restoreCommitSchema = z.strictObject({ operationId: z.string().min(1).max(128), generationId: z.string().min(1).max(128), dataSha256: assetIdSchema, committedAt: utcTimeSchema });
export type RestoreCommit = z.infer<typeof restoreCommitSchema>;
export interface BackupRepository {
  snapshot(): Promise<BackupSourceSnapshot>;
  replace(snapshot: BackupSourceSnapshot, commit: RestoreCommit): Promise<void>;
  readRestoreCommit(): Promise<RestoreCommit | null>;
  exclusive<T>(work: (locked: BackupRepository) => Promise<T>): Promise<T>;
}
export function validateSourceSnapshot(input: BackupSourceSnapshot): BackupSourceSnapshot {
  const source = sourceSnapshotSchema.parse(input);
  // Only relation validation here. Real file bytes/hash are checked by the archive.
  const assets = collectImageReferences(source).map((sourcePath, i) => {
    const assetId = (i + 1).toString(16).padStart(64, "0");
    return { sourcePath, assetId, path: `media/${assetId}.png`, mimeType: "image/png" as const, size: 1, sha256: assetId };
  });
  validateDataRelations(toPortableData(source, assets));
  return source;
}
export function canonicalSource(input: BackupSourceSnapshot): string {
  const s = sourceSnapshotSchema.parse(input);
  s.recipes.sort((a,b) => a.id.localeCompare(b.id)); s.changes.sort((a,b) => a.id.localeCompare(b.id));
  for (const name of ["ingredients", "steps", "preparations", "keyTips"] as const) s[name].sort((a,b) => a.recipeId.localeCompare(b.recipeId) || a.position-b.position);
  return JSON.stringify(s);
}
function rows(values: unknown[]) { return values.map(value => z.record(z.string(), z.unknown()).parse(value)); }
const tables = { recipes: "recipes", ingredients: "recipe_ingredients", steps: "recipe_steps", preparations: "recipe_preparations", keyTips: "recipe_key_tips", changes: "recipe_changes" } as const;
async function readSnapshot(driver: SqlDriver, now: Date): Promise<BackupSourceSnapshot> {
  const version = rows(await driver.query("PRAGMA user_version"))[0]?.user_version;
  if (version !== schemaVersion) throw new Error("当前数据库版本不支持备份");
  const cutoff = new Date(now.getTime() - undoMilliseconds).toISOString();
  if ((await driver.query("SELECT id FROM recipes WHERE deleted_at>? LIMIT 1", [cutoff])).length) throw new Error("请先撤销删除或等待撤销时间结束，再备份");
  const r = rows(await driver.query("SELECT * FROM recipes WHERE deleted_at IS NULL ORDER BY id"));
  const children = await Promise.all(["recipe_ingredients", "recipe_steps", "recipe_preparations", "recipe_key_tips", "recipe_changes"].map(table => driver.query(`SELECT c.* FROM ${table} c JOIN recipes r ON c.recipe_id=r.id WHERE r.deleted_at IS NULL ORDER BY c.recipe_id,${table === "recipe_changes" ? "c.id" : "c.position"}`).then(rows)));
  return validateSourceSnapshot({ sourceSchemaVersion: schemaVersion,
    recipes: r.map(v => ({ id: v.id, title: v.title, createdAt: v.created_at, updatedAt: v.updated_at, totalMinutes: v.total_minutes, servings: v.servings, caloriesPerServing: v.calories_per_serving, coverPath: v.cover_path, notes: v.notes })),
    ingredients: children[0].map(v => ({ recipeId: v.recipe_id, position: v.position, name: v.name, amount: v.amount })),
    steps: children[1].map(v => ({ recipeId: v.recipe_id, position: v.position, instruction: v.instruction, imagePath: v.image_path })),
    preparations: children[2].map(v => ({ recipeId: v.recipe_id, position: v.position, instruction: v.instruction, minutes: v.minutes, timingText: v.timing_text })),
    keyTips: children[3].map(v => ({ recipeId: v.recipe_id, position: v.position, instruction: v.instruction, stepNumber: v.step_number })),
    changes: children[4].map(v => ({ id: v.id, recipeId: v.recipe_id, changedAt: v.changed_at, before: JSON.parse(z.string().parse(v.before_json)), after: JSON.parse(z.string().parse(v.after_json)) })), settings: {},
  } as BackupSourceSnapshot);
}
/** Locked scopes are short-lived and never exposed to UI. No nested gate/transaction. */
export class SQLiteBackupRepository implements BackupRepository {
  constructor(private readonly driver: SqlDriver, private readonly coordinator: DataOperationCoordinator | null = libraryDataCoordinator, private readonly clock = () => new Date()) {}
  exclusive<T>(work: (locked: BackupRepository) => Promise<T>): Promise<T> {
    const run = () => work(new SQLiteBackupRepository(this.driver, null, this.clock));
    return this.coordinator ? this.coordinator.withExclusive(run) : run();
  }
  snapshot() {
    return this.exclusive(async locked => {
      const repository = locked as SQLiteBackupRepository;
      if (!repository.driver.transaction) throw new Error("数据层不支持一致备份事务");
      return repository.driver.transaction(tx => readSnapshot(tx, this.clock()));
    });
  }
  readRestoreCommit(): Promise<RestoreCommit | null> {
    const run = async () => {
      const r = rows(await this.driver.query("SELECT * FROM backup_restore_state WHERE id=1"))[0];
      return r ? restoreCommitSchema.parse({ operationId: r.operation_id, generationId: r.generation_id, dataSha256: r.data_sha256, committedAt: r.committed_at }) : null;
    };
    return this.coordinator ? this.coordinator.withDataAccess(run) : run();
  }
  async replace(input: BackupSourceSnapshot, inputCommit: RestoreCommit): Promise<void> {
    const source = validateSourceSnapshot(input), commit = restoreCommitSchema.parse(inputCommit);
    const run = async () => {
      if (!this.driver.transaction) throw new Error("数据层不支持安全恢复事务");
      await this.driver.transaction(async tx => {
        await tx.run("DELETE FROM recipes");
        const statements: Array<{ statement: string; values: (string | number | null)[] }> = [];
        for (const r of source.recipes) statements.push({ statement: "INSERT INTO recipes(id,title,created_at,updated_at,total_minutes,servings,calories_per_serving,cover_path,notes) VALUES(?,?,?,?,?,?,?,?,?)", values: [r.id,r.title,r.createdAt,r.updatedAt,r.totalMinutes,r.servings,r.caloriesPerServing,r.coverPath,r.notes] });
        for (const r of source.ingredients) statements.push({ statement: "INSERT INTO recipe_ingredients VALUES(?,?,?,?)", values: [r.recipeId,r.position,r.name,r.amount] });
        for (const r of source.steps) statements.push({ statement: "INSERT INTO recipe_steps VALUES(?,?,?,?)", values: [r.recipeId,r.position,r.instruction,r.imagePath] });
        for (const r of source.preparations) statements.push({ statement: "INSERT INTO recipe_preparations VALUES(?,?,?,?,?)", values: [r.recipeId,r.position,r.instruction,r.minutes,r.timingText] });
        for (const r of source.keyTips) statements.push({ statement: "INSERT INTO recipe_key_tips VALUES(?,?,?,?)", values: [r.recipeId,r.position,r.instruction,r.stepNumber] });
        for (const r of source.changes) statements.push({ statement: "INSERT INTO recipe_changes VALUES(?,?,?,?,?)", values: [r.id,r.recipeId,r.changedAt,JSON.stringify(r.before),JSON.stringify(r.after)] });
        for (let i=0; i<statements.length; i+=200) {
          if (!tx.batch) throw new Error("事务不支持批量恢复");
          await tx.batch(statements.slice(i,i+200));
        }
        await tx.run("INSERT OR REPLACE INTO backup_restore_state VALUES(1,?,?,?,?)", [commit.operationId,commit.generationId,commit.dataSha256,commit.committedAt]);
        for (const [name, table] of Object.entries(tables) as Array<[keyof typeof tables, string]>) {
          if (rows(await tx.query(`SELECT count(*) n FROM ${table}`))[0]?.n !== source[name].length) throw new Error("恢复数量校验失败");
        }
        if ((await tx.query("PRAGMA foreign_key_check")).length) throw new Error("恢复外键校验失败");
        if (canonicalSource(await readSnapshot(tx, this.clock())) !== canonicalSource(source)) throw new Error("恢复数据回读不一致");
      });
    };
    return this.coordinator ? this.coordinator.withExclusive(run) : run();
  }
}
