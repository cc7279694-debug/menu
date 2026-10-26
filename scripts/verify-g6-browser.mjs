// G6 cloud-only QA plan: literal 3 -> 2 amounts 400克/220毫升/约1.33个,
// original ambiguous text; real LibraryApp/Preview DB; no mocked persistence.
// Adjustment windows require zero IDB/Storage writes and identical actual data.
// Edit/save and explicit completion are separate, intentional write windows.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as pollDelay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

assert(process.env.GITHUB_ACTIONS === "true" && process.env.RUNNER_ENVIRONMENT === "github-hosted"
  && process.env.RUNNER_OS === "Linux" && process.platform === "linux", "GitHub-hosted Linux only; no local profile");
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:5188/";
const runtime = process.argv.find(arg => arg.startsWith("--runtime="))?.slice(10);
assert(runtime && path.isAbsolute(runtime), "--runtime must name isolated QA node_modules");
const qaRequire = createRequire(path.join(runtime, "g6-qa.cjs"));
assert(qaRequire.resolve("playwright/package.json").startsWith(path.resolve(runtime) + path.sep), "No global/production Playwright fallback");
assert.equal(qaRequire("playwright/package.json").version, "1.62.1", "Pinned QA Playwright required");
const { chromium } = qaRequire("playwright");
const out = path.join(root, "output/playwright/g6/cloud"), shots = path.join(out, "screenshots");
await mkdir(path.dirname(out), { recursive: true });
await mkdir(out); // An evidence run must never replace another run.
await mkdir(shots);
const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(revision.status, 0, "Read actual source revision");
const result = {
  status: "RUNNING", source: revision.stdout.trim(), browser: null,
  checks: [], screenshots: [], geometry: [], externalOrigins: [], pageErrors: [], consoleErrors: [],
  scopes: {
    application: "Actual NativeApp/LibraryApp with actual PreviewRecipeLibrary/IndexedDB; generated recipes and existing approved non-private image bytes. No Showcase rendering.",
    persistence: "Actual complete Preview database rows plus generated-media byte digests before/after; IDBObjectStore and Storage entry counts during adjustment windows.",
    display: "Browser CSS root32px is CSS200%, not Android system font scaling; actual reduced-motion emulation and existing solid fallback attribute.",
  },
  notRun: ["Android system IME/Back (separate native job)", "Android OS font scaling", "physical phone", "TalkBack", "real AI/Provider", "personal data", "signed upgrade"],
};
let browser, server, activePage;
const persist = () => writeFile(path.join(out, "results.json"), JSON.stringify(result, null, 2));
const moduleBase = `/@fs/${root.replaceAll("\\", "/").replace(/\/$/, "")}/src/`;
const assets = await readFile(path.join(root, "src/native/ui-v2/showcase/assets/cola-wings.webp"));
const click = (scope, name) => scope.getByRole("button", { name, exact: true }).click();
const detail = page => page.locator(".v2-production-detail:visible");
const serving = scope => scope.getByRole("textbox", { name: "本次做几人份", exact: true });
const amounts = scope => scope.locator(".v2-ingredients dd");
async function check(name, action) {
  await action(); result.checks.push({ name, status: "PASS" });
  console.log(`PASS G6/${name}`); await persist();
}
async function startServer() {
  await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once("error", reject);
    probe.listen(5188, "127.0.0.1", () => probe.close(error => error ? reject(error) : resolve()));
  });
  const child = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"),
    "--config", "vite.native.config.mts", "--host", "127.0.0.1", "--port", "5188", "--strictPort"],
  { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } });
  server = child;
  let log = "", spawnError;
  for (const stream of [child.stdout, child.stderr]) stream.on("data", value => { log = (log + value).slice(-12000); });
  child.once("error", error => { spawnError = error; });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    assert(child.exitCode === null && child.signalCode === null, `Owned Vite exited: ${log.slice(-1600)}`);
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.text()).includes("谱序")) return;
    } catch { /* Only readiness polling, no assumed startup sleep. */ }
    await pollDelay(100);
  }
  throw new Error(`Owned Vite readiness timeout: ${log.slice(-1600)}`);
}
async function stopServer() {
  const child = server; server = null;
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const ended = new Promise(resolve => child.once("close", resolve));
  try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  const closed = await Promise.race([ended.then(() => true), pollDelay(8000).then(() => false)]);
  if (!closed) { try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; } await ended; }
}
async function open(theme = "warm-ivory") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    locale: "zh-CN", timezoneId: "Asia/Shanghai", reducedMotion: "reduce", serviceWorkers: "block" });
  await context.addInitScript(theme => {
    if (!localStorage.getItem("recipio.ui-v2.theme.v1")) localStorage.setItem("recipio.ui-v2.theme.v1", theme);
    window.__g6WriteWatch = { enabled: false, writes: [] };
    for (const [prototype, methods] of [[IDBObjectStore.prototype, ["add", "put", "delete", "clear"]],
      [Storage.prototype, ["setItem", "removeItem", "clear"]]]) {
      for (const name of methods) {
        const original = prototype[name];
        prototype[name] = function (...args) {
          if (window.__g6WriteWatch.enabled) window.__g6WriteWatch.writes.push({ type: this instanceof Storage ? "Storage" : "IDBObjectStore", method: name });
          return original.apply(this, args);
        };
      }
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
    if (url.hostname !== "127.0.0.1" || url.port !== "5188") { result.externalOrigins.push(url.origin); socket.close(); }
    else socket.connectToServer();
  });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
  page.on("pageerror", error => result.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text().slice(0, 1000)); });
  await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  assert.equal(await page.locator("#root .v2-production").count(), 1, "Actual production application root");
  return { page, context };
}
async function seed(page) {
  return page.evaluate(async ({ source, image }) => {
    const { PreviewRecipeLibrary } = await import(source + "native/preview-store.ts");
    const { emptyDetails } = await import(source + "native/recipe-model.ts");
    const { saveLocalImage } = await import(source + "native/media.ts");
    const bytes = Uint8Array.from(atob(image), character => character.charCodeAt(0));
    const cover = await saveLocalImage(new File([bytes], "g6-approved-synthetic.webp", { type: "image/webp" }));
    let tick = Date.parse("2026-10-26T04:00:00Z");
    const store = new PreviewRecipeLibrary(() => new Date(tick++));
    const other = await store.createDetails({ ...emptyDetails("G6 合成番茄汤"), servings: 4,
      ingredients: [{ name: "番茄", amount: "400 克" }] });
    const missing = await store.createDetails({ ...emptyDetails("G6 未填原始份数"), servings: null,
      ingredients: [{ name: "鸡翅", amount: "600 克" }] });
    const main = await store.createDetails({ ...emptyDetails("可乐鸡翅 · G6 合成测试"), coverPath: cover,
      servings: 3, totalMinutes: 30, caloriesPerServing: 328,
      ingredients: [{ name: "鸡翅", amount: "600 克" }, { name: "可乐", amount: "330 毫升" },
        { name: "鸡蛋", amount: "2 个" }, { name: "盐", amount: "适量" },
        { name: "复杂用量示例：这个较长的食材名称应当在手机上清楚换行", amount: "1～2 勺" }],
      steps: [{ instruction: "焯水 2 分钟，保留这条原始步骤数字。", imagePath: cover },
        { instruction: "倒入 330 毫升可乐，焖煮 15 分钟。", imagePath: null }],
      preparations: [{ instruction: "提前把鸡翅洗净沥水。", minutes: 10, timingText: "提前 10 分钟" }],
      keyTips: [{ instruction: "小火收汁，不自动缩短时间。", stepNumber: 2 }],
      notes: "G6 云端合成数据，无个人菜谱或真实 AI。" });
    return { main, other, missing };
  }, { source: moduleBase, image: assets.toString("base64") });
}
async function snapshot(page) {
  return page.evaluate(async source => {
    const { getLocalDatabase } = await import(source + "features/offline/local-db.ts");
    const db = await getLocalDatabase(), tables = {};
    // Full synthetic browser DB, including business/history/metadata tables.
    for (const table of db.tables) {
      const rows = await table.toArray();
      for (const row of rows) for (const [key, value] of Object.entries(row)) if (value instanceof Blob) {
        const digest = await crypto.subtle.digest("SHA-256", await value.arrayBuffer());
        row[key] = { size: value.size, type: value.type, sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("") };
      }
      tables[table.name] = rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return tables;
  }, moduleBase);
}
async function watch(page, enabled) {
  return page.evaluate(enabled => {
    if (enabled) window.__g6WriteWatch.writes = [];
    window.__g6WriteWatch.enabled = enabled;
    return window.__g6WriteWatch.writes;
  }, enabled);
}
async function zeroWrites(page, original) {
  await painted(page);
  assert.deepEqual(await watch(page, false), [], "Adjustment invokes zero IDB/Storage write entries");
  assert.deepEqual(await snapshot(page), original, "Actual recipes/history/media/metadata remain unchanged");
}
async function recipe(page, value) {
  await click(page, `打开 ${value.title}`); await detail(page).getByRole("heading", { name: value.title, exact: true }).waitFor();
}
async function amountValues(scope) {
  return amounts(scope).evaluateAll(nodes => nodes.map(node => {
    const value = (node.querySelector(".v2-g6-amount-value") ?? node).cloneNode(true);
    value.querySelectorAll(".sr-only").forEach(prefix => prefix.remove());
    return value.textContent?.trim();
  }));
}
async function expectValues(scope, expected) {
  const deadline = Date.now() + 15000;
  let actual;
  do {
    actual = await amountValues(scope);
    if (JSON.stringify(actual) === JSON.stringify(expected)) return;
    await pollDelay(50);
  } while (Date.now() < deadline);
  assert.deepEqual(actual, expected);
}
async function target(scope, value) { await serving(scope).fill(String(value)); assert.equal(await serving(scope).inputValue(), String(value)); }
async function reference(page, mode) {
  await click(detail(page), mode === "focus" ? "放大步骤 2" : "开始引导烹饪");
  const cooking = page.getByRole("dialog", { name: mode === "focus" ? "单步查看" : "引导烹饪", exact: true });
  await cooking.waitFor(); await click(cooking, "查看食材");
  const sheet = page.getByRole("dialog", { name: "食材", exact: true }); await sheet.waitFor();
  return { cooking, sheet };
}
async function closeReference(sheet) { await click(sheet, "关闭食材"); await sheet.waitFor({ state: "hidden" }); }
async function painted(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, theme) {
  await painted(page); await page.screenshot({ path: path.join(shots, `${name}.png`) });
  result.screenshots.push({ file: `screenshots/${name}.png`, theme, viewport: page.viewportSize(), source: result.source });
}
async function layout(page, name) {
  await painted(page);
  const geometry = await page.evaluate(() => {
    const visible = element => !!element.getClientRects().length && getComputedStyle(element).visibility !== "hidden"
      && !element.closest('[hidden],[inert],[aria-hidden="true"]');
    const controls = [...document.querySelectorAll('#root :is(button,input,textarea,select),.v2-production-cooking :is(button,input),.v2-portal :is(button,input)')].filter(visible);
    const overflows = [...document.querySelectorAll('.v2-g6-serving,.v2-sheet,.v2-sheet-body,.v2-detail-scroll,.v2-cook-reference')].filter(visible)
      .filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ class: element.className, width: element.clientWidth, scrollWidth: element.scrollWidth }));
    const sheetOpen = [...document.querySelectorAll('.v2-sheet')].some(visible);
    const blockedPrimary = sheetOpen ? [] : [...document.querySelectorAll('.v2-bottom-actions button,.v2-cook-footer button')].filter(visible).map(element => {
      const box = element.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2;
      return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), blocked: x < 0 || x > innerWidth || y < 0 || y > innerHeight || !element.contains(document.elementFromPoint(x, y)) };
    }).filter(item => item.blocked);
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, rootFont: getComputedStyle(document.documentElement).fontSize,
      overflows, blockedPrimary,
      small: controls.filter(element => { const box = element.getBoundingClientRect(); return box.width < 47.9 || box.height < 47.9; })
        .map(element => ({ name: element.getAttribute("aria-label") ?? element.textContent?.slice(0, 60), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })) };
  });
  result.geometry.push({ name, ...geometry });
  assert(geometry.scrollWidth <= geometry.width + 1, `${name}: horizontal overflow`);
  assert.deepEqual(geometry.overflows, [], `${name}: content must not clip horizontally`);
  assert.deepEqual(geometry.blockedPrimary, [], `${name}: primary bottom actions remain reachable`);
  assert.deepEqual(geometry.small, [], `${name}: 48px controls`);
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
}
async function mainFlows(page, data) {
  await recipe(page, data.main); const original = await snapshot(page); await watch(page, true);
  await check("actual detail 3 to2 uses conservative amounts without rewriting metadata or steps", async () => {
    assert.equal(await serving(detail(page)).inputValue(), "3");
    await expectValues(detail(page), ["600 克", "330 毫升", "2 个", "适量", "1～2 勺"]);
    await capture(page, "warm-original-390", "warm-ivory");
    await target(detail(page), 2);
    await expectValues(detail(page), ["400 克", "220 毫升", "约 1.33 个", "适量", "1～2 勺"]);
    assert.match(await detail(page).innerText(), /仅调整本次查看，不修改原菜谱/);
    assert.match(await detail(page).locator(".v2-meta").innerText(), /30 分钟/);
    assert.match(await detail(page).locator(".v2-meta").innerText(), /328 kcal/);
    assert.match(await detail(page).locator(".v2-step-list").innerText(), /焯水 2 分钟/);
    assert.match(await detail(page).locator(".v2-step-list").innerText(), /倒入 330 毫升可乐/);
    await capture(page, "warm-adjusted-390", "warm-ivory");
  });
  await check("Focus inherits2, preserves current step and existing reference sections", async () => {
    const { cooking, sheet } = await reference(page, "focus");
    assert.equal(await serving(sheet).inputValue(), "2");
    await expectValues(sheet, ["400 克", "220 毫升", "约 1.33 个", "适量", "1～2 勺"]);
    assert.match(await sheet.innerText(), /提前准备/); assert.match(await sheet.innerText(), /关键事项/);
    await capture(page, "warm-kitchen-390", "warm-ivory");
    await closeReference(sheet); assert.match(await cooking.innerText(), /第 2 步／共 2 步/);
    await click(cooking, "返回完整步骤"); await cooking.waitFor({ state: "hidden" });
  });
  await check("Guided changes1.5 in existing Sheet and returns shared target to detail", async () => {
    const { cooking, sheet } = await reference(page, "guided");
    await target(sheet, 1.5); await expectValues(sheet, ["300 克", "165 毫升", "1 个", "适量", "1～2 勺"]);
    await closeReference(sheet); assert.match(await cooking.innerText(), /第 1 步／共 2 步/);
    await click(cooking, "退出引导"); await cooking.waitFor({ state: "hidden" });
    assert.equal(await serving(detail(page)).inputValue(), "1.5");
    await expectValues(detail(page), ["300 克", "165 毫升", "1 个", "适量", "1～2 勺"]);
  });
  await check("invalid drafts preserve lastvalid and accessible errors; decimal range stays legal", async () => {
    for (const value of ["", "0", "-1", "0.09", "10000.1", "1e309", "abc", "."]) {
      await target(detail(page), value);
      const input = serving(detail(page)); assert.equal(await input.getAttribute("aria-invalid"), "true");
      const errorId = await input.getAttribute("aria-describedby"); assert(errorId, "Invalid input describes its error");
      await detail(page).getByRole("alert").waitFor();
      assert.equal(await input.evaluate(node => (node.getAttribute('aria-describedby') ?? '').split(/\s+/)
        .some(id => { const error = document.getElementById(id); return error?.getAttribute('role') === 'alert' && !!error.textContent?.trim(); })), true,
      "Input must actually reference its visible validation error");
      await expectValues(detail(page), ["300 克", "165 毫升", "1 个", "适量", "1～2 勺"]);
    }
    await target(detail(page), 0.1); await expectValues(detail(page), ["20 克", "11 毫升", "约 0.07 个", "适量", "1～2 勺"]);
    assert.notEqual(await serving(detail(page)).getAttribute("aria-invalid"), "true");
    await target(detail(page), 10000); await expectValues(detail(page), ["2000000 克", "1100000 毫升", "约 6666.67 个", "适量", "1～2 勺"]);
  });
  await check("reset restores exact original text", async () => {
    await click(detail(page), "恢复原始份数"); assert.equal(await serving(detail(page)).inputValue(), "3");
    await expectValues(detail(page), ["600 克", "330 毫升", "2 个", "适量", "1～2 勺"]);
  });
  await zeroWrites(page, original);
  await check("recipe switch and reentry discard temporary targets", async () => {
    await watch(page, true); await target(detail(page), 2); await click(detail(page), "返回菜谱库");
    await recipe(page, data.other); assert.equal(await serving(detail(page)).inputValue(), "4");
    await click(detail(page), "返回菜谱库"); await recipe(page, data.main);
    assert.equal(await serving(detail(page)).inputValue(), "3"); await zeroWrites(page, original);
  });
  await check("browser reload starts from original3 and has no persisted target", async () => {
    await watch(page, true); await target(detail(page), 2); await zeroWrites(page, original);
    await page.reload(); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
    await recipe(page, data.main); assert.equal(await serving(detail(page)).inputValue(), "3");
    assert.deepEqual(await snapshot(page), original);
  });
  await check("missing original denominator keeps600 and prompts recipe editing", async () => {
    await click(detail(page), "返回菜谱库"); await recipe(page, data.missing); await watch(page, true);
    const input = serving(detail(page));
    assert(await input.count() === 0 || !(await input.isEnabled()), "Missing denominator cannot offer active scaling input");
    assert.match(await detail(page).innerText(), /原始份数/); await expectValues(detail(page), ["600 克"]);
    await zeroWrites(page, original); await click(detail(page), "返回菜谱库"); await recipe(page, data.main);
  });
  await check("editor cancel retains target; explicit save resets to latest original4", async () => {
    await target(detail(page), 2); await click(detail(page), "编辑菜谱");
    await page.getByLabel("菜名", { exact: true }).waitFor(); await click(page, "取消");
    await detail(page).waitFor(); assert.equal(await serving(detail(page)).inputValue(), "2");
    await click(detail(page), "编辑菜谱"); await page.getByLabel("约几人份", { exact: true }).fill("4");
    await click(page, "保存菜谱"); await detail(page).waitFor();
    assert.equal(await serving(detail(page)).inputValue(), "4");
    const saved = await snapshot(page); assert.equal(saved.recipeChanges.length, original.recipeChanges.length + 1);
    assert.equal(saved.nativeCookingRecords.length, 0); assert.deepEqual(saved.media, original.media);
    const main = saved.localRecipes.find(row => row.id === data.main.id);
    assert.equal(main.referenceServings, 4); assert.deepEqual(main.ingredients, original.localRecipes.find(row => row.id === data.main.id).ingredients.map((row, i) => ({ ...row, id: main.ingredients[i].id })));
  });
  await check("only explicit completion records once after synchronous doubleclick", async () => {
    const before = await snapshot(page); await watch(page, true); await target(detail(page), 2);
    const { cooking, sheet } = await reference(page, "guided");
    await target(sheet, 1.5); await closeReference(sheet); await click(cooking, "下一步");
    await zeroWrites(page, before);
    await cooking.getByRole("button", { name: "完成这道菜", exact: true }).evaluate(button => { button.click(); button.click(); });
    await page.getByText("已记录做过这道菜", { exact: true }).waitFor();
    const after = await snapshot(page); assert.equal(after.nativeCookingRecords.length, before.nativeCookingRecords.length + 1);
    assert.deepEqual(after.localRecipes, before.localRecipes); assert.deepEqual(after.recipeChanges, before.recipeChanges); assert.deepEqual(after.media, before.media);
    await click(page, "完成并返回");
  });
}
async function visualFlows(theme) {
  const { page, context } = await open(theme);
  try {
    const data = await seed(page); await page.reload(); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
    await recipe(page, data.main); await target(detail(page), 2);
    if (theme !== "warm-ivory") await capture(page, `${theme}-adjusted-390`, theme);
    const widths = theme === "warm-ivory" ? [320, 390, 412] : [390];
    for (const width of widths) for (const large of [false, true]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(large => { document.documentElement.style.fontSize = large ? "32px" : "16px"; }, large);
      await check(`${theme}-${width}-CSS${large ? 200 : 100}-detail`, () => layout(page, `${theme}-${width}-CSS${large ? 200 : 100}-detail`));
      const { cooking, sheet } = await reference(page, "guided");
      await check(`${theme}-${width}-CSS${large ? 200 : 100}-kitchen`, () => layout(page, `${theme}-${width}-CSS${large ? 200 : 100}-kitchen`));
      if (theme === "warm-ivory" && width === 320 && large) await capture(page, "warm-320-CSS200-kitchen", theme);
      await closeReference(sheet); await layout(page, `${theme}-${width}-CSS${large ? 200 : 100}-cooking-main`);
      await click(cooking, "退出引导"); await cooking.waitFor({ state: "hidden" });
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; document.querySelectorAll('[data-v2-solid]').forEach(node => node.setAttribute("data-v2-solid", "true")); });
    await check(`${theme}-solid-and-reduced-motion`, async () => {
      assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
      assert.equal(await detail(page).evaluate(node => node.closest("[data-v2-solid]")?.getAttribute("data-v2-solid")), "true");
      await layout(page, `${theme}-solid`);
    });
  } catch (error) {
    await capture(page, `${theme}-failure-diagnostic`, theme).catch(() => {}); throw error;
  } finally { await context.close(); }
}
try {
  await persist(); await startServer(); browser = await chromium.launch({ headless: true }); result.browser = browser.version();
  const { page, context } = await open();
  try { const data = await seed(page); await page.reload(); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor(); await mainFlows(page, data); }
  catch (error) { await capture(page, "main-flow-failure-diagnostic", "warm-ivory").catch(() => {}); throw error; }
  finally { await context.close(); }
  for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) await visualFlows(theme);
  assert.deepEqual(result.externalOrigins, [], "Zero unexpected external network origins");
  assert.deepEqual(result.pageErrors, [], "Zero page errors"); assert.deepEqual(result.consoleErrors, [], "Zero console errors");
  result.status = "PASS"; result.passed = result.checks.length;
  console.log(`G6_BROWSER_PASS ${result.passed} checks; ${result.screenshots.length} real screenshots; external origins0`);
} catch (error) {
  result.status = "FAIL"; result.error = error.stack ?? String(error);
  if (activePage && !activePage.isClosed()) await capture(activePage, "failure-diagnostic", "failure").catch(() => {});
  throw error;
} finally { await persist(); if (browser) await browser.close(); await stopServer(); }
