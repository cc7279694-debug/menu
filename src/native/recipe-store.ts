import { z } from "zod";

export const schemaVersion = 1;
export const undoMilliseconds = 5000;
export const schemaStatements = [
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
};
export interface SqlDriver {
  query(sql: string, values?: (string | number)[]): Promise<unknown[]>;
  run(sql: string, values?: (string | number)[]): Promise<number>;
}
function fromRow(value: unknown): RecipeName {
  const row = rowSchema.parse(value);
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** APK-0 projection: no login, taxonomy, cloud IDs or synchronization fields. */
export class RecipeNameStore {
  constructor(
    private readonly driver: SqlDriver,
    private readonly clock = () => new Date(),
  ) {}

  async list(search = "", limit = 100, offset = 0): Promise<RecipeName[]> {
    const literal = search.trim().replace(/[\\%_]/g, "\\$&");
    const rows = await this.driver.query(
      "SELECT id,title,created_at,updated_at FROM recipes WHERE deleted_at IS NULL AND title LIKE ? ESCAPE '\\' ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
      [
        `%${literal}%`,
        Math.min(100, Math.max(1, Math.floor(limit))),
        Math.max(0, Math.floor(offset)),
      ],
    );
    return rows.map(fromRow);
  }
  async get(id: string): Promise<RecipeName | null> {
    const rows = await this.driver.query(
      "SELECT id,title,created_at,updated_at FROM recipes WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    return rows.length ? fromRow(rows[0]) : null;
  }
  async create(title: string): Promise<RecipeName> {
    const value = titleSchema.parse(title);
    const id = crypto.randomUUID();
    const now = this.clock().toISOString();
    await this.driver.run(
      "INSERT INTO recipes(id,title,created_at,updated_at) VALUES(?,?,?,?)",
      [id, value, now, now],
    );
    return { id, title: value, createdAt: now, updatedAt: now };
  }
  async rename(id: string, title: string): Promise<void> {
    const value = titleSchema.parse(title);
    const count = await this.driver.run(
      "UPDATE recipes SET title=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
      [value, this.clock().toISOString(), id],
    );
    if (count !== 1) throw new Error("菜谱已删除或不存在，请返回列表");
  }
  async remove(id: string): Promise<number> {
    const now = this.clock().toISOString();
    const count = await this.driver.run(
      "UPDATE recipes SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
      [now, now, id],
    );
    if (count !== 1) throw new Error("菜谱已删除或不存在");
    return Date.parse(now) + undoMilliseconds;
  }
  async undo(id: string): Promise<boolean> {
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
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(
      this.clock().getTime() - undoMilliseconds,
    ).toISOString();
    await this.driver.run(
      "DELETE FROM recipes WHERE deleted_at IS NOT NULL AND deleted_at<=?",
      [cutoff],
    );
  }
}
