// Dedicated generated-data Android acceptance, never a phone or a personal database.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { device, delay } from "./android-webview.mjs";

const [adbPath, serial, mode, apk] = process.argv.slice(2);
assert(
  [
    "baseline",
    "upgrade",
    "flows",
    "media",
    "backup",
    "offline",
    "narrow",
    "reinstall",
    "final-restore",
    "prepare-v10-final",
    "upgrade-final",
  ].includes(mode),
  "Explicit APK-3 mode required",
);
const d = device(adbPath, serial),
  out = resolve("artifacts/cooking-experience");
mkdirSync(out, { recursive: true });
assert.equal(
  d.adb("emu", "avd", "name").split(/\r?\n/)[0].trim(),
  "Recipio_Backup_36",
  "Never switch test target",
);
assert.equal(d.adb("shell", "getprop", "sys.boot_completed"), "1");
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  checks = [];
const pass = (t) => {
  checks.push(t);
  console.log(`PASS: ${t}`);
};
const has = (t) => `document.body.innerText.includes(${JSON.stringify(t)})`;
const query = (sql, values = []) =>
  d.evaluate(
    `window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:${JSON.stringify(sql)},values:${JSON.stringify(values)}}).then(r=>r.values)`,
  );
const execute = (sql) =>
  d.evaluate(
    `window.Capacitor.Plugins.CapacitorSQLite.execute({database:'recipio',statements:${JSON.stringify(sql)},transaction:true})`,
  );
const oldTables = [
  "recipes",
  "recipe_ingredients",
  "recipe_steps",
  "recipe_preparations",
  "recipe_key_tips",
  "recipe_changes",
];
async function rows(cooking = true) {
  const tables = cooking ? [...oldTables, "cooking_records"] : oldTables;
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (t) => [
        t,
        await query(
          `SELECT * FROM ${t} ORDER BY ${t === "recipes" || t === "recipe_changes" || t === "cooking_records" ? "id" : "recipe_id,position"}`,
        ),
      ]),
    ),
  );
}
function mediaBytes(path) {
  assert(
    /^images\/(?:[a-fA-F0-9-]+|generation-[a-fA-F0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(
      path,
    ),
  );
  return d.raw(
    "exec-out",
    "run-as",
    "app.recipio.local",
    "cat",
    `files/${path}`,
  );
}
function portable(r) {
  const image = (p) => (p === null ? null : sha(mediaBytes(p)));
  const detail = (x) => {
    const { coverPath, steps, ...rest } = x;
    return {
      ...rest,
      coverAssetId: image(coverPath),
      steps: steps.map(({ imagePath, ...s }) => ({
        ...s,
        imageAssetId: image(imagePath),
      })),
    };
  };
  const data = {
    recipes: r.recipes.map((x) => ({
      id: x.id,
      title: x.title,
      createdAt: x.created_at,
      updatedAt: x.updated_at,
      totalMinutes: x.total_minutes,
      servings: x.servings,
      caloriesPerServing: x.calories_per_serving,
      coverAssetId: image(x.cover_path),
      notes: x.notes,
    })),
    ingredients: r.recipe_ingredients.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      name: x.name,
      amount: x.amount,
    })),
    steps: r.recipe_steps.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      imageAssetId: image(x.image_path),
    })),
    preparations: r.recipe_preparations.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      minutes: x.minutes,
      timingText: x.timing_text,
    })),
    keyTips: r.recipe_key_tips.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      stepNumber: x.step_number,
    })),
    changes: r.recipe_changes.map((x) => ({
      id: x.id,
      recipeId: x.recipe_id,
      changedAt: x.changed_at,
      before: detail(JSON.parse(x.before_json)),
      after: detail(JSON.parse(x.after_json)),
    })),
    settings: {},
  };
  if (r.cooking_records)
    data.cookingRecords = r.cooking_records.map((x) => ({
      id: x.id,
      recipeId: x.recipe_id,
      cookedAt: x.cooked_at,
      finishedPhotoAssetId: image(x.finished_photo_path),
      evaluation: x.evaluation,
      note: x.note,
    }));
  return data;
}
function canonical(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) =>
      Array.isArray(v) && ["recipes", "changes", "cookingRecords"].includes(k)
        ? [...v].sort((a, b) => a.id.localeCompare(b.id))
        : v,
    ),
  );
}
async function inspect(path) {
  const zip = await JSZip.loadAsync(readFileSync(path)),
    manifest = JSON.parse(await zip.file("manifest.json").async("string")),
    bytes = await zip.file("data.json").async("nodebuffer"),
    data = JSON.parse(bytes);
  assert.equal(bytes.length, manifest.dataFile.size);
  assert.equal(sha(bytes), manifest.dataFile.sha256);
  for (const field of Object.keys(data).filter((k) => k !== "settings"))
    assert.equal(data[field].length, manifest.counts[field]);
  assert.equal(manifest.media.length, manifest.counts.media);
  for (const asset of manifest.media) {
    const b = await zip.file(asset.path).async("nodebuffer");
    assert.equal(b.length, asset.size);
    assert.equal(sha(b), asset.sha256);
  }
  return {
    manifest,
    data,
    path,
    size: readFileSync(path).length,
    sha256: sha(readFileSync(path)),
  };
}
async function click(label) {
  await d.wait(
    `(()=>{const root=document.querySelector('[role=dialog]')||document;const b=[...root.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)});if(!b)return false;b.scrollIntoView({block:'center'});b.click();return true;})()`,
  );
  await delay(100);
}
function xml() {
  d.adb("shell", "uiautomator", "dump", "/sdcard/cooking-picker.xml");
  return d.adb("shell", "cat", "/sdcard/cooking-picker.xml");
}
function tapXml(predicate) {
  const n = (xml().match(/<node\b[^>]*>/g) ?? []).find(predicate);
  if (!n) return false;
  const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(b);
  d.adb(
    "shell",
    "input",
    "tap",
    String((+b[1] + +b[3]) / 2),
    String((+b[2] + +b[4]) / 2),
  );
  return true;
}
async function tap(predicate, label) {
  for (let i = 0; i < 10; i++) {
    if (tapXml(predicate)) {
      await delay(400);
      return;
    }
    await delay(200);
  }
  throw new Error(`System control missing: ${label}\n${xml()}`);
}
async function downloads() {
  let state = xml();
  const root = (n) =>
    n.includes('text="Downloads"') &&
    n.includes('resource-id="android:id/title"');
  if (
    state.includes(
      'resource-id="com.google.android.documentsui:id/breadcrumb_text"',
    ) &&
    state.includes('text="Downloads"') &&
    !(state.match(/<node\b[^>]*>/g) ?? []).some(root)
  )
    return;
  if (!(state.match(/<node\b[^>]*>/g) ?? []).some(root))
    await tap((n) => n.includes('content-desc="Show roots"'), "Show roots");
  await tap(root, "Downloads");
}
async function selectFile(name) {
  await downloads();
  const match = (n) =>
    n.includes(`text="${name}"`) || n.includes(`content-desc="${name},`);
  for (let i = 0; i < 20; i++) {
    if (tapXml(match)) {
      await delay(500);
      return;
    }
    const n = (xml().match(/<node\b[^>]*>/g) ?? []).find((n) =>
      n.includes('resource-id="com.google.android.documentsui:id/dir_list"'),
    );
    assert(n);
    const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert(b);
    const x = String((+b[1] + +b[3]) / 2);
    d.adb(
      "shell",
      "input",
      "swipe",
      x,
      String(+b[2] + (+b[4] - +b[2]) * 0.8),
      x,
      String(+b[2] + (+b[4] - +b[2]) * 0.25),
      "250",
    );
    await delay(200);
  }
  throw new Error(`Generated file not found: ${name}`);
}
async function confirmNative(action, accept = true) {
  const pending = action();
  await delay(500);
  await tap(
    (n) =>
      n.includes(`resource-id="android:id/${accept ? "button1" : "button2"}"`),
    accept ? "OK" : "Cancel",
  );
  await pending;
}
async function settings() {
  await click("设置");
  await d.wait(has("数据与备份"));
}
const documents = () =>
  d
    .adb("shell", "ls", "/sdcard/Download")
    .split(/\r?\n/)
    .filter((n) => n.endsWith(".recipio"));
async function exportUI(label) {
  const before = documents();
  await click("导出完整备份");
  await delay(600);
  await downloads();
  await tap(
    (n) => n.includes('text="SAVE"') || n.includes('text="Save"'),
    "Save",
  );
  await d.wait(has("完整备份已保存并回读校验"));
  const added = documents().filter((n) => !before.includes(n));
  assert.equal(added.length, 1);
  const path = resolve(out, `${label}-${Date.now()}.recipio`);
  d.adb("pull", `/sdcard/Download/${added[0]}`, path);
  const checked = await inspect(path);
  pass(
    `system export ${label}, counts/sizes/data and every image SHA verified`,
  );
  return { name: added[0], ...checked };
}
async function restoreChoice(name, valid = true) {
  await click("导入并恢复");
  await delay(600);
  await selectFile(name);
  await d.wait(
    valid
      ? has("备份已校验，图片已暂存")
      : "!!document.querySelector('[role=alert]')",
  );
}
async function replace(count) {
  await click("恢复并替换当前数据");
  await click(`确认替换 ${count} 道菜谱`);
  await d.wait(has("恢复成功，所有数据已提交"));
}
async function home() {
  await click("首页");
  await d.wait("!!document.querySelector('[aria-label=\"新增菜谱\"]')");
}
async function open(title) {
  await click(`打开 ${title}`);
  await d.wait(has("完整步骤"));
}
async function minimumComplete() {
  await click("完成这道菜");
  await d.wait(has("已记录做过这道菜"));
}
async function save() {
  await click("快速保存菜谱");
  await d.wait(has("编辑菜谱"));
}
async function generated() {
  const baseline = JSON.parse(
      readFileSync(resolve(out, "baseline.json"), "utf8"),
    ),
    actual = await rows();
  const oldIds = new Set(baseline.rows.recipes.map((r) => r.id));
  assert(
    actual.recipes.every(
      (r) => oldIds.has(r.id) || r.title.startsWith("APK3 "),
    ),
    "Refuse destructive action on unproven data",
  );
  return actual;
}
const baselineFile = resolve(
  out,
  mode === "prepare-v10-final" || mode === "upgrade-final"
    ? "baseline-v10-final.json"
    : "baseline.json",
);
let failure;
try {
  await d.coldStart();
  if (mode === "prepare-v10-final") {
    assert(
      !existsSync(baselineFile),
      "Final old-version baseline is immutable",
    );
    assert(
      d
        .adb("shell", "dumpsys", "package", "app.recipio.local")
        .includes("versionCode=10"),
    );
    assert.equal((await query("PRAGMA user_version"))[0].user_version, 3);
    assert(
      Object.values(await rows(false)).every((r) => r.length === 0),
      "Preparing legacy upgrade requires a fresh isolated empty v10, never clears existing data",
    );
    const golden = await inspect(
      resolve("artifacts/backup-restore/golden.recipio"),
    );
    assert.equal(
      golden.sha256,
      "6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313",
    );
    d.adb(
      "push",
      golden.path,
      "/sdcard/Download/apk3-final-v10-golden.recipio",
    );
    await settings();
    await restoreChoice("apk3-final-v10-golden.recipio");
    await replace(0);
    const current = await rows(false);
    assert.deepEqual(canonical(portable(current)), canonical(golden.data));
    writeFileSync(
      baselineFile,
      JSON.stringify(
        {
          rows: current,
          metadata: await query("SELECT * FROM backup_restore_state"),
          portable: portable(current),
          version: 10,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    pass(
      "final upgrade baseline: fresh isolated old v10 restores unchanged generated Golden through real UI; exact fields/media frozen",
    );
  } else if (mode === "baseline") {
    assert(
      !existsSync(baselineFile),
      "Do not overwrite a frozen upgrade baseline",
    );
    assert(
      d
        .adb("shell", "dumpsys", "package", "app.recipio.local")
        .includes("versionCode=10"),
    );
    assert.equal((await query("PRAGMA user_version"))[0].user_version, 3);
    const current = await rows(false),
      golden = await inspect(
        resolve("artifacts/backup-restore/golden.recipio"),
      );
    assert.equal(
      golden.sha256,
      "6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313",
    );
    assert.deepEqual(
      canonical(portable(current)),
      canonical(golden.data),
      "Existing dedicated data must be the unchanged APK-2 generated Golden",
    );
    writeFileSync(
      baselineFile,
      JSON.stringify(
        {
          rows: current,
          metadata: await query("SELECT * FROM backup_restore_state"),
          portable: portable(current),
          version: 10,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    pass(
      "actual APK-2 v10 generated six tables, metadata and media hashes frozen before upgrade",
    );
  } else if (mode === "upgrade" || mode === "upgrade-final") {
    assert(apk && existsSync(apk));
    assert(existsSync(baselineFile));
    const before = JSON.parse(readFileSync(baselineFile, "utf8"));
    d.close();
    d.adb("install", "-r", resolve(apk));
    await d.coldStart();
    assert(
      d
        .adb("shell", "dumpsys", "package", "app.recipio.local")
        .includes("versionCode=11"),
    );
    assert.equal((await query("PRAGMA user_version"))[0].user_version, 4);
    assert.deepEqual(await rows(false), before.rows);
    assert.deepEqual(
      await query("SELECT * FROM backup_restore_state"),
      before.metadata,
    );
    assert.deepEqual(portable(await rows(false)), before.portable);
    assert.deepEqual(await query("SELECT * FROM cooking_records"), []);
    pass(
      "v10→v11 install -r, schema3→4 retains every old field/ID/time/order, restore fact and media SHA",
    );
  } else if (mode === "flows") {
    await generated();
    const title = "APK3 验收鸭 🍚";
    assert(
      !(await query("SELECT id FROM recipes WHERE title=?", [title])).length,
      "Flow fixture already exists; do not duplicate acceptance",
    );
    await click("新增菜谱");
    await d.fill("菜名", title);
    await click("添加食材");
    await d.fill("食材 1", "糖");
    await d.fill("用量 1", "30g");
    let stepIndex = 0;
    for (const instruction of [
      "洗净鸭肉\n保留中文 🍚",
      "小火焖煮，完成后再记录",
    ]) {
      await click("添加步骤");
      await d.fill(`步骤 ${++stepIndex}`, instruction);
    }
    await d.fill("做菜耗时（分钟）", "30");
    await save();
    const r = (await query("SELECT * FROM recipes WHERE title=?", [title]))[0];
    assert.equal(
      (await query("SELECT COUNT(*) AS n FROM cooking_records"))[0].n,
      0,
    );
    await d.evaluate(
      "document.querySelector('[aria-label=\"放大步骤 2\"]').scrollIntoView({block:'center'})",
    );
    await delay(150);
    const scroll = await d.evaluate("window.scrollY");
    await click("放大步骤 2");
    await d.wait(has("第 2 步 / 2"));
    d.adb("shell", "input", "keyevent", "4");
    await d.wait("!document.querySelector('[role=dialog]')");
    await delay(200);
    assert(Math.abs((await d.evaluate("window.scrollY")) - scroll) < 3);
    assert.equal(
      await d.evaluate("document.activeElement.getAttribute('aria-label')"),
      "放大步骤 2",
    );
    pass(
      "full steps default, arbitrary Focus and actual Android Back preserve position/focus, no record",
    );
    await click("开始引导烹饪");
    await d.wait(has("第 1 步 / 2"));
    await click("退出引导");
    assert.equal(
      (await query("SELECT COUNT(*) AS n FROM cooking_records"))[0].n,
      0,
    );
    pass("Guided exit does not fabricate cooking");
    await minimumComplete();
    const first = (
      await query("SELECT * FROM cooking_records WHERE recipe_id=?", [r.id])
    )[0];
    assert(first.cooked_at);
    assert.equal(first.finished_photo_path, null);
    assert.equal(first.evaluation, null);
    assert.equal(first.note, null);
    await click("完成并返回");
    await d.wait(has("做过 1 次"));
    await click("开始引导烹饪");
    await click("下一步");
    await minimumComplete();
    await click("调整做法");
    await d.fill("用量 1", "15g");
    await save();
    await click("查看修改记录");
    await d.wait(has("糖：30g → 15g"));
    assert(!(await d.evaluate("document.body.innerText")).includes("回滚"));
    d.adb("shell", "input", "keyevent", "4");
    await d.wait(has("完整步骤"));
    assert.equal(
      (
        await query(
          "SELECT COUNT(*) AS n FROM cooking_records WHERE recipe_id=?",
          [r.id],
        )
      )[0].n,
      2,
    );
    assert.equal(
      (
        await query("SELECT amount FROM recipe_ingredients WHERE recipe_id=?", [
          r.id,
        ])
      )[0].amount,
      "15g",
    );
    pass(
      "explicit minimal records, Guided final completion, optional skip, latest quantity and read-only old/new history",
    );
    await d.screenshot(resolve(out, "full-detail.png"));
    await click("查看做菜记录");
    await d.wait(has("做过 2 次"));
    await d.screenshot(resolve(out, "cooking-history.png"));
    d.adb("shell", "input", "keyevent", "4");
    await d.wait(has("完整步骤"));
    writeFileSync(
      resolve(out, "flow-fixture.json"),
      JSON.stringify({ id: r.id, title, first }, null, 2),
    );
  } else if (mode === "media") {
    await generated();
    const title = "APK3 引用图片",
      source = resolve("artifacts/backup-restore/images/backup-green.png");
    assert(existsSync(source));
    d.adb("push", source, "/sdcard/Download/apk3-green.png");
    await click("新增菜谱");
    await d.fill("菜名", title);
    await save();
    const r = (await query("SELECT id FROM recipes WHERE title=?", [title]))[0];
    await minimumComplete();
    await click("添加成品照片");
    await delay(700);
    await selectFile("apk3-green.png");
    await d.wait(
      "document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    await click("设为菜谱封面");
    await d.wait(has("成品照片已同时用作菜谱封面"));
    await d.fill("这次的备注", "少糖\n下次继续 🍚");
    await click("完成并返回");
    const record = (
        await query("SELECT * FROM cooking_records WHERE recipe_id=?", [r.id])
      )[0],
      cover = (
        await query("SELECT cover_path FROM recipes WHERE id=?", [r.id])
      )[0].cover_path;
    assert.equal(record.finished_photo_path, cover);
    const hash = sha(mediaBytes(cover));
    await d.coldStart();
    await open(title);
    await d.wait(
      "document.querySelector('img[alt=\"APK3 引用图片 封面\"]')?.naturalWidth>0 && document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    pass(
      "actual native picker photo, same asset cover, optional newline/Emoji note, cold-start visual decoding and exact shared path",
    );
    await click("查看做菜记录");
    const before = await rows();
    await confirmNative(() => click("删除这次记录"), false);
    assert.deepEqual(await rows(), before);
    await confirmNative(() => click("删除这次记录"));
    await d.wait(has("做过 0 次"));
    assert.equal(sha(mediaBytes(cover)), hash);
    pass(
      "record delete cancellation is unchanged; confirmed delete retains shared cover/history file and recipe",
    );
    await click("返回菜谱");
    await click("编辑菜谱");
    await click("移除封面");
    await save();
    assert.equal(sha(mediaBytes(cover)), hash);
    pass("cover removal retains history-referenced old image");
    await minimumComplete();
    await click("完成并返回");
    const prior = await rows();
    await click("删除这道菜");
    await click("撤销");
    const undone = await rows();
    const original = prior.recipes.find((r) => r.title === title);
    const restored = undone.recipes.find((r) => r.id === original.id);
    assert(restored.updated_at >= original.updated_at);
    assert.deepEqual(
      {
        ...undone,
        recipes: undone.recipes.map((r) =>
          r.id === original.id ? { ...r, updated_at: original.updated_at } : r,
        ),
      },
      prior,
    );
    assert.equal(sha(mediaBytes(cover)), hash);
    pass(
      "five-second recipe Undo retains cooking children, history and images",
    );
    await open(title);
    await click("删除这道菜");
    await delay(5600);
    await d.wait(
      `!document.querySelector('[aria-label=${JSON.stringify(`打开 ${title}`)}]')`,
    );
    assert.equal(
      (
        await query(
          "SELECT COUNT(*) AS n FROM cooking_records WHERE recipe_id=?",
          [r.id],
        )
      )[0].n,
      0,
    );
    assert.equal(
      (
        await query(
          "SELECT COUNT(*) AS n FROM recipe_changes WHERE recipe_id=?",
          [r.id],
        )
      )[0].n,
      0,
    );
    const absent = d.adb(
      "shell",
      "run-as",
      "app.recipio.local",
      "sh",
      "-c",
      `'if test -e files/${cover}; then echo retained; else echo missing; fi'`,
    );
    assert.equal(absent, "missing");
    pass(
      "expiry alone cascades children/history and removes only the now-unreferenced candidate",
    );
    // Keep a distinct photo-only record for v2 full backup/recovery closure proof.
    await open("APK3 验收鸭 🍚");
    await minimumComplete();
    await click("添加成品照片");
    await delay(700);
    await selectFile("apk3-green.png");
    await d.wait(
      "document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    await click("完成并返回");
    writeFileSync(
      resolve(out, "media-state.json"),
      JSON.stringify(portable(await rows()), null, 2),
    );
  } else if (mode === "backup") {
    const initial = await generated();
    assert(initial.cooking_records.some((r) => r.finished_photo_path));
    const expected = canonical(portable(initial));
    await settings();
    const exported = await exportUI("cooking-v2");
    assert.equal(exported.manifest.formatVersion, 2);
    assert.equal(exported.manifest.databaseSchemaVersion, 4);
    assert.deepEqual(canonical(exported.data), expected);
    await restoreChoice(exported.name);
    await click("取消恢复");
    await d.wait(has("操作已取消"));
    assert.deepEqual(await rows(), initial);
    pass("v2 valid staged cancellation leaves all seven tables unchanged");
    const zip = await JSZip.loadAsync(readFileSync(exported.path)),
      manifest = JSON.parse(await zip.file("manifest.json").async("string"));
    manifest.dataFile.sha256 = "f".repeat(64);
    zip.file("manifest.json", JSON.stringify(manifest));
    const bad = resolve(out, `corrupt-${Date.now()}.recipio`);
    writeFileSync(bad, await zip.generateAsync({ type: "nodebuffer" }), {
      flag: "wx",
    });
    d.adb("push", bad, "/sdcard/Download/apk3-corrupt.recipio");
    await restoreChoice("apk3-corrupt.recipio", false);
    assert.deepEqual(await rows(), initial);
    pass("actual corrupt archive rejected before database writes");
    await restoreChoice(exported.name);
    await execute(
      "CREATE TRIGGER apk3_restore_failure BEFORE INSERT ON cooking_records BEGIN SELECT RAISE(ABORT,'generated restore fault'); END;",
    );
    try {
      await replaceFails(initial.recipes.length);
      assert.deepEqual(await rows(), initial);
      assert.deepEqual(canonical(portable(await rows())), expected);
    } finally {
      await execute("DROP TRIGGER apk3_restore_failure;");
    }
    pass(
      "actual cooking insert failure rolls back every table; current image bytes remain readable",
    );
    // Original v1 is unchanged, including its required change history.
    d.adb(
      "push",
      resolve("artifacts/backup-restore/golden.recipio"),
      "/sdcard/Download/apk3-v1-golden.recipio",
    );
    await restoreChoice("apk3-v1-golden.recipio");
    await replace(initial.recipes.length);
    const old = await inspect(
      resolve("artifacts/backup-restore/golden.recipio"),
    );
    const migrated = await rows();
    const { cookingRecords, ...legacy } = portable(migrated);
    assert.deepEqual(cookingRecords, []);
    assert.deepEqual(canonical(legacy), canonical(old.data));
    assert.equal(
      (
        await query("SELECT data_sha256 FROM backup_restore_state WHERE id=1")
      )[0].data_sha256,
      old.manifest.dataFile.sha256,
    );
    pass(
      "real unchanged v1 archive restores all old changes/media and normalizes cooking to empty",
    );
    await restoreChoice(exported.name);
    await replace(migrated.recipes.length);
    assert.deepEqual(canonical(portable(await rows())), expected);
    // Only proven generated fixture is removed. The external backup was already read back and hashed.
    const clearing = await generated();
    assert.deepEqual(canonical(portable(clearing)), expected);
    await execute("DELETE FROM recipes;");
    assert(Object.values(await rows()).every((r) => r.length === 0));
    await d.coldStart();
    await settings();
    await restoreChoice(exported.name);
    await replace(0);
    assert.deepEqual(canonical(portable(await rows())), expected);
    pass(
      "v2 external backup → clear generated data → Replace restore: every ID/time/order and media SHA unchanged",
    );
    await home();
    await d.fill("搜索菜名或食材", "APK3");
    await open("APK3 验收鸭 🍚");
    await d.wait(
      "document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    await d.screenshot(resolve(out, "restored-cooking.png"));
    pass("restored search and native cooking photo decoding");
    writeFileSync(
      resolve(out, "backup-metadata.json"),
      JSON.stringify(
        {
          v2: {
            name: exported.name,
            path: exported.path,
            size: exported.size,
            sha256: exported.sha256,
          },
          v1: { path: old.path, size: old.size, sha256: old.sha256 },
        },
        null,
        2,
      ),
    );
  } else if (mode === "reinstall") {
    assert(apk && existsSync(apk));
    const before = canonical(portable(await generated()));
    const facts = await query("SELECT * FROM backup_restore_state");
    d.close();
    d.adb("install", "-r", resolve(apk));
    await d.coldStart();
    assert.deepEqual(canonical(portable(await rows())), before);
    assert.deepEqual(await query("SELECT * FROM backup_restore_state"), facts);
    pass(
      "same-final-APK install -r preserves all seven entities, original times, photos and restore facts",
    );
  } else if (mode === "final-restore") {
    const metadata = JSON.parse(
      readFileSync(resolve(out, "backup-metadata.json"), "utf8"),
    );
    const checked = await inspect(metadata.v2.path);
    assert.equal(checked.sha256, metadata.v2.sha256);
    assert.equal(checked.size, metadata.v2.size);
    assert(
      Object.values(await rows()).every((r) => r.length === 0),
      "Final recovery requires the isolated empty instrumentation database, never an unknown database",
    );
    d.adb(
      "push",
      metadata.v2.path,
      "/sdcard/Download/apk3-final-restore.recipio",
    );
    await settings();
    await restoreChoice("apk3-final-restore.recipio");
    await replace(0);
    assert.deepEqual(
      canonical(portable(await rows())),
      canonical(checked.data),
    );
    await d.coldStart();
    await open("APK3 验收鸭 🍚");
    await d.wait(
      "document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    assert.equal((await query("PRAGMA user_version"))[0].user_version, 4);
    assert.deepEqual(await query("PRAGMA foreign_key_check"), []);
    pass(
      "post-connected fresh install restores the verified external v2 on final APK; seven tables and image SHA match after offline cold restart",
    );
  } else if (mode === "offline") {
    await generated();
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable");
    d.adb("shell", "svc", "wifi", "disable");
    d.adb("shell", "svc", "data", "disable");
    await d.coldStart();
    await open("APK3 验收鸭 🍚");
    await d.wait(has("15g"));
    await d.wait(
      "document.querySelector('img[alt=\"这次的成品照片\"]')?.naturalWidth>0",
    );
    await minimumComplete();
    await click("完成并返回");
    await click("编辑菜谱");
    await d.fill("个人备注", "离线修改\n仍可使用 🍚");
    await save();
    await click("查看做菜记录");
    await d.wait(has("做过"));
    await d.coldStart();
    await open("APK3 验收鸭 🍚");
    await d.wait(has("离线修改"));
    assert.equal(
      Object.values((await query("PRAGMA integrity_check"))[0])[0],
      "ok",
    );
    assert.deepEqual(await query("PRAGMA foreign_key_check"), []);
    pass(
      "airplane-mode cold launch, local image/view/edit/explicit completion/history and second cold launch persist; SQLite integrity/FK valid",
    );
    const external = d.events.filter(
      (e) =>
        e.method === "Network.requestWillBeSent" &&
        !e.params.request.url.startsWith("https://localhost") &&
        !e.params.request.url.startsWith("data:") &&
        !e.params.request.url.startsWith("blob:"),
    );
    assert.deepEqual(external, []);
    pass("native core emitted no external network requests");
    await d.screenshot(resolve(out, "offline-detail.png"));
  } else if (mode === "narrow") {
    await generated();
    const originalFont = d.adb(
      "shell",
      "settings",
      "get",
      "system",
      "font_scale",
    );
    try {
      await d.command("Emulation.setDeviceMetricsOverride", {
        width: 320,
        height: 740,
        deviceScaleFactor: 1,
        mobile: true,
      });
      d.adb("shell", "settings", "put", "system", "font_scale", "1.5");
      await d.coldStart();
      await d.command("Emulation.setDeviceMetricsOverride", {
        width: 320,
        height: 740,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await open("APK3 验收鸭 🍚");
      await click("开始引导烹饪");
      const rects = await d.evaluate(
        "[...document.querySelector('[role=dialog]').querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,width:r.width,height:r.height}})",
      );
      assert(
        rects.every((r) => r.x >= -1 && r.x + r.width <= 321 && r.height >= 44),
      );
      assert(await d.evaluate("document.documentElement.scrollWidth<=320"));
      await d.screenshot(resolve(out, "narrow-guided.png"));
      await click("下一步");
      await d.wait(has("完成这道菜"));
      d.adb("shell", "input", "keyevent", "4");
      await d.wait("!document.querySelector('[role=dialog]')");
      pass(
        "320px/large system text: buttons visible, ≥44px, no horizontal overflow; actual Android Back exits Guided",
      );
    } finally {
      await d.command("Emulation.clearDeviceMetricsOverride");
      d.adb("shell", "settings", "put", "system", "font_scale", originalFont);
    }
  }
} catch (e) {
  failure = e;
  console.error(e.stack ?? e);
} finally {
  const metadata = {
    mode,
    serial,
    avd: "Recipio_Backup_36",
    android: d.adb("shell", "getprop", "ro.build.version.release"),
    abi: d.adb("shell", "getprop", "ro.product.cpu.abi"),
    at: new Date().toISOString(),
    apk: apk
      ? {
          path: resolve(apk),
          size: readFileSync(apk).length,
          sha256: sha(readFileSync(apk)),
        }
      : null,
    passed: checks,
    failure: failure?.message ?? null,
    physicalPhone: "Not Run",
  };
  writeFileSync(
    resolve(out, `${mode}-result-${Date.now()}.json`),
    JSON.stringify(metadata, null, 2),
  );
  d.close();
}
if (failure) process.exitCode = 1;
async function replaceFails(count) {
  await click("恢复并替换当前数据");
  await click(`确认替换 ${count} 道菜谱`);
  await d.wait("!!document.querySelector('[role=alert]')");
}
