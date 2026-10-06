// Preservation acceptance for the explicitly owned RECIPIO AVD only.
// Usage: node scripts/verify-find-recipe-android.mjs <absolute-adb> emulator-5580 <baseline|upgrade|offline> <absolute-immutable-apk> [evidence-label] [--rc2]
// Original acceptance freezes ACTUAL installed v15/v16 and upgrades to v17.
// Explicit --rc2 freezes the delivered ACTUAL installed v17 and upgrades to v18.
// Neither lineage installs a baseline, downgrades, wipes or seeds; upgrade is -r only.
// Raw rows, recipe identity and screenshots stay private in ignored artifacts.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { device, delay } from "./android-webview.mjs";

const args = process.argv.slice(2), rc2 = args.includes("--rc2");
assert(args.filter(arg => arg === "--rc2").length <= 1, "Use --rc2 at most once");
const positional = args.filter(arg => arg !== "--rc2");
assert(positional.length === 4 || positional.length === 5, "Four required arguments and one optional evidence label required");
assert(!positional.some(arg => arg.startsWith("--")), "Unknown acceptance option");
const [adbPath, serial, mode, apk, evidenceLabel] = positional;
assert(adbPath && isAbsolute(adbPath) && existsSync(adbPath), "Absolute installed ADB required");
assert.equal(serial, "emulator-5580", "Only owned emulator-5580 is permitted");
assert(["baseline", "upgrade", "offline"].includes(mode), "Explicit baseline/upgrade/offline mode required");
assert(apk && isAbsolute(apk) && existsSync(apk), "Absolute immutable APK required");
assert(evidenceLabel === undefined || /^[a-z0-9][a-z0-9-]{0,63}$/.test(evidenceLabel), "Evidence label must be a safe generated directory name");

const packageName = "app.recipio.local", avd = "Recipio_Backup_36";
const versions = { 15: "0.8.0-share-intake", 16: "0.8.1-logo-refresh", 17: "0.9.0-find-recipe", 18: "0.9.0-find-recipe-rc2" };
const baselineVersions = rc2 ? [17] : [15, 16], finalVersionCode = rc2 ? 18 : 17;
const approvedV17 = { path: resolve("artifacts/recipio-find-recipe-v17-debug.apk"), sha256: "319c52b22c40169a310eee4e2bc8b68b6379a87a9dd5572e6106443469437ea7" };
const tables = ["recipes", "recipe_ingredients", "recipe_steps", "recipe_preparations", "recipe_key_tips", "recipe_changes", "cooking_records", "backup_restore_state"];
const counterNames = ["providerAttempts", "pageReadAttempts", "finderSearchAttempts", "finderExtractAttempts", "backupWriteAttempts"];
const out = resolve(rc2 ? "artifacts/find-recipe-rc2" : "artifacts/find-recipe", evidenceLabel ?? "final-v" + finalVersionCode);
const baselinePath = resolve(out, "installed-preservation-baseline.json");
const evidencePath = resolve(out, mode + "-evidence.json");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const apkBytes = readFileSync(apk), apkHash = sha(apkBytes);
const aaptPath = resolve(dirname(adbPath), "../build-tools/36.0.0", process.platform === "win32" ? "aapt2.exe" : "aapt2");
assert(existsSync(aaptPath), "Existing SDK build-tools36 aapt2 required");
function apkMetadata(path) {
  const result = spawnSync(aaptPath, ["dump", "badging", path], { encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, "Immutable APK metadata inspection failed");
  const match = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(result.stdout);
  assert(match, "APK package metadata absent");
  const metadata = { packageName: match[1], versionCode: Number(match[2]), versionName: match[3] };
  assert.equal(metadata.packageName, packageName, "Wrong APK package");
  assert.equal(metadata.versionName, versions[metadata.versionCode], "Unrecognized APK version");
  return metadata;
}
const metadata = apkMetadata(apk);
if (rc2) {
  // RC2 approval covers the frozen delivered v17 and this exact built v18 path,
  // not arbitrary APKs which happen to advertise the same version metadata.
  assert(existsSync(approvedV17.path), "Original immutable v17 delivery must remain available");
  assert.equal(sha(readFileSync(approvedV17.path)), approvedV17.sha256, "Original immutable v17 delivery changed; preserve it and investigate");
  const approvedPath = mode === "baseline" ? approvedV17.path : resolve("artifacts/recipio-find-recipe-v18-debug.apk");
  const pathIdentity = path => process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
  assert.equal(pathIdentity(apk), pathIdentity(approvedPath), "RC2 only accepts the explicitly approved immutable delivery path");
  if (mode !== "baseline") {
    const builtApk = resolve("android/app/build/outputs/apk/debug/app-debug.apk");
    const built = JSON.parse(readFileSync("android/app/build/outputs/apk/debug/output-metadata.json", "utf8"));
    assert.equal(built.applicationId, packageName, "RC2 build package mismatch");
    assert.equal(built.elements?.length, 1, "One RC2 build APK required");
    assert.equal(built.elements[0].versionCode, finalVersionCode, "RC2 build version mismatch");
    assert.equal(built.elements[0].versionName, versions[finalVersionCode], "RC2 build name mismatch");
    assert.equal(apkHash, sha(readFileSync(builtApk)), "RC2 immutable APK must equal the exact final build");
  }
}
if (mode === "baseline") {
  assert(baselineVersions.includes(metadata.versionCode), "Baseline APK is outside this explicitly approved acceptance lineage");
  assert(!existsSync(baselinePath), "Frozen baseline already exists; never overwrite it");
} else {
  assert.equal(metadata.versionCode, finalVersionCode, "Final APK version is outside this explicitly approved acceptance lineage");
  assert(existsSync(baselinePath), "Freeze the approved actual installed baseline first; never reinstall or downgrade blindly");
}
assert(!existsSync(evidencePath), "Prior mode evidence exists; retain it and select a fresh evidence label");

const d = device(adbPath, serial);
assert.equal(d.adb("emu", "avd", "name").split(/[\r\n]+/)[0].trim(), avd, "Wrong AVD; do not switch devices");
assert.equal(d.adb("shell", "getprop", "sys.boot_completed"), "1", "Owned AVD must already be fully booted");
mkdirSync(out, { recursive: true });
let stage = "installed package preflight", failure, networkTouched = false;
const checks = [], guardChecks = [], restorationErrors = [], restoredNetwork = {};
const pass = message => { checks.push(message); console.log("PASS: " + message); };
const has = value => "document.body.innerText.includes(" + JSON.stringify(value) + ")";
const query = (sql, values = []) => d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:" + JSON.stringify(sql) + ",values:" + JSON.stringify(values) + "}).then(r=>r.values)");
const equalPrivate = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), message);
function hashResult(output) {
  const match = /^([a-f0-9]{64})\s/i.exec(output);
  assert(match, "Device SHA256 reply invalid");
  return match[1].toLowerCase();
}
function installedVersion(expected) {
  const dump = d.adb("shell", "dumpsys", "package", packageName);
  const actual = { packageName, versionCode: Number(/\bversionCode=(\d+)\b/.exec(dump)?.[1]), versionName: /\bversionName=([^\s]+)/.exec(dump)?.[1] };
  assert([...baselineVersions, finalVersionCode].includes(actual.versionCode) && actual.versionName === versions[actual.versionCode], "Actual installed version is outside this approved acceptance lineage; preserve it and investigate");
  if (expected) equalPrivate(actual, expected, "Actual installed metadata differs from supplied immutable APK; no install or downgrade performed");
  return actual;
}
function installedApkHash() {
  const lines = d.adb("shell", "pm", "path", packageName).split(/[\r\n]+/).filter(Boolean);
  assert.equal(lines.length, 1, "Expected one installed base APK, no split package");
  const path = lines[0].replace(/^package:/, "");
  assert(/^\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/.test(path), "Installed APK location invalid");
  return hashResult(d.adb("shell", "sha256sum", path));
}
async function installNoOnlineGuard() {
  // Install before acceptance UI actions. Never read provider credentials, request
  // options or source URLs. Both bridge styles share only numeric attempt counts.
  await d.evaluate(`(() => {
    const cap=window.Capacitor;
    if(!cap||typeof cap.nativePromise!=='function')throw new Error('Native bridge absent');
    const counts={providerAttempts:0,pageReadAttempts:0,finderSearchAttempts:0,finderExtractAttempts:0,backupWriteAttempts:0,backupChooseAttempts:0};
    window.__findRecipeAcceptance=counts;
    function forbidden(p,m){
      if(p==='LocalAiIntake'&&(m==='organize'||m==='preflight'))return 'providerAttempts';
      if(p==='LocalWebImport'&&m==='read')return 'pageReadAttempts';
      if(p==='LocalRecipeFinder'&&m==='search')return 'finderSearchAttempts';
      if(p==='LocalRecipeFinder'&&m==='extract')return 'finderExtractAttempts';
      if(p==='LocalBackup'&&m==='writeExport')return 'backupWriteAttempts';
      return null;
    }
    for(const name of ['nativePromise','nativeCallback']){
      const original=cap[name];if(typeof original!=='function')continue;
      cap[name]=function(p,m,...args){
        const counter=forbidden(p,m);
        if(counter){counts[counter]++;return Promise.reject(new Error('Preservation acceptance forbids this action'))}
        if(p==='LocalBackup'&&m==='chooseExport')counts.backupChooseAttempts++;
        return original.call(this,p,m,...args);
      };
    }
    return true;
  })()`);
}
async function coldStart() { await d.coldStart(); await installNoOnlineGuard(); }
async function inputFocus(packageId) {
  for (let i = 0; i < 100; i++) {
    const windows = d.adb("shell", "dumpsys", "window");
    assert(!/mCurrentFocus=[^\r\n]*Application Not Responding/.test(windows), "Android system ANR blocks real input; this is environment evidence, not a Recipe assertion");
    if (new RegExp("mCurrentFocus=[^\\r\\n]*" + packageId.replaceAll(".", "\\.")).test(windows)) return;
    await delay(100);
  }
  throw new Error("Expected Android input window did not gain focus");
}
async function onlineGuard() {
  const counts = await d.evaluate("window.__findRecipeAcceptance");
  assert(counts, "Acceptance guard is missing");
  for (const name of counterNames) assert.equal(counts[name], 0, "Acceptance attempted a forbidden online/export-write action");
  guardChecks.push(counts);
  return counts;
}
async function snapshot() {
  const rows = Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY rowid`)])));
  const paths = new Set();
  function collectPath(path) {
    if (path === null || path === undefined) return;
    assert(typeof path === "string" && /^images\/(?:[a-f0-9-]+|generation-[a-f0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(path), "Existing media reference cannot be verified safely");
    paths.add(path);
  }
  rows.recipes.forEach(row => collectPath(row.cover_path));
  rows.recipe_steps.forEach(row => collectPath(row.image_path));
  rows.cooking_records.forEach(row => collectPath(row.finished_photo_path));
  for (const row of rows.recipe_changes) for (const json of [row.before_json, row.after_json]) {
    const details = JSON.parse(json); collectPath(details.coverPath); details.steps.forEach(step => collectPath(step.imagePath));
  }
  // Include retained unreferenced images as well as current/history references.
  // Paths and hashes remain in the private snapshot; no media bytes reach logs.
  for (const path of d.adb("shell", "run-as", packageName, "find", "files/images", "-type", "f").split(/[\r\n]+/).filter(Boolean)) {
    assert(path.startsWith("files/images/"), "Media inventory escaped the private images directory");
    collectPath(path.slice("files/".length));
  }
  const images = Object.fromEntries([...paths].sort().map(path => [path, hashResult(d.adb("shell", "run-as", packageName, "sha256sum", "files/" + path))]));
  const keyConfigured = await d.evaluate("window.Capacitor.Plugins.LocalAiSecret.hasAiKey().then(r=>r.configured)");
  assert.equal(typeof keyConfigured, "boolean", "Only a boolean key status may enter the snapshot");
  return { rows, images, keyConfigured };
}
async function databaseIntegrity() {
  assert.equal((await query("PRAGMA user_version"))[0]?.user_version, 4, "Expected SQLite schema4");
  assert((await query("PRAGMA integrity_check")).every(row => row.integrity_check === "ok"), "SQLite integrity check failed");
  assert.equal((await query("PRAGMA foreign_key_check")).length, 0, "SQLite foreign-key violation");
  const names = (await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'android_metadata' ORDER BY name")).map(row => row.name);
  equalPrivate(names, [...tables].sort(), "Business schema changed unexpectedly");
}
function inspectionRecipe(snapshot) {
  const active = snapshot.rows.recipes.filter(row => row.deleted_at === null);
  const candidates = [...active].sort((a, b) => Number(b.title === "APK5C GENERATED 离线验收 🍚") - Number(a.title === "APK5C GENERATED 离线验收 🍚"));
  for (const row of candidates) {
    if (active.filter(other => other.title === row.title).length !== 1) continue;
    const steps = snapshot.rows.recipe_steps.filter(step => step.recipe_id === row.id).sort((a, b) => a.position - b.position);
    const illustratedStep = steps.find(step => step.image_path);
    if (!steps.length || (!row.cover_path && !illustratedStep)) continue;
    return { id: row.id, title: row.title, imageAlt: row.cover_path ? row.title + " 封面" : "步骤 " + (illustratedStep.position + 1) + " 参考图", stepCount: steps.length, firstStepInstruction: steps[0].instruction };
  }
  throw new Error("Retained unambiguous recipe with local image and steps required; no fixtures are seeded");
}
function baseline() {
  const saved = JSON.parse(readFileSync(baselinePath, "utf8"));
  assert(saved.formatVersion === 1 && saved.serial === serial && saved.avd === avd, "Baseline identity or format mismatch");
  assert(baselineVersions.includes(saved.apk?.versionCode) && saved.apk.versionName === versions[saved.apk.versionCode] && saved.apk.packageName === packageName, "Baseline must come from this lineage's actual installed immutable source version");
  if (rc2) {
    assert.equal(saved.targetVersionCode, finalVersionCode, "RC2 baseline must explicitly target v18");
    assert.equal(saved.apk.sha256, approvedV17.sha256, "RC2 baseline must match the original delivered v17 bytes");
  }
  assert(saved.apk.path && isAbsolute(saved.apk.path) && existsSync(saved.apk.path), "Matching immutable baseline APK is no longer available; preserve installed state");
  assert.equal(sha(readFileSync(saved.apk.path)), saved.apk.sha256, "Immutable baseline APK changed after freeze");
  equalPrivate(apkMetadata(saved.apk.path), { packageName, versionCode: saved.apk.versionCode, versionName: saved.apk.versionName }, "Frozen baseline APK metadata mismatch");
  assert(saved.sqliteSchemaVersion === 4 && saved.backupFormatContract === 2, "SQLite4/Backup2 baseline contract required");
  assert(saved.snapshot && Object.keys(saved.snapshot.rows ?? {}).length === 8, "Eight-table baseline required");
  equalPrivate(inspectionRecipe(saved.snapshot), saved.inspectionRecipe, "Private inspection recipe changed in baseline");
  return saved;
}
const imageLoaded = saved => "[...document.querySelectorAll('img')].some(i=>i.alt===" + JSON.stringify(saved.inspectionRecipe.imageAlt) + "&&i.complete&&i.naturalWidth>0&&!i.hidden)";
async function localDetail(saved) {
  const recipe = saved.inspectionRecipe;
  await d.click("我的菜谱"); await d.fill("搜索菜名或食材", recipe.title);
  await d.wait("[...document.querySelectorAll('button')].filter(b=>b.getAttribute('aria-label')===" + JSON.stringify("打开 " + recipe.title) + ").length===1");
  await d.click("打开 " + recipe.title);
  await d.wait(has("编辑菜谱")); await d.wait(imageLoaded(saved)); await d.wait(has(recipe.firstStepInstruction));
}
function networkSnapshot() {
  return Object.fromEntries([["airplane", "airplane_mode_on"], ["wifi", "wifi_on"], ["data", "mobile_data"]]
    .map(([name, key]) => [name, d.adb("shell", "settings", "get", "global", key)]));
}
const originalNetwork = mode === "offline" ? networkSnapshot() : null;
if (originalNetwork) for (const value of Object.values(originalNetwork)) assert(value === "0" || value === "1", "Cannot safely restore an unknown network setting");

try {
  const actual = installedVersion();
  const saved = mode === "baseline" ? null : baseline();
  if (mode === "upgrade") {
    // No -d, no uninstall and no baseline reinstall. The source version and bytes
    // must be exactly the ones captured for this explicitly approved transition.
    assert(saved.apk.versionCode < metadata.versionCode, "Only the approved forward upgrade is permitted");
    equalPrivate(actual, { packageName, versionCode: saved.apk.versionCode, versionName: saved.apk.versionName }, "Upgrade source is no longer the frozen installed baseline; preserve it and investigate");
    assert.equal(installedApkHash(), saved.apk.sha256, "Installed baseline APK differs from frozen immutable bytes");
  } else {
    equalPrivate(actual, metadata, "Actual installed version does not match supplied immutable APK; no downgrade performed");
    assert.equal(installedApkHash(), apkHash, "Installed APK bytes differ from supplied immutable APK");
  }
  await coldStart(); await databaseIntegrity();
  if (mode === "baseline") {
    stage = "freeze actual installed baseline without data changes";
    const before = await snapshot();
    const retained = { formatVersion: 1, serial, avd, targetVersionCode: finalVersionCode, apk: { ...metadata, path: apk, sha256: apkHash, bytes: apkBytes.length }, sqliteSchemaVersion: 4, backupFormatContract: 2, inspectionRecipe: inspectionRecipe(before), snapshot: before, at: new Date().toISOString() };
    await localDetail(retained); await onlineGuard();
    equalPrivate(await snapshot(), before, "Baseline detail/image view altered existing data");
    writeFileSync(baselinePath, JSON.stringify(retained, null, 2), { flag: "wx" });
    pass("Actual installed immutable v" + actual.versionCode + " baseline frozen without seeding; all eight-table rows, all current/history/retained image hashes and key configured boolean captured privately");
  } else if (mode === "upgrade") {
    stage = "compare actual installed source against frozen baseline";
    equalPrivate(await snapshot(), saved.snapshot, "Installed source data changed after freeze; preserve and investigate"); await onlineGuard();
    stage = "install-r immutable final v" + metadata.versionCode + " APK";
    d.close(); assert(d.adb("install", "-r", apk).includes("Success"), "Final approved coverage install failed"); installedVersion(metadata);
    assert.equal(installedApkHash(), apkHash, "Installed final bytes differ from the approved immutable APK");
    await coldStart(); await databaseIntegrity(); equalPrivate(await snapshot(), saved.snapshot, "Approved baseline-to-final preservation mismatch");
    await localDetail(saved); await onlineGuard(); equalPrivate(await snapshot(), saved.snapshot, "Post-upgrade detail/image view altered existing data");
    pass("Actual install-r v" + saved.apk.versionCode + "→v" + metadata.versionCode + " preserves every eight-table row/ID/time/order, all image hashes and key configured state; SQLite4 integrity/FK valid");
  } else {
    stage = "compare final v" + metadata.versionCode + " before airplane mode";
    equalPrivate(await snapshot(), saved.snapshot, "Offline acceptance requires all retained immutable baseline data"); await onlineGuard();
    stage = "disable owned emulator connectivity"; networkTouched = true;
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable"); d.adb("shell", "svc", "wifi", "disable"); d.adb("shell", "svc", "data", "disable");
    for (let i = 0; i < 50; i++) { const value = networkSnapshot(); if (value.airplane === "1" && value.wifi === "0" && value.data === "0") break; await delay(100); }
    equalPrivate(networkSnapshot(), { airplane: "1", wifi: "0", data: "0" }, "Airplane/Wi-Fi/mobile data must all be offline");
    stage = "offline force-stop cold-start/local detail/image";
    await coldStart(); installedVersion(metadata); await localDetail(saved);
    await d.screenshot(resolve(out, "offline-detail-private.png"));
    stage = "offline Cooking and real Android Back";
    await d.click("开始引导烹饪"); await d.wait(has("第 1 步 / " + saved.inspectionRecipe.stepCount)); await d.wait("!!document.querySelector('[role=dialog]')");
    await inputFocus(packageName); d.adb("shell", "input", "keyevent", "4"); await d.wait("!document.querySelector('[role=dialog]')"); await d.wait(imageLoaded(saved));
    equalPrivate(await snapshot(), saved.snapshot, "Offline Cooking/Back must not create cooking records or change data");
    pass("v" + metadata.versionCode + " airplane-mode force-stop cold launch, retained local detail/image/Cooking/real Android Back work with unchanged data");
    stage = "offline real Backup SAF open/cancel";
    await d.click("设置"); await d.click("导出完整备份");
    let pickerOpened = false;
    for (let i = 0; i < 100; i++) {
      const activities = d.adb("shell", "dumpsys", "activity", "activities");
      if (/^\s*(?:topResumedActivity=|mResumedActivity:|ResumedActivity:)[^\r\n]*documentsui/m.test(activities)) { pickerOpened = true; break; }
      await delay(100);
    }
    assert(pickerOpened, "Real DocumentsUI must be resumed in foreground"); await inputFocus("documentsui"); d.adb("shell", "input", "keyevent", "4");
    await d.wait(has("数据与备份")); await d.wait(has("操作已取消"));
    const counts = await onlineGuard(); assert.equal(counts.backupChooseAttempts, 1, "Exactly one native export chooser launch required");
    equalPrivate(await snapshot(), saved.snapshot, "Backup chooser cancellation altered local data");
    pass("Offline native Backup SAF opens and cancels; export write0 and all baseline data/images/key state retained");
    stage = "offline Finder entry and typing without online action";
    await d.click("首页"); await d.click("新增菜谱"); await d.click("帮我找做法");
    await d.wait(has("想做什么菜")); await d.fill("想做什么菜", "APK6 GENERATED 离线入口");
    await onlineGuard(); await d.click("返回"); await d.wait(has("今天想做什么？"));
    await databaseIntegrity(); equalPrivate(await snapshot(), saved.snapshot, "Opening/typing/leaving Finder altered persistent data"); await onlineGuard();
    pass("Offline Finder entry/typing/leave has search0/extract0 and preserves all local data");
    const external = d.events.filter(event => {
      if (event.method !== "Network.requestWillBeSent") return false;
      try { const url = new URL(event.params.request.url); return !(["data:", "blob:"].includes(url.protocol) || url.protocol === "https:" && url.hostname === "localhost" && !url.port); }
      catch { return true; }
    });
    assert.equal(external.length, 0, "Observed WebView attempted external requests");
    assert.equal(d.events.filter(event => event.method === "Runtime.exceptionThrown").length, 0, "Observed WebView has uncaught runtime errors");
    pass("Observed connected WebView external requests0/runtime errors0; JS guard blocks Provider/page-read/Finder search/extract and all attempt counts remain0");
  }
} catch (error) {
  // Underlying assertions may include private row/body/path values. Retain them
  // only in memory and publish the stage, never raw error content or user data.
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
      catch { /* Continue independent readback after attempting all restoration commands. */ }
      await delay(100);
    }
    for (const name of ["airplane", "wifi", "data"]) if (restoredNetwork[name] !== originalNetwork[name]) restorationErrors.push(name + " exact readback mismatch");
    if (restorationErrors.length) failure = { stage, type: "RestorationError", message: "Original network restoration needs attention", previousFailure: failure ?? null };
    else pass("Owned emulator airplane/Wi-Fi/mobile-data settings restored and read back exactly");
  }
  try {
    writeFileSync(evidencePath, JSON.stringify({
      mode, serial, avd, releaseVariant: rc2 ? "rc2" : "original", targetVersionCode: finalVersionCode, apk: { ...metadata, path: apk, bytes: apkBytes.length, sha256: apkHash }, checks, failure: failure ?? null,
      baselineFile: "installed-preservation-baseline.json", sqliteSchemaVersion: 4, backupFormatContract: 2,
      backupFormatEvidence: "Existing Backup2 contract retained; this acceptance cancels SAF before archive writing. Fresh Backup2 manifest/export/restore verification Not Run in this script.",
      guardChecks, originalNetwork, restoredNetwork, restorationErrors, physicalPhone: "Not Run", realAiCalls: 0,
      observationBoundary: "Bridge guard installed after WebView connection, before acceptance UI actions; CDP request evidence covers connected WebView only. Actual offline cold start has airplane mode, Wi-Fi and data disabled.",
      realAiEvidence: "No organize/preflight/page-read/search/extract action requested; no credentials read, no paid Provider smoke performed",
      at: new Date().toISOString(),
    }, null, 2), { flag: "wx" });
  } finally {
    try { d.close(); } catch { process.exitCode = 1; console.error("FAIL: owned WebView forwarding cleanup"); }
  }
}
if (failure) process.exitCode = 1;
