// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { testDatabase } from "../backup/sqlite-test-driver.mjs";
import { SQLiteBackupRepository } from "../backup/repository";
import { DataOperationCoordinator } from "../backup/coordinator";
import { goldenSource, goldenAssets, manifestFor, time } from "../backup/test-fixtures";
import { toPortableData, fromPortableData } from "../backup/references";
import { validateBackupData } from "../backup/compatibility";
import { RecipeNameStore } from "../recipe-store";
import { emptyDetails } from "../recipe-model";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { FindRecipeService } from "./service";

const databases = [];
const privateSession = {
  query: "GENERATED_FIND_QUERY_ONLY",
  preference: "GENERATED_FIND_PREFERENCE_ONLY",
  candidateId: "GENERATED_FIND_CANDIDATE_ID_ONLY",
  sourceUrl: "https://recipes.example.com/generated-duck?mode=GENERATED_SOURCE_TOKEN_ONLY",
  sourceHost: "recipes.example.com",
  summary: "GENERATED_CANDIDATE_SUMMARY_ONLY",
  highlight: "GENERATED_CANDIDATE_HIGHLIGHT_ONLY",
  sourceTextMarker: "GENERATED_EXTRACTOR_OUTPUT_ONLY",
  rawMarker: "GENERATED_RAW_RESPONSE_ONLY",
  fieldCheckMarker: "GENERATED_FIELD_CHECK_ONLY",
};
afterEach(() => databases.splice(0).forEach(db => db.close()));

function setupDatabase() {
  const { db, driver } = testDatabase();
  databases.push(db);
  const gate = new DataOperationCoordinator();
  return {
    db,
    store: new RecipeNameStore(driver, () => new Date(time), gate),
    repo: new SQLiteBackupRepository(driver, gate, () => new Date(time)),
  };
}

function databaseContents(db) {
  return JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    .map(({ name }) => ({ name, rows: db.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all() })));
}

function assertNoSessionMaterial(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  for (const marker of Object.values(privateSession)) expect(text).not.toContain(marker);
  expect(text).not.toMatch(/sourceUrl|sourceHost|searchQuery|rawJson|fieldChecks|web_search_call|web_extractor_call/);
}

function setupFinder(store, recipeOverrides = {}) {
  const recipe = {
    ...emptyDetails("测试啤酒鸭 🍗"),
    totalMinutes: 25,
    ingredients: [{ name: "鸭肉", amount: "500克" }, { name: "盐", amount: "适量" }],
    steps: [{ instruction: "小火焖25分钟", imagePath: null }, { instruction: "最后收汁", imagePath: null }],
    notes: "人工确认的做法\n下次少放盐。",
    keyTips: [{ instruction: "收汁时不要离开", stepNumber: 2 }],
    ...recipeOverrides,
  };
  const modelOutput = {
    recipe,
    fieldChecks: [
      { path: "totalMinutes", label: "耗时", status: "explicit", message: null },
      { path: "servings", label: "份数", status: "missing", message: privateSession.fieldCheckMarker },
    ],
    warnings: [privateSession.rawMarker],
  };
  const candidate = {
    id: privateSession.candidateId,
    title: "公开网页中的啤酒鸭",
    sourceUrl: privateSession.sourceUrl,
    sourceHost: privateSession.sourceHost,
    summary: privateSession.summary,
    highlights: [privateSession.highlight],
    totalMinutes: null,
    preparationHint: "",
  };
  const rawJson = JSON.stringify(modelOutput);
  const port = {
    createSession: vi.fn(async () => ({ sessionId: randomUUID() })),
    search: vi.fn(async () => ({ candidates: [candidate] })),
    extract: vi.fn(async () => ({
      rawJson,
      sourceText: `鸭肉500克，盐适量，小火焖25分钟，最后收汁。${privateSession.sourceTextMarker}`,
    })),
    cancel: vi.fn(async () => {}),
    discardSession: vi.fn(async () => {}),
  };
  const fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const finder = new FindRecipeService({ port, ai });
  finder.updateInput(privateSession.query, privateSession.preference);
  return { finder, ai, fake, port, recipe, rawJson };
}

it("Find search and editable Preview leave SQLite and Backup2 unchanged until explicit confirmed save", async () => {
  const { db, store, repo } = setupDatabase();
  await repo.replace(goldenSource(), { operationId: "generated", generationId: "generated", dataSha256: "a".repeat(64), committedAt: time });
  const before = databaseContents(db), sourceBefore = await repo.snapshot();
  const { finder, ai, fake } = setupFinder(store);
  await finder.search();
  expect(finder.snapshot().candidates).toHaveLength(1);
  expect(databaseContents(db)).toBe(before);
  expect(await repo.snapshot()).toEqual(sourceBefore);
  await finder.extract(privateSession.candidateId);
  expect(finder.snapshot().phase).toBe("preview");
  expect(ai.snapshot().draft.recipe.title).toBe("测试啤酒鸭 🍗");
  expect(ai.snapshot().draft.review.requiresConfirmation).toBe(true);
  await expect(finder.save(ai.snapshot().draft.recipe)).rejects.toMatchObject({ code: "review_required" });
  expect(databaseContents(db)).toBe(before);
  const data = toPortableData(await repo.snapshot(), goldenAssets());
  assertNoSessionMaterial(databaseContents(db));
  assertNoSessionMaterial(data);
  expect(fake.bridge.organize).not.toHaveBeenCalled();
  await finder.discard();
  expect(finder.snapshot()).toMatchObject({ phase: "input", dish: "", preference: "", candidates: [], selected: null });
  expect(await repo.snapshot()).toEqual(sourceBefore);
});

it("confirmed Find saves an ordinary SQLite recipe whose Backup2 restore retains data but no Find provenance", async () => {
  const { db, store, repo } = setupDatabase();
  await repo.replace(goldenSource(), { operationId: "generated", generationId: "generated", dataSha256: "a".repeat(64), committedAt: time });
  const { finder, ai, fake, recipe, rawJson } = setupFinder(store);
  await finder.search();
  await finder.extract(privateSession.candidateId);
  ai.setConfirmed(true);
  const edited = { ...ai.snapshot().draft.recipe, notes: "确认后手动调整\n保留中文和 Emoji 🍚" };
  const saved = await finder.save(edited);
  expect(await store.getDetails(saved.id)).toEqual(saved);
  expect(saved).toMatchObject({ title: "测试啤酒鸭 🍗", totalMinutes: 25, ingredients: recipe.ingredients, notes: edited.notes, coverPath: null });
  expect(saved.id).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);
  expect(saved.createdAt).toBe(time);
  expect(saved.updatedAt).toBe(time);
  expect(finder.snapshot()).toMatchObject({ phase: "saved", dish: "", preference: "", candidates: [], selected: null });
  expect(ai.snapshot()).toMatchObject({ phase: "saved", input: { text: "", imageIds: [] }, draft: null, operationId: null, images: [] });
  expect(fake.bridge.organize).not.toHaveBeenCalled();

  // Exercise the existing secondary persistence paths, not just a fresh Recipe row.
  await store.saveDetails(saved.id, { ...edited, notes: "又一次手动修改 🍚" });
  const cooking = await store.recordCooking(saved.id, randomUUID());
  await store.updateCookingRecord(cooking.id, { finishedPhotoPath: null, evaluation: "tasty", note: "测试成品" });
  const source = await repo.snapshot(), data = toPortableData(source, goldenAssets());
  const checked = validateBackupData(data, manifestFor(data));
  expect(checked.manifest).toMatchObject({ formatVersion: 2, databaseSchemaVersion: 4 });
  expect(data.recipes).toHaveLength(2);
  expect(data.recipes.find(r => r.id === saved.id)).toMatchObject({ title: "测试啤酒鸭 🍗", notes: "又一次手动修改 🍚", coverAssetId: null, createdAt: time, updatedAt: time });
  expect(data.changes.filter(c => c.recipeId === saved.id)).toHaveLength(1);
  expect(data.cookingRecords.filter(c => c.recipeId === saved.id)).toHaveLength(1);
  expect(Object.keys(data).sort()).toEqual(["changes", "cookingRecords", "ingredients", "keyTips", "preparations", "recipes", "settings", "steps"].sort());
  assertNoSessionMaterial(databaseContents(db));
  assertNoSessionMaterial(data);
  expect(databaseContents(db)).not.toContain(rawJson);
  expect(JSON.stringify(data)).not.toContain(rawJson);
  expect(db.prepare("PRAGMA user_version").get().user_version).toBe(4);

  const restored = setupDatabase();
  const paths = Object.fromEntries(goldenAssets().map(asset => [asset.assetId, asset.sourcePath]));
  await restored.repo.replace(fromPortableData(checked.data, paths), { operationId: "restored", generationId: "restored", dataSha256: "b".repeat(64), committedAt: time });
  expect(await restored.repo.snapshot()).toEqual(source);
  expect(await restored.store.getDetails(saved.id)).toEqual(await store.getDetails(saved.id));
  expect((await restored.store.list("测试啤酒鸭")).map(r => r.id)).toEqual([saved.id]);
  expect((await restored.store.listCookingRecords(saved.id))[0]).toMatchObject({ id: cooking.id, evaluation: "tasty", note: "测试成品" });
  expect((await restored.store.listRecipeChanges(saved.id))).toHaveLength(1);
  assertNoSessionMaterial(databaseContents(restored.db));
  expect(restored.db.prepare("PRAGMA user_version").get().user_version).toBe(4);
});

it("JSON escaped source URL cannot enter Preview notes or reach SQLite or Backup2", async () => {
  const { db, store, repo } = setupDatabase();
  const { finder, ai, port, rawJson } = setupFinder(store, { notes: privateSession.sourceUrl });
  const escaped = rawJson.replaceAll("https://", "https:\\/\\/");
  expect(escaped).not.toContain("https://");
  port.extract.mockResolvedValueOnce({ rawJson: escaped, sourceText: "鸭肉500克，盐适量，小火焖25分钟，最后收汁。" });
  await finder.search();
  await expect(finder.extract(privateSession.candidateId)).rejects.toMatchObject({ code: "invalid_output" });
  expect(finder.snapshot().phase).toBe("results");
  expect(ai.snapshot().draft).toBeNull();
  expect(await store.list()).toEqual([]);
  assertNoSessionMaterial(databaseContents(db));
  const data = toPortableData(await repo.snapshot(), []);
  expect(data.recipes).toEqual([]);
  assertNoSessionMaterial(data);
});
