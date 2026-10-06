// Generated-only acceptance on the explicitly owned RECIPIO AVD.
// Usage: node scripts/verify-share-intake-android.mjs <absolute-adb> emulator-5580 <baseline|upgrade|offline> <absolute-apk> [evidence-label]
// baseline requires installed immutable v14; upgrade installs v15 with -r; offline requires v15.
// Raw preservation snapshots stay in ignored artifacts, never logs or a Review Packet.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { device, delay } from "./android-webview.mjs";

const [adbPath, serial, requestedMode, apk, evidenceLabel] = process.argv.slice(2);
const mode = requestedMode === "share-offline" ? "offline" : requestedMode;
assert(adbPath && isAbsolute(adbPath) && existsSync(adbPath), "Absolute installed ADB required");
assert.equal(serial, "emulator-5580", "Only owned emulator-5580 is permitted");
assert(["baseline", "upgrade", "offline"].includes(mode), "Explicit baseline/upgrade/offline mode required");
assert(apk && isAbsolute(apk) && existsSync(apk), "Absolute immutable APK required");
const packageName = "app.recipio.local", avd = "Recipio_Backup_36";
assert(evidenceLabel === undefined || /^[a-z0-9][a-z0-9-]{0,63}$/.test(evidenceLabel), "Evidence label must be a safe generated directory name");
// Each changed production build gets fresh installed-device evidence without
// overwriting the immutable earlier baseline or its failed/passed run history.
const out = resolve("artifacts/share-intake", evidenceLabel ?? ""), baselinePath = resolve(out, "v14-preservation-baseline.json");
const versions = { 14: "0.7.0-share-target", 15: "0.8.0-share-intake" };
const tables = ["recipes", "recipe_ingredients", "recipe_steps", "recipe_preparations", "recipe_key_tips", "recipe_changes", "cooking_records", "backup_restore_state"];
const generatedTitle = "APK5C GENERATED 离线验收 🍚";
const generatedStep = "APK5C GENERATED 测试步骤\n保留中文与 Emoji 🍚";
const generatedNote = "Only generated APK-5C-A local acceptance data";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1EAAAAASUVORK5CYII=";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const apkBytes = readFileSync(apk), apkHash = sha(apkBytes);
// Metadata comes from the existing SDK; no installation or APK execution is needed.
const aaptPath = resolve(dirname(adbPath), "../build-tools/36.0.0", process.platform === "win32" ? "aapt2.exe" : "aapt2");
assert(existsSync(aaptPath), "Existing SDK build-tools36 aapt2 is required");
const badging = spawnSync(aaptPath, ["dump", "badging", apk], { encoding: "utf8", timeout: 30000 });
assert.equal(badging.status, 0, "Immutable APK metadata inspection failed");
const apkPackage = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(badging.stdout);
assert(apkPackage, "APK package metadata absent");
const metadata = { packageName: apkPackage[1], versionCode: Number(apkPackage[2]), versionName: apkPackage[3] };
assert.equal(metadata.packageName, packageName, "Wrong APK package");
assert.equal(metadata.versionCode, mode === "baseline" ? 14 : 15, "Wrong APK versionCode");
assert.equal(metadata.versionName, versions[metadata.versionCode], "Wrong APK versionName");
if (mode === "baseline") assert(!existsSync(baselinePath), "Immutable v14 baseline already exists; never overwrite it");
else assert(existsSync(baselinePath), "Create the immutable installed-v14 baseline first");

const d = device(adbPath, serial);
assert.equal(d.adb("emu", "avd", "name").split(/[\r\n]+/)[0].trim(), avd, "Wrong AVD; do not switch devices");
assert.equal(d.adb("shell", "getprop", "sys.boot_completed"), "1", "Owned AVD must be fully booted");
mkdirSync(out, { recursive: true });
let stage = "installed package preflight", failure, networkTouched = false;
const checks = [], restorationErrors = [], restoredNetwork = {};
const pass = text => { checks.push(text); console.log("PASS: " + text); };
const has = text => "document.body.innerText.includes(" + JSON.stringify(text) + ")";
const coverLoaded = "[...document.querySelectorAll('img')].some(i=>i.alt===" + JSON.stringify(generatedTitle + " 封面") + "&&i.complete&&i.naturalWidth>0&&!i.hidden)";
const query = (sql, values = []) => d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:" + JSON.stringify(sql) + ",values:" + JSON.stringify(values) + "}).then(r=>r.values)");
const equalPrivate = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), message);
const hashResult = output => {
  const match = /^([a-f0-9]{64})\s/i.exec(output); assert(match, "Device SHA256 reply invalid"); return match[1].toLowerCase();
};
function installedVersion(expected) {
  const dump = d.adb("shell", "dumpsys", "package", packageName);
  assert.equal(Number(/\bversionCode=(\d+)\b/.exec(dump)?.[1]), expected, "Installed versionCode differs from expected");
  assert.equal(/\bversionName=([^\s]+)/.exec(dump)?.[1], versions[expected], "Installed versionName differs from expected");
}
function installedApkHash() {
  const lines = d.adb("shell", "pm", "path", packageName).split(/[\r\n]+/).filter(Boolean);
  assert.equal(lines.length, 1, "Expected one installed base APK, no split package");
  const path = lines[0].replace(/^package:/, "");
  assert(/^\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/.test(path), "Installed APK location invalid");
  return hashResult(d.adb("shell", "sha256sum", path));
}
async function installNoOnlineGuard() {
  // No model/URL actions are part of this acceptance. Block and count any accidental
  // bridge attempt; the guard never reads a key or supplies a provider credential.
  await d.evaluate("(()=>{const cap=window.Capacitor;window.__shareIntakeAcceptance={providerAttempts:0,pageReadAttempts:0};const original=cap.nativePromise;cap.nativePromise=function(p,m,o){if(p==='LocalAiIntake'&&(m==='organize'||m==='preflight')){window.__shareIntakeAcceptance.providerAttempts++;return Promise.reject(new Error('Acceptance forbids Provider'))}if(p==='LocalWebImport'&&m==='read'){window.__shareIntakeAcceptance.pageReadAttempts++;return Promise.reject(new Error('Acceptance forbids online Read'))}return original.call(this,p,m,o)};return true})()");
}
async function coldStart() { await d.coldStart(); await installNoOnlineGuard(); }
async function onlineGuard() {
  const counts = await d.evaluate("window.__shareIntakeAcceptance");
  assert.equal(counts?.providerAttempts, 0, "Acceptance unexpectedly attempted Provider");
  assert.equal(counts?.pageReadAttempts, 0, "Acceptance unexpectedly attempted page read");
}
async function snapshot() {
  const rows = Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY rowid`)])));
  const paths = new Set();
  function collectPath(path) {
    if (path === null || path === undefined) return;
    assert(typeof path === "string" && /^images\/(?:[a-f0-9-]+|generation-[a-f0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(path), "Existing media reference cannot be verified safely");
    paths.add(path);
  }
  // Hash only actual reference fields, never a filename mentioned in free text.
  rows.recipes.forEach(row => collectPath(row.cover_path));
  rows.recipe_steps.forEach(row => collectPath(row.image_path));
  rows.cooking_records.forEach(row => collectPath(row.finished_photo_path));
  for (const row of rows.recipe_changes) for (const json of [row.before_json, row.after_json]) {
    const details = JSON.parse(json); collectPath(details.coverPath); details.steps.forEach(step => collectPath(step.imagePath));
  }
  const images = Object.fromEntries([...paths].sort().map(path => [path, hashResult(d.adb("shell", "run-as", packageName, "sha256sum", "files/" + path))]));
  const keyConfigured = await d.evaluate("window.Capacitor.Plugins.LocalAiSecret.hasAiKey().then(r=>r.configured)");
  assert.equal(typeof keyConfigured, "boolean", "Only a boolean key status may enter the snapshot");
  return { rows, images, keyConfigured };
}
async function databaseIntegrity() {
  assert.equal((await query("PRAGMA user_version"))[0]?.user_version, 4, "Expected SQLite schema4");
  assert((await query("PRAGMA foreign_key_check")).length === 0, "SQLite foreign-key violation");
  const names = (await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'android_metadata' ORDER BY name")).map(row => row.name);
  equalPrivate(names, [...tables].sort(), "Business schema changed unexpectedly");
}
function baseline() {
  const saved = JSON.parse(readFileSync(baselinePath, "utf8"));
  assert(saved.formatVersion === 1 && saved.serial === serial && saved.avd === avd, "Baseline identity or format mismatch");
  assert(saved.apk?.versionCode === 14 && saved.apk?.versionName === versions[14] && saved.apk?.packageName === packageName, "Baseline must come from v14");
  assert(/^[a-f0-9]{64}$/.test(saved.apk.sha256), "Baseline APK fingerprint invalid");
  assert(saved.generatedRecipe?.title === generatedTitle && /^[a-f0-9-]{36}$/.test(saved.generatedRecipe.id), "Generated recipe identity missing");
  assert(saved.snapshot && Object.keys(saved.snapshot.rows ?? {}).length === 8, "Eight-table baseline required");
  assert(saved.snapshot.rows.recipes.filter(row => row.id === saved.generatedRecipe.id && row.title === generatedTitle).length === 1, "Generated baseline recipe is ambiguous");
  return saved;
}
async function generatedDetail(saved) {
  const rows = await query("SELECT id,title,cover_path,notes FROM recipes WHERE id=? AND title=?", [saved.generatedRecipe.id, generatedTitle]);
  assert(rows.length === 1 && rows[0].cover_path === saved.generatedRecipe.imagePath && rows[0].notes === generatedNote, "Exact owned generated recipe must be retained");
  await d.click("打开 " + generatedTitle); await d.wait(coverLoaded); await d.wait(has(generatedStep));
}
function networkSnapshot() {
  return Object.fromEntries([["airplane", "airplane_mode_on"], ["wifi", "wifi_on"], ["data", "mobile_data"]]
    .map(([name, key]) => [name, d.adb("shell", "settings", "get", "global", key)]));
}
const originalNetwork = mode === "offline" ? networkSnapshot() : null;
if (originalNetwork) for (const value of Object.values(originalNetwork)) assert(value === "0" || value === "1", "Cannot safely restore an unknown network setting");

try {
  installedVersion(mode === "offline" ? 15 : 14);
  if (mode === "baseline" || mode === "offline") assert.equal(installedApkHash(), apkHash, "Installed APK bytes differ from the given immutable APK");
  await coldStart(); await databaseIntegrity();
  if (mode === "baseline") {
    stage = "seed own generated v14 recipe";
    assert((await query("SELECT id FROM recipes WHERE title=?", [generatedTitle])).length === 0, "Generated baseline title already exists; do not overwrite");
    const old = await snapshot();
    await d.click("新增菜谱"); await d.click("手动录入"); await d.fill("菜名", generatedTitle);
    await d.click("添加食材"); await d.fill("食材 1", "APK5C GENERATED 测试米饭"); await d.fill("用量 1", "100克");
    await d.click("添加步骤"); await d.fill("步骤 1", generatedStep); await d.fill("个人备注", generatedNote);
    await d.click("快速保存菜谱"); await d.wait(has("编辑菜谱"));
    const created = await query("SELECT id,title,cover_path,notes FROM recipes WHERE title=?", [generatedTitle]);
    assert(created.length === 1 && created[0].cover_path === null && created[0].notes === generatedNote, "Only one fresh generated recipe may receive a cover");
    const imagePath = "images/" + randomUUID() + ".png";
    const exists = await d.evaluate("window.Capacitor.Plugins.Filesystem.stat(" + JSON.stringify({ path: imagePath, directory: "DATA" }) + ").then(()=>true,()=>false)");
    assert.equal(exists, false, "Generated image must use a new unoccupied filename");
    await d.evaluate("window.Capacitor.Plugins.Filesystem.writeFile(" + JSON.stringify({ path: imagePath, data: png, directory: "DATA", recursive: true }) + ")");
    // Test fixture only: this exact new ID/title/null reference is checked before
    // mutation. No other recipe, prior image or user record is edited or removed.
    await d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.executeSet(" + JSON.stringify({ database: "recipio", set: [{ statement: "UPDATE recipes SET cover_path=? WHERE id=? AND title=? AND cover_path IS NULL AND notes=?", values: [imagePath, created[0].id, generatedTitle, generatedNote] }], transaction: true }) + ")");
    await onlineGuard(); await coldStart();
    const current = await snapshot();
    for (const table of tables) equalPrivate(current.rows[table].filter(row => !(["recipes", "recipe_changes", "cooking_records"].includes(table) ? row.id === created[0].id || row.recipe_id === created[0].id : row.recipe_id === created[0].id)), old.rows[table], "Seeding altered an existing table row");
    for (const [path, hash] of Object.entries(old.images)) assert(current.images[path] === hash, "Seeding altered an existing image");
    assert(current.keyConfigured === old.keyConfigured, "Seeding altered existing key configured state");
    const imageSha256 = sha(Buffer.from(png, "base64")); assert.equal(current.images[imagePath], imageSha256, "Generated image byte hash differs");
    const generatedRecipe = { id: created[0].id, title: generatedTitle, imagePath, imageSha256 };
    const saved = { formatVersion: 1, serial, avd, apk: { ...metadata, sha256: apkHash, bytes: apkBytes.length }, generatedRecipe, snapshot: current, at: new Date().toISOString() };
    await generatedDetail(saved); await onlineGuard();
    stage = "freeze immutable baseline";
    writeFileSync(baselinePath, JSON.stringify(saved, null, 2), { flag: "wx" });
    pass("Installed v14 generated UI recipe/image retained; prior rows/images/key status untouched; immutable eight-table baseline created");
  } else if (mode === "upgrade") {
    stage = "compare installed v14 against immutable baseline";
    const saved = baseline(); assert.equal(installedApkHash(), saved.apk.sha256, "Installed v14 APK does not match frozen baseline");
    equalPrivate(await snapshot(), saved.snapshot, "Installed v14 data changed after baseline; preserve and investigate"); await onlineGuard();
    stage = "install-r immutable v15 APK";
    d.close(); assert(d.adb("install", "-r", apk).includes("Success"), "v15 coverage install failed"); installedVersion(15);
    assert.equal(installedApkHash(), apkHash, "Installed v15 bytes differ from supplied APK");
    await coldStart(); await databaseIntegrity(); equalPrivate(await snapshot(), saved.snapshot, "v14 to v15 preservation mismatch");
    await generatedDetail(saved); await onlineGuard();
    pass("Actual install-r v14→v15 preserves every eight-table row/ID/time/order, current/history image hash and key configured status; SQLite4/FK valid");
  } else {
    const saved = baseline(); stage = "compare v15 data before flight mode";
    equalPrivate(await snapshot(), saved.snapshot, "Offline check requires the retained immutable baseline data"); await onlineGuard();
    stage = "disable owned emulator connectivity"; networkTouched = true;
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable"); d.adb("shell", "svc", "wifi", "disable"); d.adb("shell", "svc", "data", "disable");
    for (let i = 0; i < 50; i++) { const value = networkSnapshot(); if (value.airplane === "1" && value.wifi === "0" && value.data === "0") break; await delay(100); }
    equalPrivate(networkSnapshot(), { airplane: "1", wifi: "0", data: "0" }, "Flight mode/Wi-Fi/mobile data must all be offline");
    stage = "offline force-stop cold-start/detail/image"; await coldStart(); installedVersion(15); await generatedDetail(saved);
    await d.screenshot(resolve(out, "offline-detail-generated.png"));
    stage = "offline Guided and real Android Back";
    await d.click("开始引导烹饪"); await d.wait(has("第 1 步 / 1")); await d.wait("!!document.querySelector('[role=dialog]')");
    d.adb("shell", "input", "keyevent", "4"); await d.wait("!document.querySelector('[role=dialog]')"); await d.wait(coverLoaded);
    equalPrivate(await snapshot(), saved.snapshot, "Offline Guided/Back must not create cooking records or change data");
    pass("v15 flight-mode force-stop cold launch, generated local cover/detail/Guided/real Back work with unchanged data");
    stage = "offline real Backup SAF open/cancel"; await d.click("设置"); await d.click("导出完整备份");
    let pickerOpened = false;
    for (let i = 0; i < 100; i++) {
      const activities = d.adb("shell", "dumpsys", "activity", "activities");
      if (/^\s*(?:topResumedActivity=|mResumedActivity:|ResumedActivity:)[^\r\n]*documentsui/m.test(activities)) { pickerOpened = true; break; }
      await delay(100);
    }
    assert(pickerOpened, "Real DocumentsUI must be resumed in foreground"); d.adb("shell", "input", "keyevent", "4");
    await d.wait(has("数据与备份")); await d.wait(has("操作已取消")); equalPrivate(await snapshot(), saved.snapshot, "Backup picker cancellation altered local data");
    pass("Offline native Backup SAF opens and cancels; all retained data/images/key state match immutable baseline");
    await onlineGuard();
    const external = d.events.filter(event => {
      if (event.method !== "Network.requestWillBeSent") return false;
      try { const url = new URL(event.params.request.url); return !(["data:", "blob:"].includes(url.protocol) || url.protocol === "https:" && url.hostname === "localhost" && !url.port); }
      catch { return true; }
    });
    assert.equal(external.length, 0, "Installed WebView attempted external requests");
    assert.equal(d.events.filter(event => event.method === "Runtime.exceptionThrown").length, 0, "Installed WebView has uncaught runtime errors");
    pass("Observed WebView external requests0/runtime errors0; explicit Provider/page-read attempts0, no real AI requested");
  }
} catch (error) {
  // Error values may include old row data or WebView body text. Never copy those
  // to logs/evidence; report the concrete failing stage, preserve original data.
  failure = { stage, type: error?.name ?? "Error", message: "Acceptance failed; existing data preserved; inspect this stage locally" };
  console.error("FAIL: " + stage);
} finally {
  if (networkTouched) {
    stage = "restore exact original network settings";
    const commands = [
      ["airplane", ["shell", "cmd", "connectivity", "airplane-mode", originalNetwork.airplane === "1" ? "enable" : "disable"]],
      ["wifi", ["shell", "svc", "wifi", originalNetwork.wifi === "1" ? "enable" : "disable"]],
      ["data", ["shell", "svc", "data", originalNetwork.data === "1" ? "enable" : "disable"]],
    ];
    for (const [name, args] of commands) { try { d.adb(...args); } catch { restorationErrors.push(name + " restoration command failed"); } }
    for (let i = 0; i < 100; i++) {
      try { Object.assign(restoredNetwork, networkSnapshot()); if (JSON.stringify(restoredNetwork) === JSON.stringify(originalNetwork)) break; }
      catch { /* Still attempt every read after independent restoration commands. */ }
      await delay(100);
    }
    for (const name of ["airplane", "wifi", "data"]) if (restoredNetwork[name] !== originalNetwork[name]) restorationErrors.push(name + " exact readback mismatch");
    if (restorationErrors.length) failure = { stage, type: "RestorationError", message: "Original network restoration needs attention", previousFailure: failure ?? null };
    else pass("Owned emulator airplane/Wi-Fi/mobile-data settings restored and read back exactly");
  }
  try {
    // This summary contains no row values, keys, source text or private image bytes.
    writeFileSync(resolve(out, mode + "-evidence.json"), JSON.stringify({
      mode, serial, avd, apk: { ...metadata, path: apk, bytes: apkBytes.length, sha256: apkHash }, checks, failure: failure ?? null,
      baselineFile: "v14-preservation-baseline.json", originalNetwork, restoredNetwork, restorationErrors,
      physicalPhone: "Not Run", realAiCalls: 0, realAiEvidence: "Script never invokes organize/preflight; post-connect online bridge guard asserts no attempt; no paid Provider smoke performed",
      at: new Date().toISOString(),
    }, null, 2));
  } finally {
    try { d.close(); } catch { process.exitCode = 1; console.error("FAIL: owned WebView forwarding cleanup"); }
  }
}
if (failure) process.exitCode = 1;
