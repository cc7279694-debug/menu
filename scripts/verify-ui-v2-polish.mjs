import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiV2EvidenceSource } from "./ui-v2-evidence-source.mjs";

// Installed Playwright only; this script never downloads a runtime or browser.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const runtime = process.argv.find((value) => value.startsWith("--runtime="))?.slice(10);
const { chromium } = require(require.resolve("playwright", { paths: [root, runtime].filter(Boolean) }));
const baselineRevision = "3b120bee4581a0d08be217605b577d5c0fa1f57e";
const captureBefore = process.argv.includes("--capture-before");
const base = "http://127.0.0.1:5182/ui-v2-showcase/";
const out = path.join(root, "output/playwright/ui-v2/final-polish");
const phase = captureBefore ? "before" : "after";
const phaseOut = path.join(out, phase);
const themes = ["warm-ivory", "pure-glass", "soft-sage"];
const screens = ["home", "detail", "cooking"];
const settings = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: "zh-CN", timezoneId: "Asia/Shanghai", colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block" };
const fixedTime = "2026-10-23T04:00:00.000Z";
const testedSource = await uiV2EvidenceSource(root);
const verificationScript = { path: "scripts/verify-ui-v2-polish.mjs", sha256: createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex") };
if (captureBefore) {
  assert.equal(testedSource.baseRevision, baselineRevision, "Before capture requires the approved baseline HEAD");
  assert.equal(testedSource.dirtyAtRun, false, "Before capture requires clean showcase/QA source");
  const alreadyExists = await access(path.join(phaseOut, "metrics.json")).then(() => true, () => false);
  assert.equal(alreadyExists, false, "Fresh before evidence already exists; never overwrite the frozen baseline");
}
await mkdir(phaseOut, { recursive: true });
const errors = [], externalRequests = [], businessRequests = [], checks = [], records = [], comparisons = [], clearance = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(settings);
await context.addInitScript((iso) => {
  const OriginalDate = Date;
  class FixedDate extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return new OriginalDate(iso).valueOf(); }
  }
  window.Date = FixedDate;
  const audit = { storageWrites: 0, databaseOpens: 0, databaseDeletes: 0 };
  Object.defineProperty(window, "__v2PolishAudit", { value: audit });
  for (const name of ["setItem", "removeItem", "clear"]) {
    const original = Storage.prototype[name];
    Storage.prototype[name] = function (...args) { audit.storageWrites++; return Reflect.apply(original, this, args); };
  }
  for (const [name, key] of [["open", "databaseOpens"], ["deleteDatabase", "databaseDeletes"]]) {
    const original = IDBFactory.prototype[name];
    IDBFactory.prototype[name] = function (...args) { audit[key]++; return Reflect.apply(original, this, args); };
  }
}, fixedTime);
context.on("request", (request) => {
  const url = request.url();
  if (!url.startsWith("http://127.0.0.1:5182/") && !url.startsWith("ws://127.0.0.1:5182/") && !url.startsWith("data:") && !url.startsWith("blob:")) externalRequests.push(url.split("?")[0]);
  if (url.startsWith("http://127.0.0.1:5182/") && /\/(?:api|rest\/v1|functions\/v1)\//.test(new URL(url).pathname)) businessRequests.push(new URL(url).pathname);
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
async function check(name, action) {
  await action(); checks.push(name); console.log(`PASS ${name}`);
}
async function noPersistence() {
  assert.deepEqual(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, databases: await indexedDB.databases(), audit: window.__v2PolishAudit })),
    { local: 0, session: 0, databases: [], audit: { storageWrites: 0, databaseOpens: 0, databaseDeletes: 0 } });
  assert.equal((await context.cookies()).length, 0);
}
async function painted() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function open(theme, screen, options = {}) {
  if (page.url().startsWith(base)) await noPersistence();
  const url = new URL(base);
  url.searchParams.set("theme", theme);
  if (screen !== "home") url.searchParams.set("screen", screen);
  for (const [key, value] of Object.entries(options)) url.searchParams.set(key, String(value));
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.locator(".v2-demo-bar").waitFor();
  assert.equal(page.url(), url.href);
  assert.equal(await page.title(), "谱序 RECIPIO · UI V2 隔离样板");
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator(".v2-app").getAttribute("data-v2-theme"), theme);
  if (screen === "home") assert.equal(await page.getByRole("searchbox", { name: "搜索我的菜谱", exact: true }).inputValue(), "");
  if (screen === "detail") await page.getByRole("heading", { name: options.scenario === "long" ? /可乐鸡翅/ : "可乐鸡翅", exact: !options.scenario }).waitFor();
  if (screen === "cooking") {
    assert.equal(await page.locator(".v2-cooking").getAttribute("aria-label"), "引导烹饪");
    await page.getByText("第 1 步／共 6 步", { exact: true }).waitFor();
    for (let index = 0; index < 2; index++) await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
  }
  await page.locator(".v2-page-region,.v2-detail-scroll,.v2-cook-scroll").evaluateAll((nodes) => nodes.forEach((node) => { node.scrollTop = 0; }));
  await painted();
  assert(await page.locator(".v2-app").innerText());
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
}
async function metrics(theme, screen, width = 390, scale = 100) {
  const layout = await page.evaluate(() => {
    const measure = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { text: node.textContent.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        fontSize: parseFloat(style.fontSize), fontWeight: style.fontWeight, lineHeight: style.lineHeight, color: style.color, background: style.backgroundColor,
        borderColor: style.borderColor, borderWidth: style.borderWidth, boxShadow: style.boxShadow, padding: style.padding, gap: style.gap,
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop };
    };
    const one = (selector) => measure(document.querySelector(selector));
    return { topControls: one(".v2-home-controls"), header: one(".v2-home-header"), search: one(".v2-search"), quickArea: one(".v2-entry-grid"),
      quickActions: [...document.querySelectorAll(".v2-entry-card")].map(measure), recentTitle: one("#recent-title"), cover: one(".v2-cover"),
      detailTitle: one(".v2-detail-title"), detailMeta: one(".v2-meta"), calories: measure([...document.querySelectorAll(".v2-meta > div")].find((node) => node.textContent.includes("kcal"))?.querySelector("dd")),
      metaValues: [...document.querySelectorAll(".v2-meta dd")].map(measure),
      firstSection: one(".v2-content-section"), detailFooter: one(".v2-bottom-actions"), cookHeader: one(".v2-cook-header"), cookTitle: one(".v2-cook-scroll h1"),
      instruction: one(".v2-cook-instruction"), cookFooter: one(".v2-cook-footer"), footerButtons: [...document.querySelectorAll(".v2-cook-footer button,.v2-bottom-actions button")].map(measure),
      scrollRegions: [...document.querySelectorAll(".v2-page-region,.v2-detail-scroll,.v2-cook-scroll")].map(measure), rootFontSize: getComputedStyle(document.documentElement).fontSize,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth } };
  });
  return { theme, screen, width, scale, url: page.url(), ...layout };
}
async function capture(theme, screen) {
  await open(theme, screen);
  const record = await metrics(theme, screen);
  assert(record.scrollRegions.every((region) => region.scrollTop === 0), "Comparison must start at scrollTop 0");
  const directory = path.join(phaseOut, theme);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${screen}-390.png`), fullPage: false, animations: "disabled" });
  records.push(record);
}
function alpha(color) {
  const values = color.match(/[\d.]+/g)?.map(Number);
  assert(values?.length >= 3, `Unexpected computed color ${color}`);
  return values.length === 4 ? values[3] : 1;
}
function noHorizontalOverflow(record) {
  const v = record.viewport;
  assert(v.bodyWidth <= v.width + 1 && v.documentWidth <= v.width + 1 && record.scrollRegions.every((region) => region.scrollWidth <= region.clientWidth + 1), JSON.stringify(record));
}
function touchTargets(buttons) {
  for (const button of buttons) assert(button.width >= 48 && button.height >= 48 && button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1, JSON.stringify(button));
}
function homeHierarchy(record) {
  noHorizontalOverflow(record);
  assert.equal(record.quickActions.length, 2);
  touchTargets(record.quickActions);
  const [primary, secondary] = record.quickActions;
  // The two entries now have visibly different emphasis, not twin card fills.
  assert(primary.background !== secondary.background && alpha(primary.background) > alpha(secondary.background), JSON.stringify({ primary, secondary }));
  assert(primary.bottom <= secondary.y + 1 || secondary.bottom <= primary.y + 1 || primary.right <= secondary.x + 1 || secondary.right <= primary.x + 1, "Quick-action touch targets overlap");
}
function detailHierarchy(record) {
  noHorizontalOverflow(record);
  touchTargets(record.footerButtons);
  assert(record.detailTitle.fontSize >= record.calories.fontSize * 1.6, JSON.stringify(record));
  assert(Number(record.detailTitle.fontWeight) > Number(record.calories.fontWeight), "Recipe title must be heavier than its calorie estimate");
  const otherValues = record.metaValues.filter((value) => !value.text.includes("kcal"));
  assert(otherValues.every((value) => value.fontSize > record.calories.fontSize), "Calories must stay quieter than time/servings");
}
function cookingHierarchy(record) {
  noHorizontalOverflow(record);
  touchTargets(record.footerButtons);
  assert(record.instruction.fontSize >= record.cookTitle.fontSize * 1.2, JSON.stringify(record));
  const [previous, next] = record.footerButtons;
  assert.equal(previous.text, "上一步"); assert.equal(next.text, "下一步");
  assert(alpha(previous.background) < alpha(next.background) && Number(previous.fontWeight) <= Number(next.fontWeight), JSON.stringify({ previous, next }));
}
async function setLargeText() {
  await page.getByRole("button", { name: "样板设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "样板设置", exact: true });
  await dialog.getByRole("checkbox", { name: "200% 字号", exact: true }).check();
  await dialog.getByRole("button", { name: "查看样板", exact: true }).click();
  await page.locator(".v2-portal .v2-sheet").waitFor({ state: "detached" });
  assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).fontSize), "32px");
  await painted();
}
async function unobscuredEnd(theme, screen, width, scale = 100) {
  const regionSelector = screen === "home" ? ".v2-page-region" : screen === "detail" ? ".v2-detail-scroll" : ".v2-cook-scroll";
  const endSelector = screen === "home" ? ".v2-recipe-row:last-child" : screen === "detail" ? ".v2-content-section:last-child" : ".v2-cook-scroll > :last-child";
  const footerSelector = screen === "home" ? ".v2-bottom-nav" : screen === "detail" ? ".v2-bottom-actions" : ".v2-cook-footer";
  await page.locator(regionSelector).evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await painted();
  const result = await page.evaluate(({ regionSelector, endSelector, footerSelector }) => {
    const region = document.querySelector(regionSelector), end = document.querySelector(endSelector), footer = document.querySelector(footerSelector);
    const rr = region.getBoundingClientRect(), er = end.getBoundingClientRect(), fr = footer.getBoundingClientRect(), style = getComputedStyle(region);
    const visible = { left: rr.left + region.clientLeft, right: rr.left + region.clientLeft + region.clientWidth, top: rr.top + region.clientTop, bottom: Math.min(fr.top, rr.top + region.clientTop + region.clientHeight) };
    const walker = document.createTreeWalker(end, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let text = walker.nextNode(); text; text = walker.nextNode()) if (text.textContent.trim()) last = text;
    let tail = null;
    if (last) {
      const length = last.textContent.trimEnd().length, range = document.createRange();
      range.setStart(last, length - 1); range.setEnd(last, length);
      const tr = range.getBoundingClientRect(); tail = { left: tr.left, right: tr.right, top: tr.top, bottom: tr.bottom };
    }
    return { scrollTop: region.scrollTop, maxScroll: region.scrollHeight - region.clientHeight,
      scrollbarWidth: region.offsetWidth - region.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
      end: { left: er.left, right: er.right, top: er.top, bottom: er.bottom }, footer: { top: fr.top, bottom: fr.bottom }, visible, tail,
      paddingBottom: parseFloat(style.paddingBottom), scrollWidth: region.scrollWidth, clientWidth: region.clientWidth };
  }, { regionSelector, endSelector, footerSelector });
  assert(Math.abs(result.scrollTop - result.maxScroll) <= 1, JSON.stringify(result));
  assert(result.end.bottom <= result.visible.bottom - 8, "Final content needs at least 8px of actual clearance above the floating controls: " + JSON.stringify(result));
  assert(result.end.left >= result.visible.left - 1 && result.end.right <= result.visible.right + 1 && result.scrollWidth <= result.clientWidth + 1, "Content crosses the actual scrollbar boundary: " + JSON.stringify(result));
  if (result.tail) assert(result.tail.top >= result.visible.top - 1 && result.tail.bottom <= result.visible.bottom - 8 && result.tail.left >= result.visible.left - 1 && result.tail.right <= result.visible.right + 1, JSON.stringify(result));
  clearance.push({ theme, screen, width, scale, ...result });
}
async function closeSheetRestores(trigger, title) {
  const original = await trigger.elementHandle();
  try {
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await dialog.waitFor(); await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction((node) => node.isConnected && document.activeElement === node, original, { polling: "raf", timeout: 2000 });
  } finally { await original.dispose(); }
}
async function preservedFlow(theme) {
  await open(theme, "home");
  const group = page.getByRole("group", { name: "菜谱快捷操作", exact: true });
  await closeSheetRestores(group.getByRole("button", { name: /添加菜谱/ }), "添加菜谱");
  await closeSheetRestores(group.getByRole("button", { name: /帮我找做法/ }), "样板功能说明");
  await page.getByRole("searchbox", { name: "搜索我的菜谱", exact: true }).fill("鸡翅");
  assert.equal(await page.getByRole("button", { name: /^打开/ }).count(), 1);
  await page.getByRole("button", { name: "打开可乐鸡翅", exact: true }).click();
  await page.getByRole("heading", { name: "可乐鸡翅", exact: true }).waitFor();
  await closeSheetRestores(page.getByRole("button", { name: "编辑", exact: true }), "样板功能说明");
  await page.getByRole("button", { name: "开始烹饪", exact: true }).click();
  await page.getByText("第 1 步／共 6 步", { exact: true }).waitFor();
  assert(await page.getByRole("button", { name: "上一步", exact: true }).isDisabled());
  for (let index = 0; index < 2; index++) await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
  const instruction = await page.locator(".v2-cook-instruction").innerText();
  await closeSheetRestores(page.getByRole("button", { name: "查看食材", exact: true }), "食材清单");
  await page.getByRole("button", { name: "上一步", exact: true }).click();
  await page.getByText("第 2 步／共 6 步", { exact: true }).waitFor();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  assert.equal(await page.locator(".v2-cook-instruction").innerText(), instruction);
  await page.getByRole("button", { name: "退出引导", exact: true }).click();
  await page.getByRole("heading", { name: "可乐鸡翅", exact: true }).waitFor();
}
try {
  for (const theme of themes) for (const screen of screens) await check(`${phase} ${theme} ${screen} 390: default state captured`, () => capture(theme, screen));
  let baselineEvidence;
  if (!captureBefore) {
    const baselineBytes = await readFile(path.join(out, "before/metrics.json"));
    const baseline = JSON.parse(baselineBytes);
    assert.equal(baseline.status, "PASS"); assert.equal(baseline.phase, "before");
    assert.equal(baseline.testedSource.baseRevision, baselineRevision); assert.equal(baseline.testedSource.dirtyAtRun, false);
    assert.deepEqual(baseline.settings, settings); assert.equal(baseline.fixedTime, fixedTime);
    assert.equal(baseline.records.length, 9);
    baselineEvidence = { metricsSha256: createHash("sha256").update(baselineBytes).digest("hex"), testedSource: baseline.testedSource, screenshotHashes: [] };
    for (const theme of themes) for (const screen of screens) {
      const relativePath = `${theme}/${screen}-390.png`, bytes = await readFile(path.join(out, "before", relativePath));
      baselineEvidence.screenshotHashes.push({ path: `before/${relativePath}`, sha256: createHash("sha256").update(bytes).digest("hex") });
      await check(`${theme} ${screen}: targeted visual hierarchy improves against frozen before`, async () => {
        const before = baseline.records.find((record) => record.theme === theme && record.screen === screen);
        const after = records.find((record) => record.theme === theme && record.screen === screen);
        if (screen === "home") {
          homeHierarchy(after);
          assert(after.topControls.height <= before.topControls.height - 12, "Sticky Home controls must be meaningfully thinner");
          assert(after.quickArea.height <= before.quickArea.height - 24, "Quick actions must release at least one text line of vertical space");
          assert(before.recentTitle.y - after.recentTitle.y >= 50, JSON.stringify({ before: before.recentTitle, after: after.recentTitle }));
        } else if (screen === "detail") {
          detailHierarchy(after);
          assert(Math.abs(after.cover.height - before.cover.height) <= 1 && Math.abs(after.cover.width / after.cover.height - 4 / 3) < .01, "Approved 4:3 cover framing must stay stable");
          assert(after.detailTitle.y < before.detailTitle.y && after.detailMeta.y < before.detailMeta.y && after.firstSection.y <= before.firstSection.y - 12, "Title, metadata and first content section must arrive earlier");
          assert(after.detailFooter.height <= before.detailFooter.height, "Detail action bar must not grow");
          assert.equal(after.detailTitle.text, before.detailTitle.text); assert.equal(after.detailMeta.text, before.detailMeta.text);
        } else {
          cookingHierarchy(after);
          assert(after.cookFooter.height <= before.cookFooter.height, "Cooking action bar must not grow");
          assert.equal(after.instruction.text, before.instruction.text);
        }
        comparisons.push({ theme, screen, before, after });
      });
    }
    // Existing verification scripts own the full screen/theme/width matrix.
    // These extra samples target the changed quick actions and floating-footer clearance.
    for (const theme of themes) {
      for (const width of [320, 390, 412, 768]) await check(`${theme} Home ${width}: compact asymmetric actions and scrollbar-aware content end`, async () => {
        await page.setViewportSize({ width, height: 844 }); await open(theme, "home");
        const record = await metrics(theme, "home", width); homeHierarchy(record);
        assert.equal(await page.getByRole("group", { name: "菜谱快捷操作", exact: true }).count(), 1);
        await unobscuredEnd(theme, "home", width); records.push(record);
      });
      await page.setViewportSize({ width: 320, height: 844 });
      for (const screen of ["home", "detail", "cooking"]) await check(`${theme} ${screen} 320 200%: hierarchy, touch targets and real final-content clearance`, async () => {
        await open(theme, screen, { scenario: "long" }); await setLargeText();
        const record = await metrics(theme, screen, 320, 200);
        if (screen === "home") homeHierarchy(record);
        else if (screen === "detail") detailHierarchy(record);
        else cookingHierarchy(record);
        await unobscuredEnd(theme, screen, 320, 200); records.push(record);
        await page.screenshot({ path: path.join(phaseOut, theme, `${screen}-long-200-text-320.png`), fullPage: false, animations: "disabled" });
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await check(`${theme}: changed quick actions, edit, search and Guided previous/next retain their original flows`, () => preservedFlow(theme));
    }
  }
  await check("all documents: no persistence, external requests, business requests or runtime errors", async () => {
    await noPersistence(); assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []); assert.deepEqual(businessRequests, []);
  });
  const finishedSource = await uiV2EvidenceSource(root);
  assert.equal(finishedSource.fingerprint, testedSource.fingerprint, "Showcase/QA source changed during evidence capture");
  assert.equal(finishedSource.baseRevision, testedSource.baseRevision, "HEAD changed during evidence capture");
  assert.equal(createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"), verificationScript.sha256, "Polish verification script changed during evidence capture");
  const report = { status: "PASS", phase, date: new Date().toISOString(), settings, fixedTime, baselineRevision, baselineEvidence, testedSource, verificationScript,
    browserAvailability: "Browser plugin not available; installed Playwright used as authorized", browser: browser.version(), checks, checkCount: checks.length, records, comparisons, clearance, errors, externalRequests, businessRequests,
    notRun: ["user/ChatGPT visual acceptance", "Android WebView", "IME", "TalkBack", "physical device/OEM", "production G2-G4"] };
  await writeFile(path.join(phaseOut, "metrics.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: "PASS", phase, checks: checks.length, evidence: phaseOut }));
} catch (error) {
  await page.screenshot({ path: path.join(phaseOut, "failure.png"), animations: "disabled" }).catch(() => {});
  await writeFile(path.join(phaseOut, "failure.json"), JSON.stringify({ status: "FAIL", phase, testedSource, error: String(error), checks, records, comparisons, clearance, errors, externalRequests, businessRequests }, null, 2));
  throw error;
} finally { await browser.close(); }
