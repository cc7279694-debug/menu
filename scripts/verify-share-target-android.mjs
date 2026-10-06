// Generated-data acceptance on one explicitly selected RECIPIO emulator; never a phone.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { device } from "./android-webview.mjs";

const [adbPath, serial, mode, apk] = process.argv.slice(2);
assert(isAbsolute(adbPath) && existsSync(adbPath), "Installed absolute ADB required");
assert.equal(serial, "emulator-5580", "Explicit owned emulator only");
assert(["baseline", "upgrade", "share-offline"].includes(mode));
assert(isAbsolute(apk) && existsSync(apk), "Absolute immutable APK required");
const d = device(adbPath, serial), out = resolve("artifacts/share-target");
mkdirSync(out, { recursive: true });
assert.equal(d.adb("emu", "avd", "name").split(/[\r\n]+/)[0].trim(), "Recipio_Backup_36");
assert.equal(d.adb("shell", "getprop", "sys.boot_completed"), "1");
const sha = b => createHash("sha256").update(b).digest("hex");
const checks = [], pass = text => { checks.push(text); console.log("PASS: " + text); };
const query = (sql, values = []) => d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:" + JSON.stringify(sql) + ",values:" + JSON.stringify(values) + "}).then(r=>r.values)");
const has = text => "document.body.innerText.includes(" + JSON.stringify(text) + ")";
const tables = ["recipes", "recipe_ingredients", "recipe_steps", "recipe_preparations", "recipe_key_tips", "recipe_changes", "cooking_records", "backup_restore_state"];
async function snapshot() {
  const rows = Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY rowid`)])));
  const paths = new Set();
  function collect(value) {
    if (typeof value === "string" && /^images\/(?:[a-f0-9-]+|generation-[a-f0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(value)) paths.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  }
  collect(rows);
  rows.recipe_changes.forEach(row => { collect(JSON.parse(row.before_json)); collect(JSON.parse(row.after_json)); });
  const images = Object.fromEntries([...paths].sort().map(path => [path, sha(d.raw("exec-out", "run-as", "app.recipio.local", "cat", "files/" + path))]));
  return { rows, images, keyConfigured: await d.evaluate("window.Capacitor.Plugins.LocalAiSecret.hasAiKey().then(r=>r.configured)") };
}
const baselinePath = resolve(out, "v13-preservation-baseline.json");
const generatedTitle = "APK5B GENERATED 离线验收 🍚";
const coverLoaded = "[...document.querySelectorAll('img')].some(i=>i.alt===" + JSON.stringify(generatedTitle + " 封面") + "&&i.complete&&i.naturalWidth>0)";
const url = "https://generated.example/recipe?portion=2&token=generated#step";
const sh = text => "'" + text.replaceAll("'", "'\\''") + "'";
function send(text) { d.adb("shell", "am", "start", "-a", "android.intent.action.SEND", "-t", "text/plain", "--es", "android.intent.extra.TEXT", sh(text), "-n", "app.recipio.local/.MainActivity"); }
const imeSettings = { airplane: d.adb("shell", "settings", "get", "global", "airplane_mode_on"), wifi: d.adb("shell", "settings", "get", "global", "wifi_on"), data: d.adb("shell", "settings", "get", "global", "mobile_data") };
let failure;
try {
  await d.coldStart();
  if (mode === "baseline") {
    assert(!existsSync(baselinePath), "Preservation baseline must not be overwritten");
    assert(d.adb("shell", "dumpsys", "package", "app.recipio.local").includes("versionCode=13"));
    assert.equal((await query("SELECT id FROM recipes WHERE title=?", [generatedTitle])).length, 0);
    await d.click("新增菜谱"); await d.click("手动录入"); await d.fill("菜名", generatedTitle);
    await d.click("添加食材"); await d.fill("食材 1", "测试米饭"); await d.fill("用量 1", "100克");
    await d.click("添加步骤"); await d.fill("步骤 1", "生成测试步骤\n保留中文与 Emoji 🍚");
    await d.fill("个人备注", "Only generated local acceptance data"); await d.click("快速保存菜谱"); await d.wait(has("编辑菜谱"));
    const recipe = (await query("SELECT id FROM recipes WHERE title=?", [generatedTitle]))[0]; assert(recipe);
    const path = "images/" + randomUUID() + ".png";
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1EAAAAASUVORK5CYII=";
    await d.evaluate("window.Capacitor.Plugins.Filesystem.writeFile(" + JSON.stringify({ path, data: png, directory: "DATA", recursive: true }) + ")");
    // Seed a test-owned image reference only; never edits any other record or existing file.
    await d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.executeSet(" + JSON.stringify({ database: "recipio", set: [{ statement: "UPDATE recipes SET cover_path=? WHERE id=? AND title=?", values: [path, recipe.id, generatedTitle] }], transaction: true }) + ")");
    await d.coldStart(); await d.click("打开 " + generatedTitle);
    await d.wait(coverLoaded);
    const data = await snapshot(); assert.equal(data.images[path], sha(Buffer.from(png, "base64")));
    writeFileSync(baselinePath, JSON.stringify(data, null, 2), { flag: "wx" });
    pass("Installed v13 generated recipe and image persisted; all entity rows, restore facts, image hashes and key status frozen");
  } else if (mode === "upgrade") {
    assert(existsSync(baselinePath)); d.close(); d.adb("install", "-r", apk); await d.coldStart();
    assert(d.adb("shell", "dumpsys", "package", "app.recipio.local").includes("versionCode=14"));
    assert.equal((await query("PRAGMA user_version"))[0].user_version, 4);
    assert.deepEqual(await snapshot(), JSON.parse(readFileSync(baselinePath, "utf8")));
    assert.deepEqual(await query("PRAGMA foreign_key_check"), []);
    await d.click("打开 " + generatedTitle); await d.wait(coverLoaded);
    pass("Actual install -r v13→v14 retained all eight table rows, IDs/times/order, image bytes and key configured status; SQLite4/FK valid");
  } else {
    assert(d.adb("shell", "dumpsys", "package", "app.recipio.local").includes("versionCode=14"));
    const before = await snapshot();
    await d.click("打开 " + generatedTitle); send(url);
    await d.wait("!!document.querySelector('[aria-label=\"待处理分享\"]')||!!document.querySelector('input[type=url]')");
    // Detail is a safe route: prefill only, never click Read or Provider actions.
    await d.wait("document.querySelector('input[type=url]')?.value===" + JSON.stringify(url));
    send("https://second.example/r"); await d.wait("!!document.querySelector('[aria-label=\"待处理分享\"]')");
    assert.equal(await d.evaluate("document.querySelector('input[type=url]').value"), url);
    assert(!(await d.evaluate("document.querySelector('[aria-label=\"待处理分享\"]').innerText")).includes("token="));
    await d.screenshot(resolve(out, "pending-share-generated.png"));
    await d.command("Emulation.setDeviceMetricsOverride", { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
    assert(await d.evaluate("document.documentElement.scrollWidth<=320"));
    assert(await d.evaluate("[...document.querySelector('[aria-label=\"待处理分享\"]').querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)"));
    await d.command("Emulation.clearDeviceMetricsOverride"); await d.click("忽略这次分享");
    assert.deepEqual(await snapshot(), before);
    pass("Warm safe detail Share prefills original path/query/fragment; newer Share cannot replace active URL; hostname-only banner/Ignore/320px touch layout, no data writes");
    d.close(); d.adb("shell", "am", "force-stop", "app.recipio.local"); send(url); await d.connect();
    await d.wait("document.querySelector('input[type=url]')?.value===" + JSON.stringify(url));
    assert(!await d.evaluate(has("正在安全读取网页")));
    assert.deepEqual(await snapshot(), before);
    pass("Actual force-stop cold SEND opens installed native SQLite app without automatic Fetch/Parser/AI/save");
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable"); d.adb("shell", "svc", "wifi", "disable"); d.adb("shell", "svc", "data", "disable");
    await d.coldStart(); assert.equal(d.adb("shell", "settings", "get", "global", "airplane_mode_on"), "1");
    await d.click("打开 " + generatedTitle); await d.wait(coverLoaded);
    await d.click("开始引导烹饪"); await d.wait(has("第 1 步 / 1")); d.adb("shell", "input", "keyevent", "4");
    await d.wait("!document.querySelector('[role=dialog]')"); assert.deepEqual(await snapshot(), before);
    await d.screenshot(resolve(out, "offline-detail-generated.png"));
    await d.click("设置"); await d.click("导出完整备份");
    // Actual system picker must open; cancel, never overwrite any backup or restore data.
    let pickerOpened = false;
    for (let i = 0; i < 30; i++) {
      // API36 reports topResumedActivity; older releases report mResumedActivity.
      const active = d.adb("shell", "dumpsys", "activity", "activities");
      if (/^\s*(?:topResumedActivity=|mResumedActivity:|ResumedActivity:)[^\r\n]*documentsui/m.test(active)) { pickerOpened = true; break; }
      await new Promise(r=>setTimeout(r,100));
    }
    assert(pickerOpened, "Native DocumentsUI must be the resumed foreground Activity");
    d.adb("shell", "input", "keyevent", "4"); await d.wait(has("数据与备份")); assert.deepEqual(await snapshot(), before);
    pass("Actual flight-mode force-stop cold start, local image/detail/Guided/Back and Backup SAF export-open/cancel remain usable with unchanged data");
    const external = d.events.filter(e=>e.method==="Network.requestWillBeSent"&&!/^(https:\/\/localhost|data:|blob:)/.test(e.params.request.url));
    assert.equal(external.length, 0); assert.equal(d.events.filter(e=>e.method==="Runtime.exceptionThrown").length,0);
    pass("WebView external requests0 / uncaught runtime errors0; no real Qwen calls or shared source persistence");
  }
} catch (error) { failure = error; console.error(error.message); }
finally {
  const restorationErrors = [];
  const restoredNetwork = {};
  if (mode === "share-offline") {
    const commands = [
      ["airplane", ["shell", "cmd", "connectivity", "airplane-mode", imeSettings.airplane === "1" ? "enable" : "disable"]],
      ["wifi", ["shell", "svc", "wifi", imeSettings.wifi === "1" ? "enable" : "disable"]],
      ["data", ["shell", "svc", "data", imeSettings.data === "1" ? "enable" : "disable"]],
    ];
    // Attempt every restoration even when another command fails; never hide it.
    for (const [name, args] of commands) {
      try { d.adb(...args); } catch (error) { restorationErrors.push(name + ": " + error.message); }
    }
    for (const [name, setting] of [["airplane", "airplane_mode_on"], ["wifi", "wifi_on"], ["data", "mobile_data"]]) {
      try {
        restoredNetwork[name] = d.adb("shell", "settings", "get", "global", setting);
        assert.equal(restoredNetwork[name], imeSettings[name], "Network state not restored: " + name);
      } catch (error) { restorationErrors.push(name + ": " + error.message); }
    }
    if (restorationErrors.length) failure = new Error([failure?.message, ...restorationErrors].filter(Boolean).join("; "));
    else pass("Owned emulator airplane/Wi-Fi/mobile-data settings restored and read back exactly");
  }
  try {
    writeFileSync(resolve(out, mode + "-evidence.json"), JSON.stringify({ mode, avd: "Recipio_Backup_36", serial, apk: { path: apk, bytes: readFileSync(apk).length, sha256: sha(readFileSync(apk)) }, checks, failure: failure?.message ?? null, originalNetwork: imeSettings, restoredNetwork, restorationErrors, physicalPhone: "Not Run", realAiCalls: 0, at: new Date().toISOString() }, null, 2));
  } finally { d.close(); }
}
if (failure) process.exitCode = 1;
