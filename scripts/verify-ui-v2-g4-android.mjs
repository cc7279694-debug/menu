// QA only. The caller must verify the live QEMU PID/command/port ownership first.
// Never clears/uninstalls, launches the app, reads credentials, or selects another device.
// Usage: node scripts/verify-ui-v2-g4-android.mjs inspect|fingerprint|upgrade
//   [--adb=<absolute adb.exe>] [--aapt=<absolute aapt.exe>]
//   upgrade --apk=<absolute final.apk> --expected-code=<code> --expected-sha256=<sha256>
// fingerprint requires an already stopped app; only upgrade force-stops this target app.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseOut = join(root, "output/playwright/ui-v2/g4/resume-20261025");
// Historical5580 belongs to the user's VPN; leave it untouched. Same owned AVD,
// independently checked free port5582 for this G4 execution.
const serial = "emulator-5582", avd = "Recipio_Backup_36", packageName = "app.recipio.local";
const tables = ["recipes", "recipe_ingredients", "recipe_steps", "recipe_preparations",
  "recipe_key_tips", "recipe_changes", "cooking_records", "backup_restore_state"];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
let stage = "arguments", out, receipt;

function run(command, args, label, options = {}) {
  const { allowedStatuses = [0], ...spawnOptions } = options;
  const result = spawnSync(command, args, { timeout: 30000, maxBuffer: 64 * 1024 * 1024, ...spawnOptions });
  assert(!result.error && result.signal == null && allowedStatuses.includes(result.status),
    `${label} failed; subprocess output intentionally omitted`);
  return result.stdout;
}
function text(bytes) { return bytes.toString("utf8").trim(); }
function writeJson(name, value) {
  const path = join(out, name);
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  return path;
}
function assertWithin(base, path) {
  const child = relative(base, path);
  assert(child && !child.startsWith(".." + sep) && child !== ".." && !isAbsolute(child), "Output must stay in its ignored safety directory");
}
function createOutput(mode) {
  // Reject a redirected output tree before any private bytes are written.
  let cursor = root;
  for (const segment of relative(root, baseOut).split(sep)) {
    cursor = join(cursor, segment);
    if (existsSync(cursor)) assert(!lstatSync(cursor).isSymbolicLink(), "Output directory links are not allowed");
  }
  run("git", ["-C", root, "check-ignore", "--quiet", "output/playwright/ui-v2/g4/resume-20261025/private-probe.tar"], "Ignored-output gate");
  mkdirSync(baseOut, { recursive: true });
  out = join(baseOut, `${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`);
  assertWithin(baseOut, out);
  mkdirSync(out); // A previous safety copy must never be overwritten.
}
function findAapt(adb) {
  const buildTools = resolve(dirname(adb), "../build-tools");
  assert(existsSync(buildTools), "Installed Android build-tools are required to inspect the candidate APK");
  const versions = readdirSync(buildTools).filter(name => /^\d+(?:\.\d+)*(?:[-a-zA-Z0-9.]*)?$/.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const found = versions.map(version => join(buildTools, version, "aapt.exe")).find(existsSync);
  assert(found, "No installed aapt.exe found; supply --aapt explicitly");
  return found;
}

try {
  const args = process.argv.slice(2), mode = args.shift();
  assert(["inspect", "fingerprint", "upgrade"].includes(mode), "Choose inspect, fingerprint, or upgrade; see the script usage comment");
  const options = new Map();
  for (const argument of args) {
    const match = /^--(adb|aapt|apk|expected-code|expected-sha256)=(.+)$/.exec(argument);
    assert(match && !options.has(match[1]), "Unknown, empty, or duplicate option");
    options.set(match[1], match[2]);
  }
  const adbPath = options.get("adb") ?? "C:/Users/CDD/AppData/Local/MirraAndroid/sdk/platform-tools/adb.exe";
  assert(isAbsolute(adbPath) && existsSync(adbPath), "An existing absolute adb path is required");
  const adb = (...arguments_) => run(adbPath, ["-s", serial, ...arguments_], "Owned-target ADB command");
  let candidate;
  if (mode === "upgrade") {
    const apk = options.get("apk"), expectedCode = Number(options.get("expected-code"));
    const expectedSha256 = options.get("expected-sha256")?.toLowerCase();
    assert(apk && isAbsolute(apk) && existsSync(apk), "An existing absolute final APK path is required");
    assert(Number.isSafeInteger(expectedCode) && expectedCode > 0, "A positive expected version code is required");
    assert(/^[a-f0-9]{64}$/.test(expectedSha256 ?? ""), "An explicit SHA-256 is required");
    const bytes = readFileSync(apk);
    assert(hash(bytes) === expectedSha256, "Candidate APK bytes do not match the expected SHA-256");
    const aapt = options.get("aapt") ?? findAapt(adbPath);
    assert(isAbsolute(aapt) && existsSync(aapt), "An existing absolute aapt path is required");
    const badging = text(run(aapt, ["dump", "badging", apk], "Candidate APK metadata read"));
    const metadata = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/m.exec(badging);
    assert(metadata && metadata[1] === packageName && Number(metadata[2]) === expectedCode,
      "Candidate APK package/version does not match the explicit target");
    candidate = { path: apk, code: expectedCode, versionName: metadata[3], sha256: expectedSha256, bytes: bytes.length };
  } else {
    assert(!options.has("apk") && !options.has("expected-code") && !options.has("expected-sha256"), "APK options are only allowed in upgrade mode");
  }

  stage = "owned-target gate";
  assert(text(adb("emu", "avd", "name")).split(/[\r\n]+/)[0] === avd, "Unexpected AVD; no app operation performed");
  assert(text(adb("shell", "getprop", "sys.boot_completed")) === "1", "Owned target has not completed boot");
  assert(text(adb("shell", "getprop", "ro.build.version.sdk")) === "36", "Only the owned API36 environment is supported");
  function installed() {
    const paths = text(adb("shell", "pm", "path", packageName)).split(/[\r\n]+/);
    assert(paths.length === 1 && /^package:\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/.test(paths[0]), "Expected installed monolithic RECIPIO target is missing");
    const dump = text(adb("shell", "dumpsys", "package", packageName));
    const code = Number(/\bversionCode=(\d+)\b/.exec(dump)?.[1]);
    const versionName = /\bversionName=([^\r\n]+)/.exec(dump)?.[1].trim();
    assert(Number.isSafeInteger(code) && code > 0 && versionName, "Installed target version metadata is missing");
    const sha256 = text(adb("shell", "sha256sum", paths[0].slice("package:".length))).split(/\s+/)[0];
    assert(/^[a-f0-9]{64}$/.test(sha256), "Installed target SHA-256 is invalid");
    return { code, versionName, sha256 };
  }
  function assertStopped() {
    const result = spawnSync(adbPath, ["-s", serial, "shell", "pidof", packageName], { timeout: 30000 });
    assert(!result.error && result.signal == null && result.status === 1 && text(result.stdout) === "",
      "Fingerprint requires the RECIPIO app to be stopped first; read-only mode does not stop it");
  }
  function snapshot(name) {
    assertStopped();
    const imageState = text(adb("shell", "run-as", packageName, "sh", "-c",
      "'if [ -L files/images ]; then exit 3; elif [ -d files/images ]; then printf present; elif [ -e files/images ]; then exit 4; else printf absent; fi'"));
    assert(["present", "absent"].includes(imageState), "Image directory state could not be safely determined");
    const bytes = adb("exec-out", "run-as", packageName, "tar", "-cf", "-", "databases", ...(imageState === "present" ? ["files/images"] : []));
    assert(bytes.length >= 1024, "Private safety archive is empty");
    const archive = join(out, `${name}.tar`), directory = join(out, name);
    assertWithin(out, archive); assertWithin(out, directory);
    assert(!existsSync(directory), "Snapshot directory already exists");
    writeFileSync(archive, bytes, { flag: "wx" });
    const entries = text(run("tar", ["-tf", archive], "Safety archive path inspection")).split(/[\r\n]+/);
    assert(new Set(entries).size === entries.length, "Duplicate archive paths are not allowed");
    for (const entry of entries) assert(!entry.includes("..") && /^(?:databases(?:\/[A-Za-z0-9_.-]+)?|files\/images(?:\/[A-Za-z0-9_.-]+)*)\/?$/.test(entry), "Unsafe private archive path rejected");
    const types = text(run("tar", ["-tvf", archive], "Safety archive file-type inspection")).split(/[\r\n]+/);
    assert(types.length === entries.length && types.every(line => /^[-d]/.test(line)), "Archive links or special files are not allowed");
    mkdirSync(directory);
    run("tar", ["-xf", archive, "-C", directory], "Private safety archive extraction");
    const db = new DatabaseSync(join(directory, "databases/recipioSQLite.db"), { readOnly: true });
    let rows;
    try {
      assert(db.prepare("PRAGMA user_version").get().user_version === 4, "Expected SQLite schema4");
      assert(db.prepare("PRAGMA integrity_check").get().integrity_check === "ok", "SQLite integrity check failed");
      assert(db.prepare("PRAGMA foreign_key_check").all().length === 0, "SQLite foreign-key check failed");
      const actualTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'android_metadata' ORDER BY name").all().map(row => row.name);
      assert(JSON.stringify(actualTables) === JSON.stringify([...tables].sort()), "Expected exactly eight business tables");
      rows = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    } finally { db.close(); }
    const images = {};
    function walk(base, prefix = "") {
      for (const name of readdirSync(base).sort()) {
        assert(/^[A-Za-z0-9_.-]+$/.test(name) && name !== "." && name !== "..", "Unsafe local image filename rejected");
        const file = join(base, name), metadata = lstatSync(file);
        assert(!metadata.isSymbolicLink(), "Image links are not allowed");
        if (metadata.isDirectory()) walk(file, `${prefix}${name}/`);
        else {
          assert(metadata.isFile(), "Special image files are not allowed");
          images[`images/${prefix}${name}`] = hash(readFileSync(file));
        }
      }
    }
    if (imageState === "present") walk(join(directory, "files/images"));
    return {
      schema: 4, integrity: "ok", foreignKeyErrors: 0,
      rowHash: hash(JSON.stringify(rows)),
      tableHashes: Object.fromEntries(tables.map(table => [table, hash(JSON.stringify(rows[table]))])),
      idOrderTimeHash: hash(JSON.stringify(rows.recipes.map(row => [row.id, row.created_at, row.updated_at, row.deleted_at]))),
      imageHash: hash(JSON.stringify(images)), counts: Object.fromEntries(tables.map(table => [table, rows[table].length])),
      imageCount: Object.keys(images).length, archiveBytes: bytes.length, archiveSha256: hash(bytes),
    };
  }

  const beforePackage = installed();
  if (candidate) assert(candidate.code >= beforePackage.code, "Downgrade refused; preserve the existing installation");
  createOutput(mode);
  receipt = { mode, at: new Date().toISOString(), serial, avd, sdk: 36,
    ownership: "Live QEMU PID/command/port must be verified by the caller before invocation",
    packageName, beforePackage, realAiCalls: 0, appStarted: false,
    privateData: "Raw database/media stay in this ignored local safety directory; no rows or credentials in receipts" };
  if (mode === "inspect") {
    stage = "read-only TalkBack inspection";
    const paths = text(run(adbPath, ["-s", serial, "shell", "pm", "path", "com.google.android.marvin.talkback"], "TalkBack package inspection", { allowedStatuses: [0, 1] }));
    assert(!paths || paths.split(/[\r\n]+/).every(path => /^package:\//.test(path)), "Unexpected TalkBack package query response");
    const enabled = text(adb("shell", "settings", "get", "secure", "enabled_accessibility_services"));
    const globalEnabled = text(adb("shell", "settings", "get", "secure", "accessibility_enabled"));
    assert(["0", "1", "null"].includes(globalEnabled), "Unexpected accessibility-enabled setting");
    receipt.talkBack = { installed: !!paths, enabled: enabled.split(":").some(component => component.startsWith("com.google.android.marvin.talkback/")), accessibilityEnabled: globalEnabled, actualMainChain: "NOT_RUN" };
    receipt.status = "INSPECTED";
  } else if (mode === "fingerprint") {
    stage = "read-only quiescent fingerprint";
    receipt.snapshot = snapshot("private-fingerprint");
    receipt.afterPackage = installed();
    assert(JSON.stringify(receipt.afterPackage) === JSON.stringify(beforePackage), "Target package changed during fingerprint capture");
    receipt.status = "CAPTURED";
  } else {
    stage = "stop owned RECIPIO app only";
    adb("shell", "am", "force-stop", packageName);
    stage = "pre-install private safety copy";
    receipt.before = snapshot("private-before");
    stage = "preserving cover installation";
    assert(hash(readFileSync(candidate.path)) === candidate.sha256, "Candidate APK bytes changed before installation");
    const install = text(run(adbPath, ["-s", serial, "install", "-r", candidate.path], "Preserving install-r", { timeout: 120000 }));
    assert(/\bSuccess\b/.test(install), "Preserving installation did not report Success");
    receipt.candidate = candidate;
    stage = "installed candidate readback";
    receipt.afterPackage = installed();
    assert(receipt.afterPackage.code === candidate.code && receipt.afterPackage.sha256 === candidate.sha256
      && receipt.afterPackage.versionName === candidate.versionName, "Installed candidate package/version/bytes mismatch");
    stage = "post-install private safety copy before app launch";
    receipt.after = snapshot("private-after");
    stage = "eight-table and all-image preservation comparison";
    for (const key of ["schema", "integrity", "foreignKeyErrors", "rowHash", "tableHashes", "idOrderTimeHash", "imageHash", "counts", "imageCount"]) {
      assert(JSON.stringify(receipt.before[key]) === JSON.stringify(receipt.after[key]), `Preservation comparison failed: ${key}`);
    }
    receipt.status = "PRESERVED";
    receipt.scope = "Quiescent preserving install only; runtime startup, instrumentation, smoke, TalkBack and performance are NOT_RUN";
  }
  const receiptPath = writeJson("receipt.json", receipt);
  console.log(JSON.stringify({ status: receipt.status, mode, receipt: receiptPath }));
} catch (error) {
  // Do not emit subprocess output, SQL rows, archive filenames, private media or credentials.
  const safeError = error instanceof Error && error.code === "ERR_ASSERTION" ? error.message
    : "Unexpected local tool failure; private filesystem/database details omitted";
  const failure = { ...receipt, status: "FAILED", stage, error: safeError };
  if (out) writeJson("failure.json", failure);
  console.error(JSON.stringify({ status: "FAILED", stage, error: failure.error, evidenceDirectory: out }));
  process.exitCode = 1;
}
