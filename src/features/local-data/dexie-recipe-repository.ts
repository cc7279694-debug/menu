import { getLocalDatabase } from "@/features/offline/local-db";

import type { RecipeRepository } from "./recipe-repository";
import type { LocalRecipeRecord, LocalRecipeWriteInput } from "./types";

function createUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new Error("Secure random UUID generation is unavailable");
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

class DexieRecipeRepository implements RecipeRepository {
  async list(options: { includeDeleted?: boolean } = {}): Promise<LocalRecipeRecord[]> {
    const database = await getLocalDatabase();
    const records = await database.localRecipes.orderBy("updatedAt").reverse().toArray();
    return options.includeDeleted ? records : records.filter((record) => record.deletedAt === null);
  }

  async get(id: string): Promise<LocalRecipeRecord | null> {
    const database = await getLocalDatabase();
    return (await database.localRecipes.get(id)) ?? null;
  }

  async save(input: LocalRecipeWriteInput): Promise<LocalRecipeRecord> {
    const database = await getLocalDatabase();
    const id = input.id ?? createUuid();
    const existing = await database.localRecipes.get(id);
    const now = new Date().toISOString();
    const record: LocalRecipeRecord = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: existing?.deletedAt ?? null,
    };

    await database.localRecipes.put(record);
    return record;
  }

  async moveToTrash(id: string): Promise<void> {
    await this.updateDeletionState(id, new Date().toISOString());
  }

  async restore(id: string): Promise<void> {
    await this.updateDeletionState(id, null);
  }

  async permanentlyDelete(id: string): Promise<void> {
    const database = await getLocalDatabase();
    await database.localRecipes.delete(id);
  }

  private async updateDeletionState(id: string, deletedAt: string | null): Promise<void> {
    const database = await getLocalDatabase();
    const existing = await database.localRecipes.get(id);
    if (!existing) return;

    await database.localRecipes.put({
      ...existing,
      deletedAt,
      updatedAt: new Date().toISOString(),
    });
  }
}

export function createDexieRecipeRepository(): RecipeRepository {
  return new DexieRecipeRepository();
}
