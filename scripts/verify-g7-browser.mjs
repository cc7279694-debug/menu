// Actual LibraryApp + real Preview DB. Only external I/O and browser media
// conversion are synthetic. Native URI loading and IME/Back have a separate job.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

assert(process.env.GITHUB_ACTIONS === "true" && process.env.RUNNER_ENVIRONMENT === "github-hosted"
  && process.env.RUNNER_OS === "Linux" && process.platform === "linux", "Fresh GitHub-hosted Linux only");
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:5190/", port = 5190;
const runtime = process.argv.find(argument => argument.startsWith("--runtime="))?.slice(10);
assert(runtime && path.isAbsolute(runtime), "Isolated --runtime node_modules required");
const qaRequire = createRequire(path.join(runtime, "g7-qa.cjs"));
assert(qaRequire.resolve("playwright/package.json").startsWith(path.resolve(runtime) + path.sep), "No global Playwright fallback");
assert.equal(qaRequire("playwright/package.json").version, "1.62.1");
const { chromium } = qaRequire("playwright");
const out = path.join(root, "output/playwright/g7/cloud"), shots = path.join(out, "screenshots");
await mkdir(path.dirname(out), { recursive: true }); await mkdir(out); await mkdir(shots);
const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(git.status, 0); assert.match(git.stdout.trim(), /^[0-9a-f]{40}$/);
const result = { status: "RUNNING", source: git.stdout.trim(), browser: null, checks: [], screenshots: [], geometry: [], formDiagnostics: [], backDiagnostics: [],
  externalOrigins: [], pageErrors: [], consoleErrors: [],
  scope: "Real LibraryApp, AiIntakeService, LinkImportService, FindRecipeService and PreviewRecipeLibrary/IndexedDB; Fake Provider/HTTP, generated images only. Browser media adapter maps exact owned native-format URI metadata to a generated blob; native path loading is verified separately.",
  zeroWriteScope: "IDB/Storage API entries and all actual Preview DB rows during G7 edit/source windows; fixture setup, source selection and explicit save are separate windows.",
  notRun: ["real Provider/AI", "Android system IME/Back (separate native job)", "Android system font scaling", "TalkBack", "physical device", "personal data", "signed upgrade"],
};
let server, browser, activePage;
const persist = () => writeFile(path.join(out, "results.json"), JSON.stringify(result, null, 2));
const moduleBase = `/@fs/${root.replaceAll("\\", "/").replace(/\/$/, "")}/`;
const click = (scope, name) => scope.getByRole("button", { name, exact: true }).click();
const report = page => page.getByRole("region", { name: "当前草稿检查", exact: true });
const gate = page => page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true });
const sourcePanel = page => page.getByRole("dialog", { name: "本轮来源", exact: true });
const notes = page => page.getByRole("textbox", { name: "个人备注", exact: true });
async function check(name, action) {
  await action(); result.checks.push({ name, status: "PASS" }); console.log(`PASS G7/${name}`); await persist();
}
async function startServer() {
  await new Promise((resolve, reject) => { const probe = createServer(); probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(error => error ? reject(error) : resolve())); });
  server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--config", "vite.native.config.mts",
    "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } });
  let log = "", spawnError;
  for (const stream of [server.stdout, server.stderr]) stream.on("data", value => { log = (log + value).slice(-12000); });
  server.once("error", error => { spawnError = error; });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    assert(server.exitCode === null && server.signalCode === null, `Owned Vite exited: ${log.slice(-1600)}`);
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.text()).includes("谱序")) return;
    } catch { /* Bounded owned-server readiness polling. */ }
    await delay(100);
  }
  throw new Error(`Owned Vite readiness timeout: ${log.slice(-1600)}`);
}
async function stopServer() {
  const owned = server; server = null;
  if (!owned || owned.exitCode !== null || owned.signalCode !== null) return;
  const stopped = new Promise(resolve => owned.once("close", resolve));
  try { process.kill(-owned.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  if (!await Promise.race([stopped.then(() => true), delay(8000).then(() => false)])) {
    try { process.kill(-owned.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    await stopped;
  }
}
async function open(theme = "warm-ivory", options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN", timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce", serviceWorkers: "block", deviceScaleFactor: 1 });
  await context.addInitScript(theme => {
    localStorage.setItem("recipio.ui-v2.theme.v1", theme);
    const backListeners = { capture: new Set(), bubble: new Set() };
    const captureOption = options => typeof options === "boolean" ? options : !!options?.capture;
    const originalAddListener = window.addEventListener, originalRemoveListener = window.removeEventListener;
    // Delegate the original listener unchanged. Set membership mirrors the DOM's
    // callback + capture identity; no wrapping, dispatching or order adjustment.
    window.addEventListener = function (...args) {
      const returned = originalAddListener.apply(this, args);
      if (this === window && args[0] === "recipio:back" && args[1] != null)
        backListeners[captureOption(args[2]) ? "capture" : "bubble"].add(args[1]);
      return returned;
    };
    window.removeEventListener = function (...args) {
      const returned = originalRemoveListener.apply(this, args);
      if (this === window && args[0] === "recipio:back" && args[1] != null)
        backListeners[captureOption(args[2]) ? "capture" : "bubble"].delete(args[1]);
      return returned;
    };
    window.__g7BackState = () => ({
      capture: backListeners.capture.size, bubble: backListeners.bubble.size,
      sourceVisible: [...document.querySelectorAll('[role="dialog"]')].some(dialog => {
        const name = dialog.getAttribute("aria-label") ?? (dialog.getAttribute("aria-labelledby") ?? "")
          .split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent ?? "").join(" ");
        return name.trim() === "本轮来源" && !!dialog.getClientRects().length && getComputedStyle(dialog).visibility !== "hidden"
          && !dialog.closest('[hidden],[inert],[aria-hidden="true"]');
      }),
    });
    window.__g7Writes = { enabled: false, entries: [] };
    for (const [prototype, methods] of [[IDBObjectStore.prototype, ["add", "put", "delete", "clear"]], [Storage.prototype, ["setItem", "removeItem", "clear"]]]) {
      for (const method of methods) { const original = prototype[method]; prototype[method] = function (...args) {
        if (window.__g7Writes.enabled) window.__g7Writes.entries.push({ kind: this instanceof Storage ? "Storage" : "IDBObjectStore", method });
        return original.apply(this, args);
      }; }
    }
  }, theme);
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== new URL(base).origin) {
      result.externalOrigins.push(url.origin); return route.abort();
    }
    return route.continue();
  });
  await context.routeWebSocket("**/*", socket => {
    const url = new URL(socket.url());
    if (url.hostname !== "127.0.0.1" || url.port !== String(port)) { result.externalOrigins.push(url.origin); socket.close(); }
    else socket.connectToServer();
  });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
  page.on("pageerror", error => result.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text().slice(0, 1000)); });
  page.on("dialog", dialog => dialog.dismiss());
  await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  assert.equal(await page.locator("#root .v2-production").count(), 1, "Real application booted before external-port fixture");
  await page.evaluate(async ({ source, options }) => {
    const original = document.getElementById("root"); original.hidden = true; original.id = "qa-original-root";
    const target = document.createElement("div"); target.id = "root"; document.body.append(target);
    const { renderG7Fixture } = await import(source + "scripts/fixtures/g7-intake.tsx");
    window.__g7Fixture = await renderG7Fixture(target, options);
  }, { source: moduleBase, options });
  await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  return { page, context };
}
async function snapshot(page) {
  return page.evaluate(async source => {
    const { getLocalDatabase } = await import(source + "src/features/offline/local-db.ts");
    const db = await getLocalDatabase(), rows = {};
    for (const table of db.tables) rows[table.name] = await table.toArray();
    return rows;
  }, moduleBase);
}
async function watch(page, enabled) {
  return page.evaluate(enabled => { if (enabled) window.__g7Writes.entries = [];
    window.__g7Writes.enabled = enabled; return window.__g7Writes.entries; }, enabled);
}
async function unchanged(page, before) {
  assert.deepEqual(await watch(page, false), [], "G7 editing/viewing invokes no IDB/Storage write entry");
  assert.deepEqual(await snapshot(page), before, "All real Preview DB rows remain unchanged");
}
async function formDiagnostic(page, stage) {
  // Only generated business-form fields; never source text, source HTML or body.
  const fields = await page.locator("#root form label").evaluateAll(labels => labels.flatMap(label =>
    [...label.querySelectorAll("input,textarea")].map(control => ({
      label: label.querySelector("span")?.textContent ?? "", labelText: label.textContent,
      tag: control.tagName, name: control.getAttribute("name"), ariaLabel: control.getAttribute("aria-label"),
      value: control.value, textContent: control.tagName === "TEXTAREA" ? control.textContent : null,
    }))));
  result.formDiagnostics.push({ stage, fields, notesExactLabelCount: await page.getByLabel("个人备注", { exact: true }).count(),
    notesExactTextboxCount: await notes(page).count() });
  await persist();
}
async function dispatchObservedBack(page, stage) {
  const diagnostic = await page.evaluate(() => {
    const event = new Event("recipio:back", { cancelable: true });
    const before = { ...window.__g7BackState(), defaultPrevented: event.defaultPrevented };
    const dispatchReturned = window.dispatchEvent(event);
    const after = { ...window.__g7BackState(), defaultPrevented: event.defaultPrevented };
    return { before, after, dispatchReturned };
  });
  result.backDiagnostics.push({ stage, ...diagnostic }); await persist();
}
async function recordBackState(page, stage) {
  result.backDiagnostics.push({ stage, ...await page.evaluate(() => window.__g7BackState()) }); await persist();
}
async function painted(page) {
  await page.evaluate(async () => { await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, theme) {
  await painted(page); await page.screenshot({ path: path.join(shots, `${name}.png`) });
  result.screenshots.push({ file: `screenshots/${name}.png`, source: result.source, theme, viewport: page.viewportSize(),
    externalCapability: "FAKE_PROVIDER_HTTP_AND_GENERATED_BROWSER_MEDIA", cssRootFont: await page.evaluate(() => getComputedStyle(document.documentElement).fontSize) });
}
async function reachable(locator, name) {
  await locator.scrollIntoViewIfNeeded();
  assert(await locator.evaluate(element => { const box = element.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    return x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight && element.contains(document.elementFromPoint(x, y)); }), `${name} remains reachable`);
}
async function layout(page, name) {
  await painted(page);
  const geometry = await page.evaluate(() => {
    const visible = element => !!element.getClientRects().length && !element.closest('[hidden],[inert],[aria-hidden="true"]') && getComputedStyle(element).visibility !== "hidden";
    const candidates = [...document.querySelectorAll('#root form,[role="region"],[role="dialog"],.v2-sheet-body')].filter(visible);
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      overflow: candidates.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ role: element.getAttribute("role"), width: element.clientWidth, scrollWidth: element.scrollWidth })) };
  });
  result.geometry.push({ name, ...geometry });
  assert(geometry.scrollWidth <= geometry.width + 1, `${name}: no page horizontal overflow`);
  assert.deepEqual(geometry.overflow, [], `${name}: no new region/form/sheet horizontal overflow`);
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
}
async function aiPreview(page, withImage = false, longSource = false) {
  await click(page, "新增菜谱"); await click(page, "AI 整理");
  await page.getByLabel("菜谱文字", { exact: true }).fill("G7 合成清汤。酱汁20毫升，另有酱汁适量。先焯水，再收汁。" + (longSource ? "\n合成来源长文字，用于手机换行和来源滚动检查😊。".repeat(18) : ""));
  if (withImage) await click(page, "添加截图");
  await click(page, "开始 AI 整理"); await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor();
  await report(page).waitFor();
}
async function openSource(page) { await click(page, "查看本轮来源"); await sourcePanel(page).waitFor(); return sourcePanel(page); }
async function closeSource(page) { await click(sourcePanel(page), "关闭本轮来源"); await sourcePanel(page).waitFor({ state: "hidden" }); }
async function mainFlows() {
  const { page, context } = await open("warm-ivory", { duplicateTitle: "G7 人工最终菜名" });
  try {
    await aiPreview(page, true); const before = await snapshot(page); await watch(page, true);
    await check("T02-T06 current edits and source toggling preserve one draft without writes", async () => {
      assert.match(await report(page).innerText(), /食材 2 项.*步骤 2 步.*原始份量未填写/s);
      await report(page).scrollIntoViewIfNeeded(); await capture(page, "warm-initial-review-390", "warm-ivory");
      await page.getByLabel("约几人份", { exact: true }).fill("3"); await page.getByLabel("用量 2", { exact: true }).fill("适量");
      await page.getByLabel("菜名", { exact: true }).fill("G7 人工最终菜名");
      await notes(page).fill("用户修改后的合成备注😊");
      await formDiagnostic(page, "main-edited-before-source");
      assert.equal(await notes(page).inputValue(), "用户修改后的合成备注😊");
      assert.match(await report(page).innerText(), /原始 3 人份/); await gate(page).check();
      await report(page).scrollIntoViewIfNeeded(); await capture(page, "warm-updated-review-390", "warm-ivory");
      const panel = await openSource(page); const image = panel.getByRole("img", { name: "本轮截图 1", exact: true });
      await image.scrollIntoViewIfNeeded(); await image.evaluate(image => image.decode());
      assert(await image.evaluate(image => image.complete && image.naturalWidth === 480));
      await capture(page, "warm-text-and-generated-screenshot-source-390", "warm-ivory"); await closeSource(page);
      assert.equal(await page.getByLabel("菜名", { exact: true }).inputValue(), "G7 人工最终菜名");
      await formDiagnostic(page, "main-after-source-closed");
      assert.equal(await notes(page).inputValue(), "用户修改后的合成备注😊"); assert(await gate(page).isChecked());
      await openSource(page); await dispatchObservedBack(page, "main-source-reopened-dispatch");
      try { await sourcePanel(page).waitFor({ state: "hidden" }); }
      finally { await recordBackState(page, "main-source-after-close-wait"); }
      assert(await gate(page).isChecked());
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.ai), 1); await unchanged(page, before);
    });
    await check("T09 real changes revoke acknowledgement; focus and source access do not", async () => {
      await page.getByLabel("用量 1", { exact: true }).focus(); assert(await gate(page).isChecked());
      await page.getByLabel("用量 1", { exact: true }).fill("15 毫升"); assert(!(await gate(page).isChecked()));
      assert(await page.getByRole("button", { name: "确认保存菜谱", exact: true }).isDisabled()); await gate(page).check();
    });
    await check("T10 failed exact-title lookup and return-to-check keep all data unsaved", async () => {
      await page.evaluate(() => window.__g7Fixture.failNextTitleQuery()); await watch(page, true);
      await click(page, "确认保存菜谱"); await page.getByRole("alert").filter({ hasText: "同名检查未完成" }).waitFor();
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.create), 0); await unchanged(page, before);
      await click(page, "确认保存菜谱"); const duplicate = page.getByRole("dialog", { name: "已存在同名菜谱", exact: true }); await duplicate.waitFor();
      await dispatchObservedBack(page, "main-duplicate-dispatch");
      try { await duplicate.waitFor({ state: "hidden" }); }
      finally { await recordBackState(page, "main-duplicate-after-close-wait"); }
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.create), 0); assert.deepEqual(await snapshot(page), before);
      assert.equal(await page.getByLabel("菜名", { exact: true }).inputValue(), "G7 人工最终菜名");
      assert.equal(await notes(page).inputValue(), "用户修改后的合成备注😊");
      assert.equal(await page.getByLabel("用量 1", { exact: true }).inputValue(), "15 毫升"); assert(await gate(page).isChecked());
      await click(page, "确认保存菜谱"); await duplicate.waitFor();
      await capture(page, "warm-duplicate-return-review-390", "warm-ivory"); await click(duplicate, "返回检查"); await duplicate.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.create), 0); assert.deepEqual(await snapshot(page), before);
      assert.equal(await page.getByLabel("用量 1", { exact: true }).inputValue(), "15 毫升");
    });
    await check("T10/T12/T14 explicit duplicate acceptance saves one ordinary local recipe and keeps the original", async () => {
      await click(page, "确认保存菜谱"); const duplicate = page.getByRole("dialog", { name: "已存在同名菜谱", exact: true }); await duplicate.waitFor();
      await duplicate.getByRole("button", { name: "仍然新建菜谱", exact: true }).evaluate(button => { button.click(); button.click(); });
      await page.getByRole("heading", { name: "G7 人工最终菜名", exact: true }).waitFor();
      const recipes = await page.evaluate(() => window.__g7Fixture.recipes()); assert.equal(recipes.length, 2);
      const saved = recipes.find(recipe => recipe.notes === "用户修改后的合成备注😊"), old = recipes.find(recipe => recipe.notes === "Existing synthetic recipe must remain unchanged");
      assert(saved && old); assert.equal(saved.servings, 3); assert.equal(saved.ingredients[0].amount, "15 毫升");
      assert.equal(saved.coverPath, null); assert(saved.steps.every(step => step.imagePath === null));
      assert(!/rowKey|originalRecipe|fieldBindings|fieldChecks|sourceText|previewUri|qualityReport|Provider/.test(JSON.stringify(saved)));
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.create), 1);
      assert((await page.evaluate(() => window.__g7Fixture.calls.titleChecks)).every(title => title === "G7 人工最终菜名"));
      assert.equal(await page.getByLabel("本次做几人份", { exact: true }).inputValue(), "3");
      assert.equal(await page.getByRole("button", { name: "查看本轮来源", exact: true }).count(), 0);
    });
  } catch (error) { await capture(page, "main-failure-diagnostic", "warm-ivory").catch(() => {}); throw error; }
  finally { await context.close(); }
}
async function sourceCapabilities() {
  for (const mode of ["parser", "web-ai", "finder"]) {
    const { page, context } = await open();
    try {
      await check(`T07 ${mode} source shows only session-owned information without extra I/O`, async () => {
        await click(page, "新增菜谱");
        if (mode === "finder") {
          await click(page, "帮我找做法"); await page.getByLabel("想做什么菜", { exact: true }).fill("G7 合成清汤"); await click(page, "开始寻找");
          await page.getByRole("heading", { name: "找到 2 个做法，请选择", exact: true }).waitFor();
          await page.getByRole("button", { name: "按这个做法整理", exact: true }).first().click();
          await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor();
        } else {
          await click(page, "从网页链接导入"); await page.getByLabel("网页链接", { exact: true }).fill("https://example.com/g7-generated"); await click(page, "读取网页");
          await page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor();
          if (mode === "web-ai") { await click(page, "取消"); await click(page, "使用 AI 继续整理"); await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor(); }
        }
        const before = await snapshot(page), calls = await page.evaluate(() => structuredClone(window.__g7Fixture.calls)); await watch(page, true);
        const panel = await openSource(page);
        if (mode === "finder") {
          assert.match(await panel.innerText(), /本轮未保留来源正文/); assert.match(await panel.innerText(), /非完整正文/);
          assert.match(await panel.innerText(), /候选摘要不是原文逐字引述/); assert.match(await panel.innerText(), /example.com/);
          await capture(page, "warm-finder-without-fulltext-390", "warm-ivory");
          assert(!("sourceText" in (await page.evaluate(() => window.__g7Fixture.snapshot().finder))));
        } else {
          assert.match(await panel.innerText(), /清洗后的网页文字.*并非完整原网页/s);
          if (mode === "web-ai") assert.match(await panel.innerText(), /网页文字与 AI 整理结果是不同内容/);
          await capture(page, `warm-${mode}-source-390`, "warm-ivory");
        }
        await closeSource(page); await unchanged(page, before);
        assert.deepEqual(await page.evaluate(() => window.__g7Fixture.calls), calls);
      });
    } finally { await context.close(); }
  }
}
async function uncertain() {
  const { page, context } = await open();
  try { await aiPreview(page); await page.getByLabel("约几人份", { exact: true }).fill("3"); await gate(page).check();
    await check("T11 uncertain recovery reconciles the original ID and never creates twice", async () => {
      await page.evaluate(() => window.__g7Fixture.armUncertain()); await click(page, "确认保存菜谱");
      await page.getByRole("heading", { name: "先核对保存结果", exact: true }).waitFor();
      const originalId = await page.evaluate(() => window.__g7Fixture.calls.createdIds[0]); assert.match(originalId, /^[0-9a-f-]{36}$/);
      assert.equal(await page.getByRole("button", { name: "查看本轮来源", exact: true }).count(), 0);
      await click(page, "核对保存结果"); await page.getByRole("heading", { name: "G7 合成清汤", exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__g7Fixture.calls.create), 1);
      const recipes = await page.evaluate(() => window.__g7Fixture.recipes()); assert.equal(recipes.length, 1); assert.equal(recipes[0].id, originalId);
      assert.equal(await page.getByLabel("本次做几人份", { exact: true }).inputValue(), "3");
    });
  } finally { await context.close(); }
}
async function visuals(theme) {
  const { page, context } = await open(theme);
  try {
    await aiPreview(page, true, true); const before = await snapshot(page); await watch(page, true);
    await notes(page).fill("长中文与Emoji合成备注😊".repeat(35));
    for (const width of [320, 390, 412]) for (const large of [false, true]) {
      await page.setViewportSize({ width, height: 844 }); await page.evaluate(large => { document.documentElement.style.fontSize = large ? "32px" : "16px"; }, large);
      await check(`T15/T16 ${theme}-${width}-CSS${large ? 200 : 100}`, async () => {
        await layout(page, `${theme}-${width}-review`); await reachable(page.getByRole("button", { name: "确认保存菜谱", exact: true }), "save");
        await report(page).scrollIntoViewIfNeeded();
        if (width === 390 && !large) await capture(page, `${theme}-review-390`, theme);
        const panel = await openSource(page); await layout(page, `${theme}-${width}-source`);
        await reachable(panel.getByRole("button", { name: "关闭本轮来源", exact: true }), "source close");
        if ((width === 320 && large) || (width === 390 && !large)) await capture(page, `${theme}-source-${width}-CSS${large ? 200 : 100}`, theme);
        await closeSource(page);
      });
    }
    await check(`T16 ${theme} existing solid fallback and reduced-motion remain usable`, async () => {
      await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; document.querySelectorAll(".recipio-ui-v2").forEach(element => element.setAttribute("data-v2-solid", "true")); });
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));
      const panel = await openSource(page); await page.evaluate(() => document.querySelectorAll(".v2-portal").forEach(element => element.setAttribute("data-v2-solid", "true")));
      const material = await panel.evaluate(element => ({ filter: getComputedStyle(element).backdropFilter, background: getComputedStyle(element).backgroundColor,
        theme: element.closest("[data-v2-theme]")?.getAttribute("data-v2-theme"), solid: element.closest("[data-v2-solid]")?.getAttribute("data-v2-solid") }));
      assert.equal(material.theme, theme); assert.equal(material.solid, "true"); assert.equal(material.filter, "none"); assert.match(material.background, /^rgb\(/);
      await layout(page, `${theme}-solid-source`); await closeSource(page); await unchanged(page, before);
    });
  } catch (error) { await capture(page, `${theme}-failure-diagnostic`, theme).catch(() => {}); throw error; }
  finally { await context.close(); }
}
try {
  await persist(); await startServer(); browser = await chromium.launch({ headless: true }); result.browser = browser.version();
  await mainFlows(); await sourceCapabilities(); await uncertain();
  for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) await visuals(theme);
  assert.deepEqual(result.externalOrigins, [], "No unexpected external origins"); assert.deepEqual(result.pageErrors, [], "No page errors"); assert.deepEqual(result.consoleErrors, [], "No console errors");
  result.status = "PASS"; result.passed = result.checks.length;
  console.log(`G7_BROWSER_PASS ${result.passed} checks; ${result.screenshots.length} actual screenshots; external origins0`);
} catch (error) {
  result.status = "FAIL"; result.error = error.stack ?? String(error);
  if (activePage && !activePage.isClosed()) await capture(activePage, "failure-diagnostic", "failure").catch(() => {});
  throw error;
} finally { await persist(); if (browser) await browser.close(); await stopServer(); }
