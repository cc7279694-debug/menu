// @vitest-environment node
// Real SQLite/files/hashes. Archive protocol is a file-backed test port;
// ZIP and provider integrity are covered by Java and connected Android tests.
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { BackupService } from "./service";
import { reconcileRestore } from "./restore-recovery";
import { SQLiteBackupRepository, canonicalSource } from "./repository";
import { DataOperationCoordinator } from "./coordinator";
import { collectImageReferences, toPortableData } from "./references";
import { validateBackupData } from "./compatibility";
import { testDatabase } from "./sqlite-test-driver.mjs";
import { goldenSource, manifestFor, time } from "./test-fixtures";
import {RecipeNameStore} from "../recipe-store";
import {AiIntakeService} from "../ai/service";
import {emptyDetails} from "../recipe-model";
import {fakeAi} from "../ai/service.test-support";
const resources = [];
const hash = (b) => createHash("sha256").update(b).digest("hex");
const empty = () => ({
  sourceSchemaVersion: 4,
  recipes: [],
  ingredients: [],
  steps: [],
  preparations: [],
  keyTips: [],
  changes: [],
  cookingRecords: [],
  settings: {},
});
class FilePort {
  constructor(root, repository) {
    this.root = root;
    this.repository = repository;
    this.backup = null;
    this.generation = null;
    this.token = null;
    this.fault = "";
    this.finishes = 0;
  }
  async chooseExport() {
    this.token = randomUUID();
    return { token: this.token };
  }
  async inspectMedia(token, paths) {
    return paths.map((sourcePath) => {
      const bytes = readFileSync(join(this.root, sourcePath)),
        assetId = hash(bytes);
      return {
        sourcePath,
        assetId,
        path: `media/${assetId}.png`,
        mimeType: "image/png",
        size: bytes.length,
        sha256: assetId,
      };
    });
  }
  async writeExport(token, data) {
    const assets = await this.inspectMedia(
      token,
      collectImageReferences(await this.repository.snapshot()),
    );
    const manifest = manifestFor(data, assets);
    manifest.dataFile.sha256 = hash(JSON.stringify(data));
    validateBackupData(data, manifest);
    this.backup = {
      data,
      manifest,
      bytes: Object.fromEntries(
        assets.map((a) => [
          a.assetId,
          readFileSync(join(this.root, a.sourcePath)),
        ]),
      ),
    };
    return {
      manifest,
      fileName: "test.recipio",
      size: JSON.stringify(data).length,
      sha256: manifest.dataFile.sha256,
    };
  }
  async chooseRestore() {
    if (this.fault === "invalid") throw new Error("损坏文件");
    this.token = randomUUID();
    return {
      token: this.token,
      ...validateBackupData(this.backup.data, this.backup.manifest),
    };
  }
  async stageMedia() {
    this.generation = randomUUID();
    const dir = join(this.root, "images", `generation-${this.generation}`);
    mkdirSync(dir);
    const paths = {};
    for (const [id, bytes] of Object.entries(this.backup.bytes)) {
      writeFileSync(join(dir, `${id}.png`), bytes);
      paths[id] = `images/generation-${this.generation}/${id}.png`;
      if (this.fault === "stage") throw new Error("stage IO failed");
    }
    this.journal = {
      operationId: this.token,
      generationId: this.generation,
      dataSha256: this.backup.manifest.dataFile.sha256,
      phase: "staged",
    };
    return { generationId: this.generation, paths };
  }
  async createSafetySnapshot(token, data, paths) {
    if (this.fault === "safety") throw new Error("safety IO failed");
    const bytes = Object.fromEntries(
      Object.entries(paths).map(([id, path]) => [
        id,
        readFileSync(join(this.root, path)).toString("base64"),
      ]),
    );
    this.safety = { data, bytes };
    writeFileSync(join(this.root, "safety.json"), JSON.stringify(this.safety));
    return {
      size: existsSync(join(this.root, "safety.json")) ? 1 : 0,
      sha256: hash(JSON.stringify(this.safety)),
    };
  }
  async writeJournal(token, phase, dataSha256, generationId) {
    this.journal = { operationId: token, phase, dataSha256, generationId };
  }
  async readJournal() {
    if (this.fault === "journal") throw new Error("corrupt journal");
    return this.journal ?? null;
  }
  async verifyPaths(paths) {
    for (const p of paths) readFileSync(join(this.root, p));
  }
  async finishOperation() {
    this.finishes++;
    if (this.fault === "cleanup") throw new Error("cleanup IO failed");
    await this.cleanupOrphans();
  }
  async discard() {
    await this.finishOperation();
  }
  async cleanupOrphans() {
    if (this.generation) {
      const s = await this.repository.snapshot(),
        c = await this.repository.readRestoreCommit();
      if (
        c?.generationId !== this.generation &&
        !collectImageReferences(s).some((p) =>
          p.startsWith(`images/generation-${this.generation}/`),
        )
      )
        rmSync(join(this.root, "images", `generation-${this.generation}`), {
          recursive: true,
          force: true,
        });
    }
    this.journal = null;
  }
  async status() {
    return { phase: "idle" };
  }
}
async function setup() {
  const root = mkdtempSync(join(tmpdir(), "recipio-backup-"));
  mkdirSync(join(root, "images"));
  const { db, driver } = testDatabase();
  resources.push({ root, db });
  const coordinator=new DataOperationCoordinator();
  const repo = new SQLiteBackupRepository(
    driver,
    coordinator,
    () => new Date(time),
  );
  const source = goldenSource();
  for (const [i, path] of collectImageReferences(source).entries())
    writeFileSync(
      join(root, path),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, i]),
    );
  await repo.replace(source, {
    operationId: randomUUID(),
    generationId: randomUUID(),
    dataSha256: "e".repeat(64),
    committedAt: time,
  });
  const port = new FilePort(
    root,
    new SQLiteBackupRepository(driver, null, () => new Date(time)),
  );
  const service = new BackupService(repo, port, () => new Date(time));
  await service.export();
  return { root, db, repo, source, port, service,driver,coordinator };
}
afterEach(() =>
  resources.splice(0).forEach(({ db, root }) => {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }),
);
it("round trips all tables, history images, IDs, times and sorting through real SQLite/files", async () => {
  const { repo, source, port, service, root } = await setup();
  const expected = port.backup.data;
  await repo.replace(empty(), {
    operationId: randomUUID(),
    generationId: randomUUID(),
    dataSha256: "e".repeat(64),
    committedAt: time,
  });
  await service.inspectRestore();
  expect(service.getState().phase).toBe("preview");
  expect((await repo.snapshot()).recipes).toHaveLength(0);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
  const restored = await repo.snapshot();
  expect(
    toPortableData(
      restored,
      await port.inspectMedia(port.token, collectImageReferences(restored)),
    ),
  ).toEqual(expected);
  for (const path of collectImageReferences(source))
    expect(existsSync(join(root, path))).toBe(true);
  for (const path of collectImageReferences(restored))
    expect(readFileSync(join(root, path)).length).toBe(9);
  expect(existsSync(join(root, "safety.json"))).toBe(true);
});
it.each(["invalid", "stage", "safety"])(
  "%s failure preserves original rows and old images",
  async (fault) => {
    const { repo, port, service, source, root } = await setup();
    const before = canonicalSource(await repo.snapshot());
    port.fault = fault;
    await service.inspectRestore();
    if (service.getState().phase === "preview") await service.confirmReplace();
    expect(service.getState().phase).toBe("error");
    expect(canonicalSource(await repo.snapshot())).toBe(before);
    for (const p of collectImageReferences(source))
      expect(existsSync(join(root, p))).toBe(true);
  },
);
it("insertion failure rolls back all original rows and metadata", async () => {
  const { repo, db, service } = await setup();
  const before = canonicalSource(await repo.snapshot()),
    commit = await repo.readRestoreCommit();
  await service.inspectRestore();
  db.exec(
    "CREATE TRIGGER fail_restore BEFORE INSERT ON recipes BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  await service.confirmReplace();
  expect(service.getState().phase).toBe("error");
  expect(canonicalSource(await repo.snapshot())).toBe(before);
  expect(await repo.readRestoreCommit()).toEqual(commit);
});
it("cancel after staging changes no DB and duplicate confirms commit just once", async () => {
  const { repo, port, service } = await setup();
  const before = canonicalSource(await repo.snapshot());
  await service.inspectRestore();
  await service.cancel();
  expect(canonicalSource(await repo.snapshot())).toBe(before);
  expect(service.getState().phase).toBe("cancelled");
  await service.inspectRestore();
  await Promise.all([service.confirmReplace(), service.confirmReplace()]);
  expect(service.getState().phase).toBe("success");
  expect(port.finishes).toBeGreaterThan(0);
});
it("current-count change requires an updated preview and another confirmation", async () => {
  const { repo, service } = await setup();
  await service.inspectRestore();
  const changed = await repo.snapshot();
  changed.recipes.push({ ...changed.recipes[0], id: "new", coverPath: null });
  await repo.replace(changed, {
    operationId: randomUUID(),
    generationId: randomUUID(),
    dataSha256: "e".repeat(64),
    committedAt: time,
  });
  await service.confirmReplace();
  expect(service.getState()).toMatchObject({
    phase: "preview",
    currentCount: 2,
  });
  expect((await repo.snapshot()).recipes).toHaveLength(2);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
});
it("AI save-first uses the same FIFO, requires Replace re-confirmation and enters verified safety copy",async()=>{
  const {driver,coordinator,service,repo,port}=await setup(),fake=fakeAi(),store=new RecipeNameStore(driver,()=>new Date(time),coordinator),ai=new AiIntakeService(fake.keys,fake.bridge,{store,backup:service});
  await service.inspectRestore();await ai.startSession();await ai.organize({text:"菜谱",imageIds:[]});ai.setConfirmed(true);
  const save=ai.save(emptyDetails("新做法")),replace=service.confirmReplace();const recipe=await save;await replace;
  expect(service.getState()).toMatchObject({phase:"preview",currentCount:2});expect((await repo.snapshot()).recipes.filter(r=>r.id===recipe.id)).toHaveLength(1);
  await service.confirmReplace();expect(service.getState().phase).toBe("success");expect(port.safety.data.recipes.find(r=>r.id===recipe.id)?.title).toBe("新做法");expect((await repo.snapshot()).recipes).toHaveLength(1);expect(ai.snapshot().draft).toBeNull();
});
it("actual SQL Replace-first invalidates queued AI before its first query or insert",async()=>{
  const {driver,coordinator,repo,port}=await setup();
  let release,entered;const started=new Promise(resolve=>{entered=resolve;});const held=new Promise(resolve=>{release=resolve;});
  const wrapper={snapshot:()=>repo.snapshot(),withPinnedSnapshot:work=>repo.withPinnedSnapshot(work),replace:(...args)=>repo.replace(...args),readRestoreCommit:()=>repo.readRestoreCommit(),exclusive:work=>repo.exclusive(async locked=>{entered();await held;return work(locked);})};
  const service=new BackupService(wrapper,port,()=>new Date(time)),fake=fakeAi(),store=new RecipeNameStore(driver,()=>new Date(time),coordinator),ai=new AiIntakeService(fake.keys,fake.bridge,{store,backup:service});
  await ai.startSession();await ai.organize({text:"旧菜谱",imageIds:[]});ai.setConfirmed(true);await service.inspectRestore();
  const restore=service.confirmReplace();await started;
  let creationId,aiQueries=0;const create=store.createDetails.bind(store),query=driver.query;
  store.createDetails=(...args)=>{creationId=args[1];return create(...args);};driver.query=(sql,values=[])=>{if(creationId&&values.includes(creationId))aiQueries++;return query(sql,values);};
  const pending=ai.save(emptyDetails("迟到草稿")),rejected=expect(pending).rejects.toMatchObject({code:"stale_session"});
  release();await restore;await rejected;expect(service.getState().phase).toBe("success");expect(aiQueries).toBe(0);expect(await store.hasExactTitle("迟到草稿")).toBe(false);
});
it("lost commit acknowledgement is resolved from actual transaction metadata", async () => {
  const { repo, port } = await setup();
  const wrapper = {
    ...repo,
    exclusive: (work) =>
      repo.exclusive((locked) =>
        work({
          snapshot: () => locked.snapshot(),
          readRestoreCommit: () => locked.readRestoreCommit(),
          replace: async (s, c) => {
            await locked.replace(s, c);
            throw new Error("lost acknowledgement");
          },
        }),
      ),
    snapshot: () => repo.snapshot(),
  };
  const service = new BackupService(wrapper, port, () => new Date(time));
  await service.inspectRestore();
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
  await port.verifyPaths(collectImageReferences(await repo.snapshot()));
});
it("cleanup failure reports committed success with warning, not false restore failure", async () => {
  const { port, service } = await setup();
  await service.inspectRestore();
  port.fault = "cleanup";
  await service.confirmReplace();
  expect(service.getState()).toMatchObject({ phase: "success" });
  expect(service.getState().warning).toBeTruthy();
});
it("startup follows committed empty DB metadata, ignores stale phase and never replaces again", async () => {
  const { repo, port, service } = await setup();
  port.backup = {
    data: toPortableData(empty(), []),
    manifest: manifestFor(toPortableData(empty(), []), []),
    bytes: {},
  };
  await service.inspectRestore();
  await service.confirmReplace();
  port.journal = {
    operationId: port.token,
    generationId: port.generation,
    dataSha256: port.backup.manifest.dataFile.sha256,
    phase: "staged",
  };
  await reconcileRestore(repo, port);
  expect((await repo.snapshot()).recipes).toHaveLength(0);
  expect(await repo.readRestoreCommit()).not.toBeNull();
});
it("broken journal prevents startup cleanup and preserves rows/files", async () => {
  const { repo, port, root } = await setup();
  const before = canonicalSource(await repo.snapshot());
  port.fault = "journal";
  await expect(reconcileRestore(repo, port)).rejects.toThrow();
  expect(canonicalSource(await repo.snapshot())).toBe(before);
  expect(existsSync(root)).toBe(true);
});
it("failed export forwards the native incomplete-document cleanup warning without changing data", async () => {
  const { repo, port, service } = await setup();
  const before = canonicalSource(await repo.snapshot());
  port.writeExport = async () => {
    throw new Error("archive failed");
  };
  port.discard = async () => {
    throw new Error("系统可能残留未完成的备份文件，不能用作备份，请手动删除。");
  };
  await service.export();
  expect(service.getState()).toMatchObject({
    phase: "error",
    message: "archive failed",
  });
  expect(service.getState().warning).toContain("未完成的备份文件");
  expect(canonicalSource(await repo.snapshot())).toBe(before);
});
it("commit cannot be cancelled in flight and unreadable SQL outcome retains generation", async () => {
  const { repo, port, root } = await setup();
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let committing = false;
  const wrapper = {
    snapshot: () => repo.snapshot(),
    exclusive: (work) =>
      repo.exclusive((locked) =>
        work({
          snapshot: () => locked.snapshot(),
          replace: async () => {
            committing = true;
            await gate;
            throw new Error("lost response");
          },
          readRestoreCommit: async () => {
            throw new Error("cannot read");
          },
        }),
      ),
  };
  const service = new BackupService(wrapper, port, () => new Date(time));
  await service.inspectRestore();
  const confirm = service.confirmReplace();
  while (!committing) await new Promise((r) => setTimeout(r, 1));
  await service.cancel();
  expect(service.getState().phase).toBe("restoring");
  release();
  await confirm;
  expect(service.getState().phase).toBe("uncertain");
  expect(
    existsSync(join(root, "images", `generation-${port.generation}`)),
  ).toBe(true);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("uncertain");
});
it("valid v1 restore clears only absent cooking history after confirmation and preserves it in v2 safety", async () => {
  const { repo, port, service } = await setup();
  const { cookingRecords, ...data } = port.backup.data;
  expect(cookingRecords).toEqual([]);
  const m = manifestFor(data, port.backup.manifest.media);
  m.dataFile.sha256 = hash(JSON.stringify(data));
  port.backup = { ...port.backup, data, manifest: m };
  const current = await repo.snapshot();
  current.cookingRecords = [
    {
      id: "current-cooking",
      recipeId: current.recipes[0].id,
      cookedAt: time,
      finishedPhotoPath: current.recipes[0].coverPath,
      evaluation: null,
      note: null,
    },
  ];
  await repo.replace(current, {
    operationId: randomUUID(),
    generationId: randomUUID(),
    dataSha256: "e".repeat(64),
    committedAt: time,
  });
  await service.inspectRestore();
  expect(service.getState().phase).toBe("preview");
  expect((await repo.snapshot()).cookingRecords).toHaveLength(1);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
  expect((await repo.snapshot()).cookingRecords).toEqual([]);
  expect(port.safety.data.cookingRecords).toHaveLength(1);
  expect((await repo.readRestoreCommit()).dataSha256).toBe(m.dataFile.sha256);
});
