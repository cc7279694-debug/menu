// Native Android acceptance through the installed APK's WebView, not a desktop browser.
// Usage: node scripts/verify-apk.mjs <adb-path> <emulator-serial> [expected-title]
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
const [adbPath, serial, expectedTitle] = process.argv.slice(2);
assert(adbPath && serial, "Supply adb path and one explicit emulator serial");
assert(
  serial.startsWith("emulator-"),
  "This automatic test only changes emulator connectivity",
);
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const packageName = "app.recipio.local";
function adb(...args) {
  const r = spawnSync(adbPath, ["-s", serial, ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim();
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let socket;
let forwarded = false;
async function connect() {
  await delay(1500);
  const pid = adb("shell", "pidof", packageName).split(" ")[0];
  adb("forward", "tcp:9223", `localabstract:webview_devtools_remote_${pid}`);
  forwarded = true;
  let pages;
  for (let i = 0; i < 30; i++) {
    try {
      pages = await (await fetch("http://127.0.0.1:9223/json")).json();
      if (pages.length) break;
    } catch {}
    await delay(200);
  }
  assert(pages?.length, "Installed APK WebView is not available");
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((r, reject) => {
    socket.onopen = r;
    socket.onerror = reject;
  });
  await waitFor("!!document.body && document.readyState !== 'loading'");
}
let seq = 0;
async function evaluate(expression) {
  const id = ++seq;
  const result = await new Promise((resolveMessage, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", receive);
      reject(new Error("WebView command timeout"));
    }, 10000);
    function receive(e) {
      const m = JSON.parse(e.data);
      if (m.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener("message", receive);
      if (m.error || m.result.exceptionDetails)
        reject(new Error(JSON.stringify(m)));
      else resolveMessage(m.result.result.value);
    }
    socket.addEventListener("message", receive);
    socket.send(
      JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true, awaitPromise: true },
      }),
    );
  });
  return result;
}
async function waitFor(expression) {
  for (let i = 0; i < 60; i++) {
    if (await evaluate(expression)) return;
    await delay(150);
  }
  throw new Error(
    `Installed APK assertion timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
}
async function input(id, value) {
  await evaluate(
    `(() => { const el=document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  await delay(100);
}
async function button(text) {
  await evaluate(
    `(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!b)throw new Error('Button absent'); b.click(); })()`,
  );
  await delay(150);
}
const originalAirplane = adb(
  "shell",
  "settings",
  "get",
  "global",
  "airplane_mode_on",
);
const title = expectedTitle || `啤酒鸭 · APK-0 ${Date.now()}`;
const disposable = `删除验证-${Date.now()}`;
const evidence = {
  serial,
  packageName,
  title,
  startedAt: new Date().toISOString(),
  checks: [],
};
try {
  adb("shell", "cmd", "connectivity", "airplane-mode", "enable");
  assert.equal(
    adb("shell", "settings", "get", "global", "airplane_mode_on"),
    "1",
  );
  adb("shell", "am", "force-stop", packageName);
  adb("shell", "am", "start", "-n", `${packageName}/.MainActivity`);
  await connect();
  await waitFor("!!document.getElementById('recipe-title')");
  evidence.checks.push("flight-mode cold launch with native SQLite");
  if (!expectedTitle) {
    await input("recipe-title", "啤酒鸭");
    await button("保存菜名");
    await waitFor(
      "[...document.querySelectorAll('li button')].some(b=>b.textContent==='啤酒鸭')",
    );
    await button("啤酒鸭");
    await button("修改名称");
    await input("recipe-title", title);
    await button("保存菜名");
    await waitFor(`document.body.innerText.includes(${JSON.stringify(title)})`);
    evidence.checks.push("create name-only recipe and rename through APK UI");
    await input("recipe-search", "不存在的菜");
    await waitFor("document.body.innerText.includes('没有找到这道菜')");
    await input("recipe-search", "啤酒鸭");
    await waitFor(`document.body.innerText.includes(${JSON.stringify(title)})`);
    await evaluate(
      `document.querySelector('[aria-label='+CSS.escape(${JSON.stringify("删除 " + title)})+']').click()`,
    );
    await waitFor("document.body.innerText.includes('撤销')");
    await button("撤销");
    await waitFor(
      `!![...document.querySelectorAll('li button')].find(b=>b.textContent===${JSON.stringify(title)})`,
    );
    evidence.checks.push("search, delete and undo through APK UI");
    await input("recipe-search", "");
    await input("recipe-title", disposable);
    await button("保存菜名");
    await waitFor(
      `!![...document.querySelectorAll('li button')].find(b=>b.textContent===${JSON.stringify(disposable)})`,
    );
    await evaluate(
      `document.querySelector('[aria-label='+CSS.escape(${JSON.stringify("删除 " + disposable)})+']').click()`,
    );
    await waitFor("document.body.innerText.includes('撤销')");
    await delay(5500);
    await waitFor(
      "![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='撤销')",
    );
    evidence.checks.push("5-second delete window expires");
  } else {
    await waitFor(`document.body.innerText.includes(${JSON.stringify(title)})`);
    evidence.checks.push("recipe retained after APK overwrite upgrade");
  }
  const viewport = await evaluate(
    "({width:innerWidth,documentWidth:document.documentElement.scrollWidth,height:innerHeight,url:location.href})",
  );
  assert(
    viewport.documentWidth <= viewport.width,
    "Horizontal overflow on emulator viewport",
  );
  assert(
    viewport.url.startsWith("https://localhost"),
    "APK is not using bundled local resources",
  );
  evidence.viewport = viewport;
  socket.close();
  adb("shell", "am", "force-stop", packageName);
  adb("shell", "am", "start", "-n", `${packageName}/.MainActivity`);
  await connect();
  await waitFor(`document.body.innerText.includes(${JSON.stringify(title)})`);
  evidence.checks.push("force-stop and reopen persistence in flight mode");
  evidence.package = adb("shell", "dumpsys", "package", packageName)
    .split("\n")
    .filter((l) =>
      /versionCode|versionName|ALLOW_BACKUP|android.permission.INTERNET/.test(
        l,
      ),
    )
    .join("\n");
  const shot = spawnSync(
    adbPath,
    ["-s", serial, "exec-out", "screencap", "-p"],
    { timeout: 30000 },
  );
  assert.equal(shot.status, 0);
  writeFileSync(
    resolve(out, expectedTitle ? "apk0-upgrade.png" : "apk0-offline.png"),
    shot.stdout,
  );
  socket.close();
  adb("shell", "am", "force-stop", packageName);
  const snapshot = spawnSync(
    adbPath,
    [
      "-s",
      serial,
      "exec-out",
      "run-as",
      packageName,
      "cat",
      "databases/recipioSQLite.db",
    ],
    { timeout: 30000 },
  );
  assert.equal(snapshot.status, 0, snapshot.stderr.toString());
  const dbPath = resolve(out, "native-sqlite-evidence.db");
  writeFileSync(dbPath, snapshot.stdout);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    assert.equal(
      db.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.equal(db.prepare("PRAGMA user_version").get().user_version, 1);
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM recipes WHERE title=? AND deleted_at IS NULL",
        )
        .get(title).n,
      1,
    );
    assert.equal(
      db
        .prepare("SELECT count(*) AS n FROM recipes WHERE title=?")
        .get(disposable).n,
      0,
    );
    evidence.checks.push(
      "actual Android SQLite file: integrity ok, schema v1, saved row retained, expired deletion removed",
    );
  } finally {
    db.close();
  }
  adb("shell", "am", "start", "-n", `${packageName}/.MainActivity`);
  evidence.completedAt = new Date().toISOString();
  writeFileSync(
    resolve(out, expectedTitle ? "apk0-upgrade.json" : "apk0-device.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  socket?.close();
  if (forwarded) adb("forward", "--remove", "tcp:9223");
  adb(
    "shell",
    "cmd",
    "connectivity",
    "airplane-mode",
    originalAirplane === "1" ? "enable" : "disable",
  );
}
