import { z } from "zod";
import {
  insertCooking,
  updateCooking,
  readCooking,
  activeRecipe,
  listCooking,
  cookingSummary,
  listChanges,
} from "./cooking-store";
import type {
  CookingRecordExtras,
  CookingCursor,
  ChangeCursor,
  LibraryCleanupResult,
} from "./cooking-model";
import {
  LocalMediaLifecycle,
  localMediaLifecycle,
  readSqlImagePaths,
} from "./media-lifecycle";
import {
  sameEditableDetails,
  storedDetailsSchema,
  toHistorySnapshot,
} from "./recipe-history";
import {
  DataOperationCoordinator,
  libraryDataCoordinator,
} from "./backup/coordinator";
import {
  emptyDetails,
  recipeDetailsSchema,
  type RecipeDetails,
  type RecipeDetailsInput,
  type DurationFilter,
  type RecipeListItem,
} from "./recipe-model";

export const schemaVersion = 4;
export const undoMilliseconds = 5000;
const versionOneStatements = [
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  "CREATE INDEX IF NOT EXISTS recipes_added ON recipes(created_at DESC, id DESC) WHERE deleted_at IS NULL;",
  "CREATE INDEX IF NOT EXISTS recipes_deleted ON recipes(deleted_at) WHERE deleted_at IS NOT NULL;",
];
const versionTwoStatements = [
  "ALTER TABLE recipes ADD COLUMN total_minutes INTEGER CHECK(total_minutes IS NULL OR total_minutes>0);",
  "ALTER TABLE recipes ADD COLUMN servings REAL CHECK(servings IS NULL OR servings>0);",
  "ALTER TABLE recipes ADD COLUMN calories_per_serving REAL CHECK(calories_per_serving IS NULL OR calories_per_serving>=0);",
  "ALTER TABLE recipes ADD COLUMN cover_path TEXT;",
  "ALTER TABLE recipes ADD COLUMN notes TEXT NOT NULL DEFAULT '';",
  "CREATE TABLE recipe_ingredients(recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, position INTEGER NOT NULL, name TEXT NOT NULL, amount TEXT NOT NULL, PRIMARY KEY(recipe_id,position));",
  "CREATE TABLE recipe_steps(recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, position INTEGER NOT NULL, instruction TEXT NOT NULL, image_path TEXT, PRIMARY KEY(recipe_id,position));",
  "CREATE TABLE recipe_preparations(recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, position INTEGER NOT NULL, instruction TEXT NOT NULL, minutes INTEGER, timing_text TEXT, PRIMARY KEY(recipe_id,position));",
  "CREATE TABLE recipe_key_tips(recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, position INTEGER NOT NULL, instruction TEXT NOT NULL, step_number INTEGER, PRIMARY KEY(recipe_id,position));",
  "CREATE TABLE recipe_changes(id TEXT PRIMARY KEY NOT NULL, recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, changed_at TEXT NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL);",
  "CREATE INDEX recipe_changes_recipe ON recipe_changes(recipe_id,changed_at);",
];
const versionThreeStatements = [
  "CREATE TABLE backup_restore_state(id INTEGER PRIMARY KEY CHECK(id=1), operation_id TEXT NOT NULL, generation_id TEXT NOT NULL, data_sha256 TEXT NOT NULL, committed_at TEXT NOT NULL);",
];
const versionFourStatements = [
  "CREATE TABLE cooking_records(id TEXT PRIMARY KEY NOT NULL, recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, cooked_at TEXT NOT NULL, finished_photo_path TEXT, evaluation TEXT CHECK(evaluation IS NULL OR evaluation IN ('tasty','okay','adjust_next_time')), note TEXT CHECK(note IS NULL OR length(note)<=2000));",
  "CREATE INDEX cooking_records_recipe ON cooking_records(recipe_id,cooked_at DESC,id DESC);",
  "CREATE INDEX recipe_changes_order ON recipe_changes(recipe_id,changed_at DESC,id DESC);",
];
export const migrationStatements = [
  { toVersion: 1, statements: versionOneStatements },
  { toVersion: 2, statements: versionTwoStatements },
  { toVersion: 3, statements: versionThreeStatements },
  { toVersion: 4, statements: versionFourStatements },
];
// Complete fresh schema used by non-plugin tests. Existing databases use versioned upgrades above.
export const schemaStatements = [
  versionOneStatements[0].replace(
    "deleted_at TEXT",
    "deleted_at TEXT, total_minutes INTEGER CHECK(total_minutes IS NULL OR total_minutes>0), servings REAL CHECK(servings IS NULL OR servings>0), calories_per_serving REAL CHECK(calories_per_serving IS NULL OR calories_per_serving>=0), cover_path TEXT, notes TEXT NOT NULL DEFAULT ''",
  ),
  ...versionOneStatements.slice(1),
  ...versionTwoStatements
    .slice(5)
    .map((sql) =>
      sql
        .replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
        .replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS "),
    ),
  ...versionThreeStatements.map((sql) =>
    sql.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS "),
  ),
  ...versionFourStatements.map((sql) =>
    sql
      .replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
      .replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS "),
  ),
];

const titleSchema = z
  .string()
  .trim()
  .min(1, "请输入菜名")
  .max(120, "菜名最多 120 个字符");
const rowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RecipeName = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  totalMinutes?: number | null;
  coverPath?: string | null;
  caloriesPerServing?: number | null;
  preparationHint?: string | null;
};
export interface SqlDriver {
  query(sql: string, values?: (string | number)[]): Promise<unknown[]>;
  run(sql: string, values?: (string | number | null)[]): Promise<number>;
  transaction?<T>(work: (tx: SqlDriver) => Promise<T>): Promise<T>;
  batch?(
    statements: Array<{
      statement: string;
      values: (string | number | null)[];
    }>,
  ): Promise<void>;
}
function fromRow(value: unknown): RecipeName {
  const row = rowSchema.parse(value);
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalMinutes: (value as Record<string, unknown>).total_minutes as
      number | null | undefined,
    coverPath: (value as Record<string, unknown>).cover_path as
      string | null | undefined,
    caloriesPerServing: (value as Record<string, unknown>)
      .calories_per_serving as number | null | undefined,
    preparationHint: (value as Record<string, unknown>).preparation_hint as
      string | null | undefined,
  };
}

/** APK-0 projection: no login, taxonomy, cloud IDs or synchronization fields. */
export class RecipeNameStore {
  constructor(
    private readonly driver: SqlDriver,
    private readonly clock = () => new Date(),
    private readonly coordinator: DataOperationCoordinator = libraryDataCoordinator,
    private readonly media: LocalMediaLifecycle = localMediaLifecycle,
  ) {}

  list(search = "", limit = 100, offset = 0, filter: DurationFilter = "all") {
    return this.coordinator.withDataAccess(() =>
      this.readList(search, limit, offset, filter),
    );
  }
  getDetails(id: string) {
    return this.coordinator.withDataAccess(() => this.readDetails(id));
  }
  saveDetails(id: string, input: RecipeDetailsInput) {
    return this.coordinator.withDataAccess(() => this.saveUnlocked(id, input));
  }
  createDetails(input: RecipeDetailsInput) {
    return this.coordinator.withDataAccess(() =>
      this.createDetailsUnlocked(input),
    );
  }
  get(id: string) {
    return this.coordinator.withDataAccess(() => this.getUnlocked(id));
  }
  create(title: string) {
    return this.coordinator.withDataAccess(() => this.createUnlocked(title));
  }
  rename(id: string, title: string) {
    return this.coordinator.withDataAccess(() =>
      this.renameUnlocked(id, title),
    );
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
    return this.coordinator.withDataAccess(() =>
      insertCooking(
        this.driver,
        recipeId,
        recordId,
        this.clock().toISOString(),
      ),
    );
  }
  updateCookingRecord(id: string, extras: CookingRecordExtras) {
    return this.coordinator.withDataAccess(() =>
      updateCooking(this.driver, id, extras),
    );
  }
  deleteCookingRecord(id: string) {
    return this.coordinator.withDataAccess(async () => {
      const r = await readCooking(this.driver, id);
      if (!r) throw new Error("做菜记录不存在");
      await activeRecipe(this.driver, r.recipeId);
      await this.driver.run("DELETE FROM cooking_records WHERE id=?", [id]);
      return this.media.pruneCandidates(
        r.finishedPhotoPath ? [r.finishedPhotoPath] : [],
        () => readSqlImagePaths(this.driver),
      );
    });
  }
  listCookingRecords(recipeId: string, limit?: number, cursor?: CookingCursor) {
    return this.coordinator.withDataAccess(() =>
      listCooking(this.driver, recipeId, limit, cursor),
    );
  }
  getCookingSummary(recipeId: string) {
    return this.coordinator.withDataAccess(() =>
      cookingSummary(this.driver, recipeId),
    );
  }
  listRecipeChanges(recipeId: string, limit?: number, cursor?: ChangeCursor) {
    return this.coordinator.withDataAccess(() =>
      listChanges(this.driver, recipeId, limit, cursor),
    );
  }
  setCookingPhotoAsCover(recordId: string) {
    return this.coordinator.withDataAccess(async () => {
      const record = await readCooking(this.driver, recordId);
      if (!record?.finishedPhotoPath) throw new Error("请先添加成品照片");
      const before = await this.readDetails(record.recipeId);
      if (!before) throw new Error("菜谱已删除或不存在");
      await this.writeDetails(
        record.recipeId,
        recipeDetailsSchema.parse({
          ...before,
          coverPath: record.finishedPhotoPath,
        }),
        before,
      );
      const saved = await this.readDetails(record.recipeId);
      if (!saved) throw new Error("保存后无法读取菜谱");
      return saved;
    });
  }

  private async readList(
    search = "",
    limit = 100,
    offset = 0,
    filter: DurationFilter = "all",
  ): Promise<RecipeListItem[]> {
    const literal = search.trim().replace(/[\\%_]/g, "\\$&");
    const rows = await this.driver.query(
      `SELECT recipes.*, (SELECT max(cooked_at) FROM cooking_records WHERE recipe_id=recipes.id) last_cooked_at, (SELECT instruction FROM recipe_preparations WHERE recipe_id=recipes.id ORDER BY position LIMIT 1) preparation_hint FROM recipes WHERE deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM recipe_ingredients WHERE recipe_id=recipes.id AND name LIKE ? ESCAPE '\\')) ${filter === "short" ? "AND total_minutes<=30" : filter === "medium" ? "AND total_minutes>30 AND total_minutes<=60" : filter === "long" ? "AND total_minutes>60" : ""} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
      [
        `%${literal}%`,
        `%${literal}%`,
        Math.min(100, Math.max(1, Math.floor(limit))),
        Math.max(0, Math.floor(offset)),
      ],
    );
    return rows.map((r) => ({
      ...fromRow(r),
      lastCookedAt: z
        .string()
        .nullable()
        .parse((r as Record<string, unknown>).last_cooked_at),
    }));
  }
  private async readDetails(id: string): Promise<RecipeDetails | null> {
    const rows = await this.driver.query(
      "SELECT * FROM recipes WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!rows.length) return null;
    const row = rows[0] as Record<string, unknown>;
    const children = await Promise.all(
      [
        "recipe_ingredients",
        "recipe_steps",
        "recipe_preparations",
        "recipe_key_tips",
      ].map((table) =>
        this.driver.query(
          `SELECT * FROM ${table} WHERE recipe_id=? ORDER BY position`,
          [id],
        ),
      ),
    );
    const input = storedDetailsSchema.parse({
      ...emptyDetails(String(row.title)),
      totalMinutes: row.total_minutes,
      servings: row.servings,
      caloriesPerServing: row.calories_per_serving,
      coverPath: row.cover_path,
      notes: row.notes,
      ingredients: children[0].map((value) => {
        const r = value as Record<string, unknown>;
        return { name: r.name, amount: r.amount };
      }),
      steps: children[1].map((value) => {
        const r = value as Record<string, unknown>;
        return { instruction: r.instruction, imagePath: r.image_path };
      }),
      preparations: children[2].map((value) => {
        const r = value as Record<string, unknown>;
        return {
          instruction: r.instruction,
          minutes: r.minutes,
          timingText: r.timing_text,
        };
      }),
      keyTips: children[3].map((value) => {
        const r = value as Record<string, unknown>;
        return { instruction: r.instruction, stepNumber: r.step_number };
      }),
    });
    return toHistorySnapshot({ ...fromRow(row), ...input });
  }
  private async saveUnlocked(
    id: string,
    input: RecipeDetailsInput,
  ): Promise<void> {
    const value = recipeDetailsSchema.parse(input);
    const before = await this.readDetails(id);
    if (!before) throw new Error("菜谱已删除或不存在，请返回列表");
    if (!this.driver.batch) throw new Error("数据层不支持原子保存");
    await this.writeDetails(id, value, before);
  }
  private async createDetailsUnlocked(
    input: RecipeDetailsInput,
  ): Promise<RecipeDetails> {
    const value = recipeDetailsSchema.parse(input);
    const id = crypto.randomUUID();
    await this.writeDetails(id, value, null);
    const saved = await this.readDetails(id);
    if (!saved) throw new Error("保存后无法读取菜谱");
    return saved;
  }
  private async writeDetails(
    id: string,
    value: RecipeDetailsInput,
    before: RecipeDetails | null,
  ) {
    if (before && sameEditableDetails(before, value)) return;
    if (!this.driver.batch) throw new Error("数据层不支持原子保存");
    const now = this.clock().toISOString();
    const statements: Array<{
      statement: string;
      values: (string | number | null)[];
    }> = [];
    if (before)
      statements.push({
        statement:
          "UPDATE recipes SET title=?,total_minutes=?,servings=?,calories_per_serving=?,cover_path=?,notes=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
        values: [
          value.title,
          value.totalMinutes,
          value.servings,
          value.caloriesPerServing,
          value.coverPath,
          value.notes,
          now,
          id,
        ],
      });
    else
      statements.push({
        statement:
          "INSERT INTO recipes(id,title,created_at,updated_at,total_minutes,servings,calories_per_serving,cover_path,notes) VALUES(?,?,?,?,?,?,?,?,?)",
        values: [
          id,
          value.title,
          now,
          now,
          value.totalMinutes,
          value.servings,
          value.caloriesPerServing,
          value.coverPath,
          value.notes,
        ],
      });
    for (const table of [
      "recipe_ingredients",
      "recipe_steps",
      "recipe_preparations",
      "recipe_key_tips",
    ])
      statements.push({
        statement: `DELETE FROM ${table} WHERE recipe_id=?`,
        values: [id],
      });
    value.ingredients.forEach((r, i) =>
      statements.push({
        statement: "INSERT INTO recipe_ingredients VALUES(?,?,?,?)",
        values: [id, i, r.name, r.amount],
      }),
    );
    value.steps.forEach((r, i) =>
      statements.push({
        statement: "INSERT INTO recipe_steps VALUES(?,?,?,?)",
        values: [id, i, r.instruction, r.imagePath],
      }),
    );
    value.preparations.forEach((r, i) =>
      statements.push({
        statement: "INSERT INTO recipe_preparations VALUES(?,?,?,?,?)",
        values: [id, i, r.instruction, r.minutes, r.timingText],
      }),
    );
    value.keyTips.forEach((r, i) =>
      statements.push({
        statement: "INSERT INTO recipe_key_tips VALUES(?,?,?,?)",
        values: [id, i, r.instruction, r.stepNumber],
      }),
    );
    if (before)
      statements.push({
        statement: "INSERT INTO recipe_changes VALUES(?,?,?,?,?)",
        values: [
          crypto.randomUUID(),
          id,
          now,
          JSON.stringify(toHistorySnapshot(before)),
          JSON.stringify(value),
        ],
      });
    await this.driver.batch(statements);
  }
  private async getUnlocked(id: string): Promise<RecipeName | null> {
    const rows = await this.driver.query(
      "SELECT id,title,created_at,updated_at FROM recipes WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    return rows.length ? fromRow(rows[0]) : null;
  }
  private async createUnlocked(title: string): Promise<RecipeName> {
    const value = titleSchema.parse(title);
    const id = crypto.randomUUID();
    const now = this.clock().toISOString();
    await this.driver.run(
      "INSERT INTO recipes(id,title,created_at,updated_at) VALUES(?,?,?,?)",
      [id, value, now, now],
    );
    return { id, title: value, createdAt: now, updatedAt: now };
  }
  private async renameUnlocked(id: string, title: string): Promise<void> {
    const value = titleSchema.parse(title);
    const count = await this.driver.run(
      "UPDATE recipes SET title=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
      [value, this.clock().toISOString(), id],
    );
    if (count !== 1) throw new Error("菜谱已删除或不存在，请返回列表");
  }
  private async removeUnlocked(id: string): Promise<number> {
    const now = this.clock().toISOString();
    const count = await this.driver.run(
      "UPDATE recipes SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
      [now, now, id],
    );
    if (count !== 1) throw new Error("菜谱已删除或不存在");
    return Date.parse(now) + undoMilliseconds;
  }
  private async undoUnlocked(id: string): Promise<boolean> {
    const cutoff = new Date(
      this.clock().getTime() - undoMilliseconds,
    ).toISOString();
    return (
      (await this.driver.run(
        "UPDATE recipes SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at>?",
        [this.clock().toISOString(), id, cutoff],
      )) === 1
    );
  }
  private async purgeUnlocked(): Promise<LibraryCleanupResult> {
    const cutoff = new Date(
      this.clock().getTime() - undoMilliseconds,
    ).toISOString();
    const candidates = await readSqlImagePaths(this.driver, cutoff);
    await this.driver.run(
      "DELETE FROM recipes WHERE deleted_at IS NOT NULL AND deleted_at<=?",
      [cutoff],
    );
    return this.media.pruneCandidates(candidates, () =>
      readSqlImagePaths(this.driver),
    );
  }
}
