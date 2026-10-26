// Cloud-only browser evidence. No private profile, phone, credential or paid AI.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as pollDelay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

assert(process.env.GITHUB_ACTIONS === "true" && process.env.RUNNER_ENVIRONMENT === "github-hosted"
  && process.env.RUNNER_OS === "Linux" && process.platform === "linux", "GitHub-hosted Linux only; never use a local profile");
const root = fileURLToPath(new URL("../", import.meta.url));
const baseline = "d3846b62b620f5a2a3bce0708473ce6b6bad3c06";
const base = "http://127.0.0.1:5187/";
const runtime = process.argv.find(arg => arg.startsWith("--runtime="))?.slice(10);
assert(runtime && path.isAbsolute(runtime), "--runtime must name the isolated QA node_modules");
const qaRequire = createRequire(path.join(runtime, "g5-qa.cjs"));
assert(qaRequire.resolve("playwright/package.json").startsWith(path.resolve(runtime) + path.sep), "QA runtime must supply Playwright; no production/global fallback");
assert.equal(qaRequire("playwright/package.json").version, "1.62.1", "Use the pinned QA Playwright version");
const { chromium } = qaRequire("playwright");
const out = path.join(root, "output/playwright/g5/cloud");
const shots = path.join(out, "screenshots");
await mkdir(path.dirname(out), { recursive: true });
await mkdir(out); // Never overwrite a prior evidence run.
await mkdir(shots);
const git = (args, cwd = root) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `Git metadata/worktree operation failed: ${args[0]}`);
  return result.stdout.trim();
};
const result = {
  status: "RUNNING", source: git(["rev-parse", "HEAD"]), baseline,
  browser: null, viewport: { width: 390, height: 844 }, checks: [], screenshots: [], geometry: [],
  pageErrors: [], consoleErrors: [], externalOrigins: [], observations: [],
  scopes: {
    production: "PRODUCTION_NATIVE_APP_BROWSER: real NativeApp/LibraryApp, PreviewRecipeLibrary and local media; generated records and previously approved non-private G1 image bytes",
    provider: "FAKE_PROVIDER_BROWSER: existing QA fixture injects fake external ports into real LibraryApp/services; no real Provider or credentials",
    offline: "Loaded browser core with network disabled; not an APK cold-start test",
    display: "CSS root32px emulates browser200%; solid data attribute tests the existing CSS contract, not an unsupported WebView; reduced-motion uses actual media emulation",
  },
  notRun: ["Android system IME/Back", "Android OS font scaling", "TalkBack", "physical phone", "device performance certification", "real AI/Provider", "signed upgrade", "personal-data migration"],
};
const tempRoot = process.env.RUNNER_TEMP;
assert(tempRoot && path.isAbsolute(tempRoot), "RUNNER_TEMP is required");
const temp = await mkdtemp(path.join(tempRoot, "recipio-g5-browser-"));
assert(path.resolve(temp).startsWith(path.resolve(tempRoot) + path.sep), "Unsafe temporary directory");
const beforeRoot = path.join(temp, "baseline");
let baselineCreated = false, linked = false, copiedBaselineTest = false, browser, server, activePage;
const assets = Object.fromEntries(await Promise.all([
  ["cover", "cola-wings.webp"], ["step", "cola-step.webp"],
  ["soup", "tomato-egg-soup.webp"], ["broccoli", "broccoli.webp"],
].map(async ([name, file]) => [name, (await readFile(path.join(root, "src/native/ui-v2/showcase/assets", file))).toString("base64")])));
const moduleBase = directory => `/@fs/${directory.replaceAll("\\", "/").replace(/\/$/, "")}/src/native/`;
const visibleRoot = "#root .v2-production";
const persist = () => writeFile(path.join(out, "results.json"), JSON.stringify(result, null, 2));
async function baselineReadErrorRed() {
  const relativeTest = "src/native/ui-v2/g5-library.test.tsx";
  const target = path.join(beforeRoot, relativeTest);
  try { await readFile(target); throw new Error("Refusing to overwrite an existing baseline test"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await copyFile(path.join(root, relativeTest), target); copiedBaselineTest = true;
  const json = path.join(out, "baseline-vitest-red.json");
  const run = spawnSync(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", relativeTest,
    "--pool=threads", "--maxWorkers=1", "--no-file-parallelism", "--reporter=json", `--outputFile=${json}`],
  { cwd: beforeRoot, encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, CI: "true" } });
  assert.equal(run.status, 1, "Old component must run and fail assertions, not time out or crash");
  const report = JSON.parse(await readFile(json, "utf8"));
  const assertions = report.testResults.flatMap(suite => suite.assertionResults);
  const focus = assertions.find(test => test.fullName === "a failed library read never claims an empty collection or an empty search result");
  assert(focus, "Read-error test must actually execute; dependency/suite errors are not RED");
  assert.equal(focus.status, "failed");
  assert(/not\.toBeInTheDocument/.test(focus.failureMessages.join("\n")), "RED must be the wrong empty-state assertion");
  result.baselineRed = { status: "BASELINE_RED", source: baseline, test: focus.fullName,
    total: report.numTotalTests, failed: report.numFailedTests, passed: report.numPassedTests,
    scope: "Copied current tests against unchanged baseline UI; expected assertion failure, not current-product failure", report: "baseline-vitest-red.json" };
  console.log("BASELINE_RED: read-error regression reproduced against original component"); await persist();
}
async function check(name, scope, action) {
  await action(); result.checks.push({ name, scope, status: "PASS" });
  console.log(`PASS ${scope}/${name}`); await persist();
}
async function freePort() {
  await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once("error", reject);
    probe.listen(5187, "127.0.0.1", () => probe.close(error => error ? reject(error) : resolve()));
  });
}
async function startServer(directory) {
  await freePort();
  const child = spawn(process.execPath, [path.join(directory, "node_modules/vite/bin/vite.js"),
    "--config", "vite.native.config.mts", "--host", "127.0.0.1", "--port", "5187", "--strictPort"],
  { cwd: directory, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } });
  let log = ""; child.stdout.on("data", value => { log = (log + value).slice(-12000); });
  child.stderr.on("data", value => { log = (log + value).slice(-12000); });
  let spawnError; child.once("error", error => { spawnError = error; });
  server = child;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    assert(child.exitCode === null && child.signalCode === null, `Owned Vite exited before readiness: ${log.slice(-1600)}`);
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.text()).includes("谱序")) return;
    } catch { /* Poll only HTTP readiness; no assumed startup delay. */ }
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
  const context = await browser.newContext({ viewport: result.viewport, deviceScaleFactor: 1,
    locale: "zh-CN", timezoneId: "Asia/Shanghai", reducedMotion: "reduce", serviceWorkers: "block" });
  await context.addInitScript(theme => {
    const key = "recipio.ui-v2.theme.v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, theme);
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
    if (url.hostname !== "127.0.0.1" || url.port !== "5187") {
      result.externalOrigins.push(url.origin); socket.close();
    } else socket.connectToServer();
  });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => result.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") {
    if ((page.__g5Offline || page.__g5OfflineWasUsed) && (/\[vite\].*(websocket|connection)/i.test(message.text())
      || /^WebSocket connection to ['"]ws:\/\/127\.0\.0\.1:5187\//i.test(message.text()))) {
      result.observations.push({ scope: "intentional-offline-dev-transport", message: message.text().slice(0, 180) });
    } else result.consoleErrors.push(message.text().slice(0, 1000));
  } });
  await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  assert.equal(await page.locator(visibleRoot).count(), 1, "Use real production root");
  return { page, context };
}
async function painted(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, file, scope = "PRODUCTION_NATIVE_APP_BROWSER") {
  await painted(page);
  const target = path.join(shots, `${file}.png`); await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target });
  result.screenshots.push({ file: `screenshots/${file}.png`, scope, viewport: page.viewportSize() });
}
async function layout(page, name) {
  await painted(page);
  const data = await page.evaluate(() => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden]");
    const controls = [...document.querySelectorAll('#root :is(button,input,textarea,select),.v2-production-cooking button,.v2-portal button')].filter(visible);
    const small = controls.map(el => el.matches('input[type="checkbox"],input[type="radio"]') ? el.closest("label") ?? el : el)
      .filter(el => { const box = el.getBoundingClientRect(); return box.width < 47.9 || box.height < 47.9; })
      .map(el => ({ text: (el.getAttribute("aria-label") ?? el.textContent ?? "").slice(0, 70),
        width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      font: getComputedStyle(document.documentElement).fontSize, controls: controls.length, small };
  });
  result.geometry.push({ name, ...data });
  assert(data.scrollWidth <= data.width + 1, `${name}: horizontal document overflow`);
  assert.deepEqual(data.small, [], `${name}: interactive targets below48px`);
  assert.equal(await page.locator("vite-error-overlay").count(), 0, `${name}: no Vite overlay`);
}
async function seed(page, directory) {
  return page.evaluate(async ({ source, assets }) => {
    const { PreviewRecipeLibrary } = await import(source + "preview-store.ts");
    const { emptyDetails } = await import(source + "recipe-model.ts");
    const { saveLocalImage } = await import(source + "media.ts");
    let tick = Date.parse("2026-10-20T04:00:00.000Z");
    const store = new PreviewRecipeLibrary(() => new Date(tick++));
    const image = async name => {
      const bytes = Uint8Array.from(atob(assets[name]), character => character.charCodeAt(0));
      return saveLocalImage(new File([bytes], `g5-approved-${name}.webp`, { type: "image/webp" }));
    };
    const [cover, step, soup, broccoli] = await Promise.all(["cover", "step", "soup", "broccoli"].map(image));
    await store.createDetails({ ...emptyDetails("蒜香西兰花"), coverPath: broccoli, totalMinutes: 15 });
    await store.createDetails({ ...emptyDetails("番茄鸡蛋汤"), coverPath: soup, totalMinutes: 20 });
    const nameOnly = await store.create("只有菜名也能慢慢完善，留住自己认可的家常做法与那些需要完整阅读的长标题");
    const main = await store.createDetails({ ...emptyDetails("可乐鸡翅"), coverPath: cover, totalMinutes: 30,
      servings: 3, caloriesPerServing: 328,
      ingredients: [{ name: "鸡翅", amount: "500 克" }, { name: "可乐", amount: "330 毫升" }, { name: "生抽", amount: "2 勺" }, { name: "姜片", amount: "4 片" }],
      preparations: [{ instruction: "鸡翅洗净，表面划两刀，沥干水分。", minutes: null, timingText: null }],
      keyTips: [{ instruction: "收汁时留意锅底，避免烧糊。", stepNumber: 3 }],
      steps: [{ instruction: "鸡翅冷水下锅，焯水后捞出沥干。", imagePath: cover },
        { instruction: "倒入 330 毫升可乐，加入生抽和姜片，大火煮开后转小火。", imagePath: step },
        { instruction: "鸡翅熟透后开盖收汁，汤汁浓稠时关火。", imagePath: null }],
      notes: "G5 合成测试菜谱；图片为已批准的非私人样板素材。" });
    return { id: main.id, title: main.title, nameOnly: nameOnly.title,
      createdOrder: (await store.list()).map(recipe => recipe.title), ingredients: main.ingredients, steps: main.steps };
  }, { source: moduleBase(directory), assets });
}
const click = (page, name) => page.getByRole("button", { name, exact: true }).click();
const nav = (page, name) => page.getByRole("navigation", { name: "主要导航" }).getByRole("button", { name, exact: true }).click();
async function recipeDetail(page, data) {
  await click(page, `打开 ${data.title}`); await page.getByRole("heading", { name: data.title, exact: true }).waitFor();
  await page.locator(".v2-detail-hero img").waitFor();
}
const summary = (page, directory, id) => page.evaluate(async ({ source, id }) => {
  const { PreviewRecipeLibrary } = await import(source + "preview-store.ts");
  const store = new PreviewRecipeLibrary();
  return { summary: await store.getCookingSummary(id), records: await store.listCookingRecords(id),
    changes: await store.listRecipeChanges(id), details: await store.getDetails(id) };
}, { source: moduleBase(directory), id });
async function threeScreens(directory, stage, theme) {
  const { page, context } = await open(theme);
  try {
    await page.getByRole("heading", { name: "先记下第一道想做的菜", exact: true }).waitFor();
    const data = await seed(page, directory); await page.reload();
    await page.locator(".v2-recent-card img").first().waitFor();
    await capture(page, `${stage}/${theme}/home-390`);
    await recipeDetail(page, data); await capture(page, `${stage}/${theme}/detail-390`);
    await click(page, "开始引导烹饪");
    const guided = page.getByRole("dialog", { name: "引导烹饪", exact: true }); await guided.waitFor();
    assert.equal(await guided.getAttribute("data-v2-theme"), theme);
    await capture(page, `${stage}/${theme}/cooking-390`);
    await guided.getByRole("button", { name: "退出引导", exact: true }).click(); await guided.waitFor({ state: "hidden" });
    assert.equal((await summary(page, directory, data.id)).summary.count, 0, "Preview/Guided exit cannot record cooked");
    result.checks.push({ name: `${stage}/${theme}/real-three-screens`, scope: "PRODUCTION_NATIVE_APP_BROWSER", status: "PASS" });
  } catch (error) {
    await capture(page, `${stage}/${theme}/failure`, "FAILURE_DIAGNOSTIC").catch(() => {});
    throw error;
  } finally { await context.close(); }
}
async function coreFlows(page, context, directory, data) {
  await check("Focus and Guided navigation preserve zero cooked records", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await click(page, "放大步骤 1"); const focus = page.getByRole("dialog", { name: "单步查看", exact: true }); await focus.waitFor();
    await focus.getByRole("button", { name: "下一步", exact: true }).click();
    await focus.getByRole("button", { name: "返回完整步骤", exact: true }).click(); await focus.waitFor({ state: "hidden" });
    assert.equal((await summary(page, directory, data.id)).summary.count, 0);
  });
  const initial = (await summary(page, directory, data.id)).details;
  await check("cancel edited title and cancelled file selection retain actual recipe", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await click(page, "编辑菜谱"); await page.getByLabel("菜名", { exact: true }).waitFor();
    await capture(page, "after/warm-ivory/editor-390");
    await page.locator('input[type="file"]').first().setInputFiles([]);
    await page.getByLabel("菜名", { exact: true }).fill("不保存的临时修改");
    page.once("dialog", async dialog => { assert(dialog.message().includes("有未保存的修改")); await dialog.accept(); });
    await click(page, "取消"); await page.getByRole("heading", { name: data.title, exact: true }).waitFor();
    assert.deepEqual((await summary(page, directory, data.id)).details, initial);
  });
  await check("search duration and return retain current inputs without network", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await click(page, "返回菜谱库"); await nav(page, "我的菜谱");
    await page.getByLabel("搜索菜名或食材", { exact: true }).fill("鸡翅");
    await page.getByLabel("耗时筛选", { exact: true }).selectOption("short");
    await recipeDetail(page, data); await click(page, "返回菜谱库");
    assert.equal(await page.getByLabel("搜索菜名或食材").inputValue(), "鸡翅");
    assert.equal(await page.getByLabel("耗时筛选").inputValue(), "short");
    await page.getByLabel("搜索菜名或食材").fill("本机不存在的测试菜");
    await page.getByRole("heading", { name: "没有符合条件的菜谱", exact: true }).waitFor();
    await click(page, "清空搜索词");
    assert.equal(await page.getByLabel("耗时筛选").inputValue(), "short");
    await page.getByLabel("耗时筛选").selectOption("all"); await nav(page, "首页");
  });
  await check("three themes persist from actual Settings without clearing a query", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await nav(page, "我的菜谱"); await page.getByLabel("搜索菜名或食材").fill("鸡翅");
    for (const [theme, label] of [["pure-glass", "Pure Glass（纯净白）"], ["soft-sage", "Soft Sage（淡绿色）"], ["warm-ivory", "Warm Ivory（暖米色）"]]) {
      await nav(page, "设置"); await page.getByRole("radio", { name: label, exact: true }).check();
      await page.waitForFunction(theme => document.querySelector('#root .v2-production')?.getAttribute("data-v2-theme") === theme, theme);
      await nav(page, "我的菜谱"); assert.equal(await page.getByLabel("搜索菜名或食材").inputValue(), "鸡翅");
    }
    await page.reload(); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
    assert.equal(await page.locator(visibleRoot).getAttribute("data-v2-theme"), "warm-ivory");
  });
  await nav(page, "首页");
  await check("320 390 412 widths and browser CSS200 percent keep home detail and cooking reachable", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    for (const width of [320, 390, 412]) for (const font of [16, 32]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; window.scrollTo(0, 0); }, font);
      await layout(page, `home/${width}/${font}`);
      await recipeDetail(page, data); await layout(page, `detail/${width}/${font}`);
      if (width === 320 && font === 32) await capture(page, "after/warm-ivory/detail-320-css200");
      await click(page, "开始引导烹饪"); const dialog = page.getByRole("dialog", { name: "引导烹饪", exact: true });
      await dialog.waitFor(); await layout(page, `cooking/${width}/${font}`);
      const footer = await dialog.locator(".v2-cook-footer").boundingBox();
      assert(footer && footer.y >= -1 && footer.y + footer.height <= 845, "Cooking actions remain within viewport");
      await dialog.getByRole("button", { name: "退出引导", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
      await click(page, "返回菜谱库");
    }
    await page.setViewportSize(result.viewport); await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
  });
  await recipeDetail(page, data);
  await check("solid glass fallback and reduced motion preserve readable controls", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await click(page, "开始引导烹饪");
    const dialog = page.getByRole("dialog", { name: "引导烹饪", exact: true }); await dialog.waitFor();
    await page.evaluate(() => document.querySelectorAll('#root .recipio-ui-v2,.v2-production-cooking,.v2-production-cooking .recipio-ui-v2')
      .forEach(element => element.setAttribute("data-v2-solid", "true")));
    const values = await dialog.locator(".v2-cook-toolbar").evaluate(element => ({ blur: getComputedStyle(element).backdropFilter,
      reduce: matchMedia("(prefers-reduced-motion: reduce)").matches }));
    assert.equal(values.blur, "none"); assert.equal(values.reduce, true);
    await layout(page, "cooking/solid/reduced"); await capture(page, "after/warm-ivory/cooking-solid-390");
    await dialog.getByRole("button", { name: "退出引导", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    await page.evaluate(() => document.querySelectorAll('#root [data-v2-solid]').forEach(element => element.setAttribute("data-v2-solid", "false")));
  });
  await check("only explicit completion creates one record and optional extras persist", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    assert.equal((await summary(page, directory, data.id)).summary.count, 0);
    await click(page, "开始引导烹饪"); const dialog = page.getByRole("dialog", { name: "引导烹饪", exact: true }); await dialog.waitFor();
    await dialog.getByRole("button", { name: "下一步", exact: true }).click();
    await dialog.getByRole("button", { name: "下一步", exact: true }).click();
    await dialog.getByRole("button", { name: "完成这道菜", exact: true }).click();
    await page.getByRole("heading", { name: "已记录做过这道菜", exact: true }).waitFor();
    assert.equal((await summary(page, directory, data.id)).summary.count, 1);
    await page.getByLabel("选择成品照片", { exact: true }).setInputFiles({ name: "g5-approved-cover.webp", mimeType: "image/webp", buffer: Buffer.from(assets.cover, "base64") });
    await page.locator(".v2-completion-photo").waitFor();
    await page.getByLabel("这次感觉（可选）", { exact: true }).selectOption("tasty");
    await page.getByLabel("这次的备注", { exact: true }).fill("下次生抽少放一些。G5 合成测试记录。");
    await capture(page, "after/warm-ivory/completion-390"); await click(page, "完成并返回");
    await page.getByRole("heading", { name: data.title, exact: true }).waitFor();
    await page.getByRole("heading", { name: "上次下厨", exact: true }).waitFor();
    const saved = await summary(page, directory, data.id);
    assert.equal(saved.records.length, 1); assert.equal(saved.records[0].evaluation, "tasty");
    assert.equal(saved.records[0].note, "下次生抽少放一些。G5 合成测试记录。");
    assert(saved.records[0].finishedPhotoPath); assert.equal(saved.details.coverPath, initial.coverPath);
    await capture(page, "after/warm-ivory/latest-record-390");
    await click(page, "查看做菜记录"); await page.getByRole("heading", { name: "做菜记录", exact: true }).waitFor();
    await capture(page, "after/warm-ivory/history-390"); await click(page, "返回菜谱");
    assert.equal((await summary(page, directory, data.id)).summary.count, 1);
  });
  await check("explicit recipe adjustment creates real change history", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    await click(page, "编辑菜谱"); await page.getByLabel("个人备注", { exact: true }).fill("G5 合成测试：下次收汁时留一点汤汁。");
    await click(page, "快速保存菜谱"); await page.getByRole("heading", { name: data.title, exact: true }).waitFor();
    assert.equal((await summary(page, directory, data.id)).changes.length, 1);
    await click(page, "查看修改记录"); await page.getByRole("heading", { name: "修改记录", exact: true }).waitFor();
    await capture(page, "after/warm-ivory/change-history-390"); await click(page, "返回菜谱");
  });
  await check("loaded core opens local recipe images and Focus with browser offline", "PRODUCTION_NATIVE_APP_BROWSER", async () => {
    page.__g5Offline = true; page.__g5OfflineWasUsed = true; await context.setOffline(true);
    try {
      await click(page, "返回菜谱库"); await recipeDetail(page, data);
      await click(page, "放大步骤 1"); const focus = page.getByRole("dialog", { name: "单步查看", exact: true }); await focus.waitFor();
      await focus.getByRole("button", { name: "返回完整步骤", exact: true }).click(); await focus.waitFor({ state: "hidden" });
      assert.equal((await summary(page, directory, data.id)).summary.count, 1);
    } finally { await context.setOffline(false); page.__g5Offline = false; }
  });
}
async function fixture() {
  const opened = await open();
  await opened.page.evaluate(async source => {
    const original = document.getElementById("root"); original.hidden = true; original.id = "qa-original-root";
    const target = document.createElement("div"); target.id = "root"; document.body.append(target);
    const { renderFixture } = await import(source); window.__g5Fixture = await renderFixture(target);
  }, `/@fs/${root.replaceAll("\\", "/")}scripts/fixtures/ui-v2-intake.tsx`);
  await opened.page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  return opened;
}
async function fakeProviderFlows() {
  const { page, context } = await fixture();
  try {
    await check("AI input preview edit confirmation and explicit save", "FAKE_PROVIDER_BROWSER", async () => {
      await click(page, "新增菜谱"); await click(page, "AI 整理");
      await page.getByLabel("菜谱文字", { exact: true }).fill("番茄炒蛋，番茄2个，鸡蛋3个。番茄切块，鸡蛋打散。炒熟后拌匀。");
      await click(page, "添加截图"); await capture(page, "after/warm-ivory/ai-input-390", "FAKE_PROVIDER_BROWSER");
      assert.equal(await page.evaluate(() => window.__g5Fixture.calls.ai), 0);
      await click(page, "开始 AI 整理"); await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "快速保存菜谱", exact: true }).isDisabled(), true);
      assert.equal(await page.evaluate(() => window.__g5Fixture.assertServiceReviewGate()), true);
      await capture(page, "after/warm-ivory/ai-preview-390", "FAKE_PROVIDER_BROWSER");
      await page.getByLabel("菜名", { exact: true }).fill("番茄炒蛋 · G5 合成检查");
      const gate = page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }); await gate.check();
      await capture(page, "after/warm-ivory/ai-confirmation-390", "FAKE_PROVIDER_BROWSER");
      await click(page, "快速保存菜谱"); await page.getByRole("heading", { name: "番茄炒蛋 · G5 合成检查", exact: true }).waitFor();
      const rows = await page.evaluate(() => window.__g5Fixture.recipes());
      assert.equal(rows.length, 1); assert.equal(rows[0].coverPath, null); assert(rows[0].steps.every(step => step.imagePath === null));
      assert.equal(await page.evaluate(() => window.__g5Fixture.calls.create), 1);
    });
    await check("Finder waits for explicit search and exposes distinct source candidates", "FAKE_PROVIDER_BROWSER", async () => {
      await click(page, "返回菜谱库"); await click(page, "新增菜谱"); await click(page, "帮我找做法");
      await page.getByLabel("想做什么菜", { exact: true }).fill("番茄炒蛋");
      await page.getByLabel("偏好（可选）", { exact: true }).fill("少油、家常");
      assert.equal(await page.evaluate(() => window.__g5Fixture.calls.search), 0);
      await capture(page, "after/warm-ivory/finder-input-390", "FAKE_PROVIDER_BROWSER"); await click(page, "开始寻找");
      await page.getByRole("heading", { name: "找到 3 个做法，请选择", exact: true }).waitFor();
      assert.equal(await page.locator(".v2-source-card").count(), 3);
      assert.equal(await page.evaluate(() => window.__g5Fixture.calls.search), 1);
      assert.equal(await page.evaluate(() => window.__g5Fixture.calls.extract), 0);
      await layout(page, "finder/results"); await capture(page, "after/warm-ivory/finder-results-390", "FAKE_PROVIDER_BROWSER");
    });
  } finally { await context.close(); }
  const link = await fixture();
  try {
    await check("Link parser preview never automatically invokes AI", "FAKE_PROVIDER_BROWSER", async () => {
      await click(link.page, "新增菜谱"); await click(link.page, "从网页链接导入");
      await link.page.getByLabel("网页链接", { exact: true }).fill("https://example.com/complete");
      assert.equal(await link.page.evaluate(() => window.__g5Fixture.calls.read), 0);
      await click(link.page, "读取网页"); await link.page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor();
      assert.equal(await link.page.evaluate(() => window.__g5Fixture.calls.read), 1);
      assert.equal(await link.page.evaluate(() => window.__g5Fixture.calls.ai), 0);
      await capture(link.page, "after/warm-ivory/link-preview-390", "FAKE_PROVIDER_BROWSER");
    });
  } finally { await link.context.close(); }
}

try {
  git(["cat-file", "-e", `${baseline}^{commit}`]);
  git(["worktree", "add", "--detach", beforeRoot, baseline]); baselineCreated = true;
  assert((await readFile(path.join(root, "package-lock.json"))).equals(await readFile(path.join(beforeRoot, "package-lock.json"))), "Baseline dependency lock must match current source");
  await symlink(path.join(root, "node_modules"), path.join(beforeRoot, "node_modules"), "dir"); linked = true;
  await baselineReadErrorRed();
  browser = await chromium.launch({ headless: true }); result.browser = browser.version();
  await startServer(beforeRoot); await threeScreens(beforeRoot, "before", "warm-ivory"); await stopServer();
  await startServer(root);
  // Complete all core visual pairs before any optional long-tail behavior can fail.
  for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) await threeScreens(root, "after", theme);
  const core = await open();
  try {
    const data = await seed(core.page, root); await core.page.reload(); await recipeDetail(core.page, data);
    await coreFlows(core.page, core.context, root, data);
  } catch (error) {
    await capture(core.page, "after/warm-ivory/core-failure", "FAILURE_DIAGNOSTIC").catch(() => {});
    throw error;
  } finally { await core.context.close(); }
  await fakeProviderFlows();
  assert.deepEqual(result.externalOrigins, [], "No attempted off-origin network or real AI");
  assert.deepEqual(result.pageErrors, [], "No browser runtime errors");
  assert.deepEqual(result.consoleErrors, [], "No unexpected console errors");
  result.status = "PASS";
} catch (error) {
  result.status = "FAIL"; result.failure = String(error.stack ?? error).slice(0, 3500);
  if (activePage && !activePage.isClosed()) await capture(activePage, "failure", "FAILURE_DIAGNOSTIC").catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close().catch(error => { result.observations.push({ scope: "cleanup", message: error.message }); });
  await stopServer().catch(error => { result.observations.push({ scope: "cleanup", message: error.message }); });
  if (copiedBaselineTest) await unlink(path.join(beforeRoot, "src/native/ui-v2/g5-library.test.tsx")).catch(() => {});
  if (linked) await unlink(path.join(beforeRoot, "node_modules")).catch(() => {});
  if (baselineCreated) {
    try { git(["worktree", "remove", beforeRoot]); baselineCreated = false; }
    catch (error) { result.observations.push({ scope: "cleanup", message: error.message }); }
  }
  if (!baselineCreated) await rm(temp, { recursive: true, force: false }).catch(() => {});
  result.finishedAt = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ status: result.status, checks: result.checks.length, screenshots: result.screenshots.length,
    failure: result.failure ?? null, result: path.relative(root, path.join(out, "results.json")) }));
}
