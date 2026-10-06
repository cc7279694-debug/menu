// Non-destructive brand smoke on the existing, explicitly owned test AVD only.
// No fixture creation, SQL mutation, key read, connectivity change or AI request.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { device, delay, packageName } from './android-webview.mjs';

const args = process.argv.slice(2);
assert(args.length === 3 || (args.length === 4 && args[3] === '--resume-after-system-anr'));
const [adbPath, serial, apk] = args;
const resume = args[3] === '--resume-after-system-anr';
assert(adbPath && isAbsolute(adbPath) && existsSync(adbPath));
assert.equal(serial, 'emulator-5580');
assert(apk && isAbsolute(apk) && existsSync(apk));
const d = device(adbPath, serial);
assert.equal(d.adb('emu', 'avd', 'name').split(/[\r\n]+/)[0], 'Recipio_Backup_36');
assert.equal(d.adb('shell', 'getprop', 'sys.boot_completed'), '1');
const out = resolve('artifacts/logo-integration');
mkdirSync(out, { recursive: true });
const evidenceName = resume ? 'android-smoke-after-system-anr.json' : 'android-smoke.json';
assert(!existsSync(resolve(out, evidenceName)), 'Preserve previous successful smoke evidence; do not overwrite');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const apkHash = hash(readFileSync(apk));
const iconHash = hash(readFileSync(resolve('native/public/icon.png')));
const aapt = resolve(dirname(adbPath), '../build-tools/36.0.0/aapt2.exe');
const badging = spawnSync(aapt, ['dump', 'badging', apk], { encoding: 'utf8', timeout: 30000 });
assert.equal(badging.status, 0);
assert(badging.stdout.includes("package: name='app.recipio.local' versionCode='19' versionName='0.9.1-logo-refresh'"));
const tables = ['recipes', 'recipe_ingredients', 'recipe_steps', 'recipe_preparations', 'recipe_key_tips', 'recipe_changes', 'cooking_records', 'backup_restore_state'];
const query = (statement) => d.evaluate(`window.Capacitor.Plugins.CapacitorSQLite.query(${JSON.stringify({ database: 'recipio', statement, values: [] })}).then(r=>r.values)`);
const checks = [];
const pass = (name) => { checks.push(name); console.log('PASS: ' + name); };
const version = () => Number(/\bversionCode=(\d+)\b/.exec(d.adb('shell', 'dumpsys', 'package', packageName))?.[1]);
function installedHash() {
  const lines = d.adb('shell', 'pm', 'path', packageName).split(/[\r\n]+/).filter(Boolean);
  assert.equal(lines.length, 1, 'Expected one installed base APK');
  const installed = lines[0].replace(/^package:/, '');
  assert(/^\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/.test(installed));
  return d.adb('shell', 'sha256sum', installed).split(/\s/)[0];
}
async function snapshot() {
  const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await query(`SELECT * FROM ${table} ORDER BY rowid`)])));
  const paths = new Set();
  const collect = (path) => {
    if (path == null) return;
    assert(typeof path === 'string' && /^images\/(?:[a-f0-9-]+|generation-[a-f0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(path), 'Unsafe media path');
    paths.add(path);
  };
  rows.recipes.forEach((r) => collect(r.cover_path));
  rows.recipe_steps.forEach((r) => collect(r.image_path));
  rows.cooking_records.forEach((r) => collect(r.finished_photo_path));
  for (const r of rows.recipe_changes) {
    for (const json of [r.before_json, r.after_json]) {
      const details = JSON.parse(json);
      collect(details.coverPath);
      details.steps.forEach((s) => collect(s.imagePath));
    }
  }
  // Include retained old images, not just current references. Do not delete any.
  const retained = d.adb('shell', 'run-as', packageName, 'find', 'files/images', '-type', 'f');
  for (const file of retained.split(/[\r\n]+/).filter(Boolean)) {
    assert(file.startsWith('files/images/'), 'Unexpected retained image path');
    collect(file.slice('files/'.length));
  }
  const images = {};
  for (const path of [...paths].sort()) {
    const reply = d.adb('shell', 'run-as', packageName, 'sha256sum', 'files/' + path);
    const value = /^([a-f0-9]{64})\s/.exec(reply)?.[1];
    assert(value, 'Media hash missing');
    images[path] = value;
  }
  return { rowHash: hash(JSON.stringify(rows)), imageHash: hash(JSON.stringify(images)), tableCount: tables.length, recipeCount: rows.recipes.length, imageCount: paths.size };
}
async function integrity() {
  assert.equal((await query('PRAGMA user_version'))[0].user_version, 4);
  assert.equal((await query('PRAGMA integrity_check'))[0].integrity_check, 'ok');
  assert.equal((await query('PRAGMA foreign_key_check')).length, 0);
  const names = (await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'android_metadata' ORDER BY name")).map(row => row.name);
  assert.deepEqual(names, [...tables].sort(), 'Business schema changed unexpectedly');
}
let result;
try {
  let before;
  if (resume) {
    // Resume an already verified install-r, never reinstall or downgrade.
    // The older immutable RC2 private snapshot was proven unchanged on actual
    // v18; use it as an independent reference, not a snapshot of current v19.
    const failed = JSON.parse(readFileSync(resolve(out, 'android-smoke-failure.json'), 'utf8'));
    assert.equal(failed.apkSha256, apkHash);
    assert(failed.checks.includes('v18 to v19 install-r; installed APK bytes match delivered artifact'));
    const priorRoot = resolve('artifacts/find-recipe-rc2/final-v18-offline-after-fixture');
    const priorEvidence = JSON.parse(readFileSync(resolve(priorRoot, 'offline-evidence.json'), 'utf8'));
    const prior = JSON.parse(readFileSync(resolve(priorRoot, 'installed-preservation-baseline.json'), 'utf8'));
    assert.equal(priorEvidence.failure, null);
    assert.equal(priorEvidence.targetVersionCode, 18);
    assert.equal(priorEvidence.apk.sha256, '701e58e61f2e6b58f0185dc59fb4222bc8b13605f96b0e89f527302bfd1fcec6');
    assert.equal(prior.targetVersionCode, 18);
    assert.deepEqual(Object.keys(prior.snapshot.rows), tables);
    assert.equal(version(), 19);
    assert.equal(installedHash(), apkHash);
    before = { rowHash: hash(JSON.stringify(prior.snapshot.rows)), imageHash: hash(JSON.stringify(prior.snapshot.images)), tableCount: tables.length, recipeCount: prior.snapshot.rows.recipes.length, imageCount: Object.keys(prior.snapshot.images).length };
    pass('resume after observed SystemUI ANR; installed v19 unchanged, independent already-proven RC2 preservation reference loaded privately');
  } else {
  assert.equal(version(), 18, 'Capture preservation proof from the existing v18 first; never uninstall or clear');
  assert(/\bversionName=0\.9\.0-find-recipe-rc2\b/.test(d.adb('shell', 'dumpsys', 'package', packageName)), 'Expected the frozen RC2 version name');
  assert.equal(installedHash(), '701e58e61f2e6b58f0185dc59fb4222bc8b13605f96b0e89f527302bfd1fcec6', 'Actual installed baseline must equal the immutable accepted v18; no baseline install or downgrade');
  await d.coldStart();
  await integrity();
  before = await snapshot();
  assert(before.recipeCount > 0, 'Existing test recipes required; do not seed or overwrite data');
  writeFileSync(resolve(out, 'baseline-summary.json'), JSON.stringify(before, null, 2) + '\n', { flag: 'wx' });
  pass('v18 existing eight-table / image baseline captured in memory');
  d.close();
  d.adb('shell', 'am', 'force-stop', packageName);
  assert(d.adb('install', '-r', apk).includes('Success'));
  assert.equal(version(), 19);
  assert.equal(installedHash(), apkHash);
  pass('v18 to v19 install-r; installed APK bytes match delivered artifact');
  }
  await d.coldStart();
  await integrity();
  const after = await snapshot();
  assert.deepEqual(after, before, 'Rows / IDs / times / order or image bytes changed');
  pass('all eight-table rows and referenced images preserved; SQLite4 and integrity valid');
  await d.click('首页');
  await d.wait("!!document.querySelector('header img') && document.querySelector('header img').complete");
  const header = await d.evaluate("(()=>{const i=document.querySelector('header img');const r=i.getBoundingClientRect();return {src:i.getAttribute('src'),width:r.width,height:r.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight}})()");
  assert.deepEqual(header, { src: './icon.png', width: 40, height: 40, naturalWidth: 192, naturalHeight: 192 });
  const loadedHash = await d.evaluate("fetch('./icon.png').then(r=>r.arrayBuffer()).then(b=>crypto.subtle.digest('SHA-256',b)).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join(''))");
  assert.equal(loadedHash, iconHash);
  await d.screenshot(resolve(out, 'home.png'));
  pass('cold startup / home / unchanged 40px header loads new exact icon');
  const fixture = await query("SELECT title FROM recipes WHERE deleted_at IS NULL AND title LIKE 'APK5C GENERATED%' ORDER BY rowid LIMIT 1");
  assert.equal(fixture.length, 1, 'Existing generated acceptance recipe required');
  await d.click('打开 ' + fixture[0].title);
  await d.wait("document.body.innerText.includes('编辑菜谱')");
  await d.screenshot(resolve(out, 'existing-recipe.png'));
  assert.deepEqual(await snapshot(), before);
  pass('existing generated local recipe opens without altering data');
  d.adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
  const displayReply = d.adb('shell', 'wm', 'size');
  const display = /Override size: (\d+)x(\d+)/.exec(displayReply) ?? /Physical size: (\d+)x(\d+)/.exec(displayReply);
  assert(display);
  const width = Number(display[1]), height = Number(display[2]);
  await delay(800);
  d.adb('shell', 'input', 'swipe', String(Math.round(width / 2)), String(Math.round(height * 0.85)), String(Math.round(width / 2)), String(Math.round(height * 0.2)), '400');
  await delay(1000);
  // API36 dump prints a destination notice, not XML, even for /dev/tty.
  // Read the actual hierarchy instead of mistaking that notice for its nodes.
  const launcherXmlPath = '/data/local/tmp/recipio-logo-launcher.xml';
  d.adb('shell', 'uiautomator', 'dump', launcherXmlPath);
  assert(d.adb('shell', 'cat', launcherXmlPath).includes('谱序 RECIPIO'), 'Launcher must contain the app icon label');
  await d.screenshot(resolve(out, 'launcher.png'));
  d.adb('shell', 'am', 'start', '-n', packageName + '/.MainActivity');
  await delay(600);
  d.adb('shell', 'input', 'keyevent', 'KEYCODE_APP_SWITCH');
  await delay(1000);
  await d.screenshot(resolve(out, 'recents.png'));
  pass('launcher and recents screenshots captured for visual inspection');
  await d.coldStart();
  assert.deepEqual(await snapshot(), before);
  const external = d.events.filter((e) => e.method === 'Network.requestWillBeSent' && /^https?:/.test(e.params.request.url) && !/^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(e.params.request.url));
  assert.equal(external.length, 0, 'Unexpected external WebView request');
  pass('second cold startup preserves data; observed external WebView requests zero');
  result = { status: 'PASS', avd: 'Recipio_Backup_36', serial, apkSha256: apkHash, versionCode: 19, versionName: '0.9.1-logo-refresh', preservation: before, checks, physicalPhone: 'NOT_RUN', realAiCalls: 0, resumedAfterSystemAnr: resume };
} catch (error) {
  const failureBase = resume ? 'android-smoke-after-system-anr-failure' : 'android-smoke-failure';
  const failureName = existsSync(resolve(out, failureBase + '.json')) ? failureBase + '-' + Date.now() + '.json' : failureBase + '.json';
  writeFileSync(resolve(out, failureName), JSON.stringify({ status: 'FAIL', checks, avd: 'Recipio_Backup_36', serial, apkSha256: apkHash }) + '\n', { flag: 'wx' });
  throw error;
} finally {
  d.close();
}
writeFileSync(resolve(out, evidenceName), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log('Brand smoke PASS; phone/OEM acceptance still pending.');
