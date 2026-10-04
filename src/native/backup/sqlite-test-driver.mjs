import { DatabaseSync } from "node:sqlite";
import { schemaStatements, schemaVersion } from "../recipe-store";
export function testDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  schemaStatements.forEach((s) => db.exec(s));
  db.exec(`PRAGMA user_version=${schemaVersion}`);
  const tx = {
    query: async (sql, values = []) => db.prepare(sql).all(...values),
    run: async (sql, values = []) =>
      Number(db.prepare(sql).run(...values).changes),
    batch: async (statements) => {
      for (const s of statements) db.prepare(s.statement).run(...s.values);
    },
  };
  const driver = {
    ...tx,
    batch: async (statements) =>
      driver.transaction(async (t) => t.batch(statements)),
    transaction: async (work) => {
      db.exec("BEGIN");
      try {
        const value = await work(tx);
        db.exec("COMMIT");
        return value;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, driver };
}
