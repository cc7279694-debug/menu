import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import {
  getLocalDatabase,
  __resetLocalDatabaseForTests,
} from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { emptyDetails } from "./recipe-model";
import { DataOperationCoordinator } from "./backup/coordinator";
import { deferred } from "./ai/service.test-support";
afterEach(__resetLocalDatabaseForTests);
it("uses the existing local table and persists full details across repository reopen", async () => {
  const store = new PreviewRecipeLibrary();
  const r = await store.create("啤酒鸭");
  await store.saveDetails(r.id, {
    ...emptyDetails(r.title),
    totalMinutes: 30,
    ingredients: [{ name: "鸭肉", amount: "500克" }],
    steps: [{ instruction: "焖煮", imagePath: null }],
    keyTips: [{ instruction: "小火", stepNumber: 1 }],
  });
  const reopened = new PreviewRecipeLibrary();
  expect((await reopened.getDetails(r.id))?.ingredients).toEqual([
    { name: "鸭肉", amount: "500克" },
  ]);
  expect(await reopened.list("鸭肉", 100, 0, "short")).toHaveLength(1);
  expect(await reopened.list("%")).toEqual([]);
  expect(await (await getLocalDatabase()).localRecipes.count()).toBe(1);
});
it("preserves related data through undo then clears only the recipe and its history", async () => {
  let now = 10000;
  const store = new PreviewRecipeLibrary(() => new Date(now));
  const r = await store.create("鸭");
  await store.saveDetails(r.id, { ...emptyDetails("鸭"), notes: "少盐" });
  await store.remove(r.id);
  now += 4000;
  expect(await store.undo(r.id)).toBe(true);
  expect((await store.getDetails(r.id))?.notes).toBe("少盐");
  await store.remove(r.id);
  now += 5000;
  await store.purgeExpired();
  expect(await store.getDetails(r.id)).toBeNull();
  expect(await (await getLocalDatabase()).recipeChanges.count()).toBe(0);
});
it("does not create a partial recipe when validation fails", async () => {
  const store = new PreviewRecipeLibrary();
  await expect(
    store.createDetails({ ...emptyDetails("鸭"), totalMinutes: -1 }),
  ).rejects.toThrow();
  expect(await store.list()).toEqual([]);
  const r = await store.createDetails({ ...emptyDetails("鸭"), notes: "少盐" });
  expect((await store.getDetails(r.id))?.notes).toBe("少盐");
});
it("normalizes identical edits without writing history or changing update time", async () => {
  let now = Date.parse("2026-10-04T01:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(now++)),
    r = await store.createDetails(emptyDetails("鸭"));
  await store.saveDetails(r.id, emptyDetails("  鸭  "));
  expect((await store.getDetails(r.id))?.updatedAt).toBe(r.updatedAt);
  expect(await store.listRecipeChanges(r.id)).toEqual([]);
});
it("creation UUID retries preserve all child IDs/times without new history and reject conflicts or soft deletion",async()=>{
  const store=new PreviewRecipeLibrary(),id=crypto.randomUUID(),input={...emptyDetails("鸭"),ingredients:[{name:"鸭",amount:"适量"}],steps:[{instruction:"煮熟",imagePath:null}]};
  const first=await store.createDetails(input,id),db=await getLocalDatabase(),row=await db.localRecipes.get(id);expect(first.id).toBe(id);
  expect(await store.createDetails(input,id)).toEqual(first);expect(await db.localRecipes.get(id)).toEqual(row);expect(await db.recipeChanges.count()).toBe(0);
  await expect(store.createDetails({...input,notes:"不同"},id)).rejects.toThrow();await store.remove(id);await expect(store.createDetails(input,id)).rejects.toThrow();expect(await store.getDetails(id)).toBeNull();
  await expect(store.createDetails(input,"bad-uuid")).rejects.toThrow();
});
it("exact title check is full-library and excludes deleted records",async()=>{
  const store=new PreviewRecipeLibrary();await store.create("鸭");for(let i=0;i<101;i++)await store.create(`后来的菜${i}`);expect(await store.hasExactTitle("  鸭  ")).toBe(true);expect(await store.hasExactTitle("% OR 1=1")).toBe(false);
  const deleted=await store.create("已删除");await store.remove(deleted.id);expect(await store.hasExactTitle("已删除")).toBe(false);
});
it("FIFO rechecks current AI generation before DB access, and save-first remains normal",async()=>{
  const gate=new DataOperationCoordinator(),store=new PreviewRecipeLibrary(undefined,gate),hold=deferred<void>(),entered=deferred<void>();
  const replace=gate.withExclusive(async()=>{entered.resolve();await hold.promise;});await entered.promise;
  let valid=true;const pending=store.createDetails(emptyDetails("旧草稿"),crypto.randomUUID(),()=>{if(!valid)throw new Error("stale");});const rejected=expect(pending).rejects.toThrow("stale");valid=false;hold.resolve();await replace;await rejected;
  expect(await (await getLocalDatabase()).localRecipes.count()).toBe(0);
  const first=store.createDetails(emptyDetails("正常"),crypto.randomUUID(),()=>{});const second=gate.withExclusive(async()=>expect(await (await getLocalDatabase()).localRecipes.count()).toBe(1));await first;await second;
});
