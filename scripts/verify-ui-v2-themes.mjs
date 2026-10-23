import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiV2EvidenceSource } from "./ui-v2-evidence-source.mjs";

// Use installed runtimes only. This script never installs packages or browsers.
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = process.argv.find((value) => value.startsWith("--runtime="))?.slice(10);
const sharpRuntime = process.argv.find((value) => value.startsWith("--sharp-runtime="))?.slice(16);
const runtimePaths = [root, runtime].filter(Boolean);
const { chromium } = require(require.resolve("playwright", { paths: runtimePaths }));
const sharp = require(require.resolve("sharp", { paths: [sharpRuntime, ...runtimePaths].filter(Boolean) }));
const base = "http://127.0.0.1:5182/ui-v2-showcase/";
const out = path.resolve(root, "output/playwright/ui-v2/theme-refresh");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const testedSource = await uiV2EvidenceSource(root);
const themes = {
  "warm-ivory": {
    label: "米色 · Warm Ivory", canvas: "#f6f4ef", surface: "#fbfaf7", muted: "#f0ece5",
    text: "#1b1b1d", secondary: "#6e6a65", caption: "#716d65", action: "#49684f",
    "action-pressed": "#3c5742", soft: "#e6efe5", border: "#dedad3", control: "#858a82", cook: "#202420",
    glassRgb: [251, 250, 247], navigationAlpha: 0.74, sheetAlpha: 0.88, blur: 24, saturation: 1.2,
  },
  "pure-glass": {
    label: "白色 · Pure Glass", canvas: "#f7f9fb", surface: "#ffffff", muted: "#eef2f5",
    text: "#171b20", secondary: "#59616a", caption: "#626b75", action: "#2d6266",
    "action-pressed": "#214b4f", soft: "#e4eff0", border: "#dee5e9", control: "#7c8993", cook: "#19242a",
    glassRgb: [255, 255, 255], navigationAlpha: 0.7, sheetAlpha: 0.86, blur: 26, saturation: 1.25,
  },
  "soft-sage": {
    label: "淡绿色 · Soft Sage", canvas: "#eff5ee", surface: "#fafcf9", muted: "#e3ede2",
    text: "#1b2820", secondary: "#56695c", caption: "#5b6c60", action: "#365e45",
    "action-pressed": "#274a34", soft: "#dce9db", border: "#cfdccf", control: "#788f7b", cook: "#1d2b22",
    glassRgb: [248, 252, 247], navigationAlpha: 0.74, sheetAlpha: 0.88, blur: 24, saturation: 1.2,
  },
};
const tokenNames = ["canvas", "surface", "muted", "text", "secondary", "caption", "action", "action-pressed", "soft", "border", "control", "cook"];
const checks = [], errors = [], external = [], businessRequests = [], materialEvidence = [], contrastEvidence = [];
const layoutBaselines = new Map();
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  const audit = { storageWrites: 0, databaseOpens: 0, databaseDeletes: 0 };
  Object.defineProperty(window, "__v2QaStorageAudit", { value: audit });
  for (const name of ["setItem", "removeItem", "clear"]) {
    const original = Storage.prototype[name];
    Storage.prototype[name] = function (...args) { audit.storageWrites++; return Reflect.apply(original, this, args); };
  }
  const open = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (...args) { audit.databaseOpens++; return Reflect.apply(open, this, args); };
  const remove = IDBFactory.prototype.deleteDatabase;
  IDBFactory.prototype.deleteDatabase = function (...args) { audit.databaseDeletes++; return Reflect.apply(remove, this, args); };
});
context.on("request", (request) => {
  const url = request.url();
  if (!url.startsWith("http://127.0.0.1:5182/") && !url.startsWith("ws://127.0.0.1:5182/") && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url.split("?")[0]);
  if (url.startsWith("http://127.0.0.1:5182/") && /\/(?:api|rest\/v1|functions\/v1)\//.test(new URL(url).pathname)) businessRequests.push(new URL(url).pathname);
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
async function check(name, action) {
  await action();
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function screenshot(theme, name, options = {}) {
  const directory = path.join(out, theme, "themes");
  await mkdir(directory, { recursive: true });
  return page.screenshot({ path: path.join(directory, `${name}.png`), ...options });
}
async function noPersistence() {
  const storage = await page.evaluate(async () => ({
    local: localStorage.length, session: sessionStorage.length, databases: await indexedDB.databases(), audit: window.__v2QaStorageAudit,
  }));
  assert.deepEqual(storage, { local: 0, session: 0, databases: [], audit: { storageWrites: 0, databaseOpens: 0, databaseDeletes: 0 } });
  assert.equal((await context.cookies()).length, 0);
}
async function open(theme, screen = "home", options = {}) {
  // Check each document before leaving it; otherwise a later reload could hide writes.
  if (page.url().startsWith(base)) await noPersistence();
  const url = new URL(base);
  for (const [name, value] of Object.entries({ theme, screen, ...options })) url.searchParams.set(name, String(value));
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.locator(".v2-demo-bar").waitFor();
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
  assert.equal(await page.title(), "谱序 RECIPIO · UI V2 隔离样板");
  await appearance(Object.hasOwn(themes, theme) ? theme : "warm-ivory");
}
async function appearance(theme, { solid = false, darkPortal } = {}) {
  const roots = await page.locator(".v2-app,.v2-cooking,.v2-portal").evaluateAll((nodes) => nodes.map((node) => ({
    classes: node.className, theme: node.getAttribute("data-v2-theme"), solid: node.getAttribute("data-v2-solid"), dark: node.getAttribute("data-v2-dark"),
  })));
  assert(roots.some((node) => node.classes.includes("v2-app")));
  assert(roots.every((node) => node.theme === theme && (node.solid === "true") === solid), JSON.stringify(roots));
  assert(roots.filter((node) => node.classes.includes("v2-cooking")).every((node) => node.dark === "true"), JSON.stringify(roots));
  if (darkPortal !== undefined) {
    const portals = roots.filter((node) => node.classes.includes("v2-portal"));
    assert(portals.length > 0);
    assert(portals.every((node) => (node.dark === "true") === darkPortal), JSON.stringify(portals));
  }
}
async function controls() {
  const dialog = page.getByRole("dialog", { name: "样板设置", exact: true });
  if (!await dialog.isVisible()) await page.getByRole("button", { name: "样板设置", exact: true }).click();
  await dialog.waitFor();
  return dialog;
}
async function changeTheme(theme, { close = true, solid = false } = {}) {
  const dialog = await controls();
  const previous = await dialog.elementHandle();
  const app = await page.locator(".v2-app").elementHandle();
  try {
    const group = dialog.getByRole("group", { name: "外观主题", exact: true });
    const radio = group.getByRole("radio", { name: themes[theme].label, exact: true });
    // Click even an already checked option so the focus-retention assertion has
    // a real keyboard-focus target when the selected theme is unchanged.
    await radio.click();
    assert(await radio.isChecked());
    assert(await dialog.evaluate((node, original) => node === original && node.isConnected, previous), "Theme changed the live settings dialog identity");
    assert(await page.locator(".v2-app").evaluate((node, original) => node === original && node.isConnected, app), "Theme remounted the app root");
    await appearance(theme, { solid });
    if (close) await dialog.getByRole("button", { name: "查看样板", exact: true }).click();
  } finally { await previous.dispose(); await app.dispose(); }
}
async function setLargeText() {
  const dialog = await controls();
  await dialog.getByRole("checkbox", { name: "200% 字号", exact: true }).check();
  await dialog.getByRole("button", { name: "查看样板", exact: true }).click();
  assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).fontSize), "32px");
}
async function setSolid(theme, value) {
  const dialog = await controls();
  await dialog.getByRole("checkbox", { name: "实体玻璃回退", exact: true }).setChecked(value);
  await appearance(theme, { solid: value });
  await dialog.getByRole("button", { name: "查看样板", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  // The background deliberately stays opaque while Base UI still owns a modal.
  await page.locator(".v2-portal .v2-sheet").waitFor({ state: "detached" });
}
async function noOverflow() {
  const result = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth,
    regions: [...document.querySelectorAll(".v2-page-region,.v2-detail-scroll,.v2-cook-scroll,.v2-sheet")].map((node) => ({ width: node.clientWidth, scroll: node.scrollWidth })) }));
  assert(result.body <= result.width + 1 && result.document <= result.width + 1 && result.regions.every((region) => region.scroll <= region.width + 1), JSON.stringify(result));
}
async function sameLayout(theme, screen, width) {
  const signature = await page.locator(".v2-viewport,.v2-home-controls,.v2-search,.v2-entry-grid,.v2-bottom-nav,.v2-detail-body,.v2-bottom-actions,.v2-cook-header,.v2-cook-footer").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { className: node.className, rect: [rect.x, rect.y, rect.width, rect.height] };
  }));
  const key = `${screen}:${width}`;
  if (theme === "warm-ivory") layoutBaselines.set(key, signature);
  else {
    const baseline = layoutBaselines.get(key);
    assert.equal(signature.length, baseline.length);
    assert(signature.every((item, i) => item.className === baseline[i].className && item.rect.every((value, j) => Math.abs(value - baseline[i].rect[j]) <= 1)), JSON.stringify({ baseline, signature }));
  }
}
async function readableEnd(locator, regionSelector, controlsSelector = ".v2-bottom-actions,.v2-cook-footer") {
  const result = await locator.evaluate((node, { regionSelector: selector, controlsSelector: footerSelector }) => {
    const region = node.closest(selector);
    if (!region) throw new Error(`Missing scroll region: ${selector}`);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let text = walker.nextNode(); text; text = walker.nextNode()) if (text.textContent.trim()) last = text;
    if (!last) throw new Error("Expected readable text");
    const end = last.textContent.trimEnd().length, range = document.createRange();
    range.setStart(last, end - 1); range.setEnd(last, end);
    const regionRect = region.getBoundingClientRect();
    let bottom = Math.min(innerHeight, regionRect.top + region.clientTop + region.clientHeight);
    if (footerSelector) for (const footer of document.querySelectorAll(footerSelector)) {
      const rect = footer.getBoundingClientRect();
      if (rect.width && rect.height && rect.top > regionRect.top && rect.top < bottom && rect.right > regionRect.left && rect.left < regionRect.right) bottom = rect.top;
    }
    const top = Math.max(0, regionRect.top + region.clientTop);
    region.scrollTop += range.getBoundingClientRect().bottom - bottom + 12;
    const tail = range.getBoundingClientRect(), style = getComputedStyle(node);
    return { text: node.textContent, scrollTop: region.scrollTop, visible: tail.width > 0 && tail.height > 0 && tail.top >= top - 1 && tail.bottom <= bottom + 1 && tail.left >= -1 && tail.right <= innerWidth + 1,
      unclipped: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 && style.textOverflow !== "ellipsis" && style.webkitLineClamp === "none",
      tail: { top: tail.top, bottom: tail.bottom, left: tail.left, right: tail.right }, top, bottom };
  }, { regionSelector, controlsSelector });
  assert(result.visible && result.unclipped, JSON.stringify(result));
  return result;
}
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      viewportWidth: innerWidth, viewportHeight: innerHeight, clipped: node.scrollHeight > node.clientHeight + 1 };
  });
  assert(result.width >= 48 && result.height >= 48 && result.left >= -1 && result.right <= result.viewportWidth + 1 && result.top >= -1 && result.bottom <= result.viewportHeight + 1 && !result.clipped, JSON.stringify(result));
}
function color(value) {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  assert(channels?.length >= 3, `Unsupported computed color: ${value}`);
  return [...channels.slice(0, 3), channels[3] ?? 1];
}
function composite(foreground, background) { return foreground.slice(0, 3).map((channel, i) => channel * foreground[3] + background[i] * (1 - foreground[3])); }
function luminance(rgb) {
  const values = rgb.map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
async function localContrast(theme, locator, surfaceSelector, minimum = 4.5) {
  const computed = await locator.evaluate((node, selector) => ({ text: getComputedStyle(node).color, background: getComputedStyle(node.closest(selector)).backgroundColor }), surfaceSelector);
  const text = color(computed.text), tint = color(computed.background);
  const ratios = [0, 255].map((value) => {
    const background = composite(tint, [value, value, value]);
    return contrast(composite(text, background), background);
  });
  const record = { theme, target: await locator.getAttribute("class"), ...computed, contrastOverBlack: ratios[0], contrastOverWhite: ratios[1], minimum };
  contrastEvidence.push(record);
  assert(Math.min(...ratios) >= minimum, JSON.stringify(record));
}
async function frozenMaterial(theme, locator, kind) {
  const palette = themes[theme];
  const result = await locator.evaluate((node) => { const style = getComputedStyle(node); return { background: style.backgroundColor, blur: style.backdropFilter || style.webkitBackdropFilter }; });
  const actual = color(result.background), blur = result.blur.match(/blur\(([\d.]+)px\)/), saturation = result.blur.match(/saturate\(([\d.]+)(%?)\)/);
  assert.deepEqual(actual.slice(0, 3), palette.glassRgb, JSON.stringify(result));
  assert(Math.abs(actual[3] - palette[kind === "sheet" ? "sheetAlpha" : "navigationAlpha"]) < 0.001, JSON.stringify(result));
  assert(blur && Number(blur[1]) === palette.blur, JSON.stringify(result));
  assert(saturation && Math.abs(Number(saturation[1]) / (saturation[2] ? 100 : 1) - palette.saturation) < 0.001, JSON.stringify(result));
}
async function layers({ solid = false, overlay = false } = {}) {
  const result = await page.locator(".v2-app *,.v2-portal *").evaluateAll((nodes) => nodes.flatMap((node) => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    const blur = style.backdropFilter || style.webkitBackdropFilter || "none";
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight) return [];
    return [{ className: node.getAttribute("class") ?? "", blur, background: style.backgroundColor, inApp: !!node.closest(".v2-app"),
      large: rect.width >= Math.min(innerWidth * 0.55, 300) && rect.height >= 48 }];
  }));
  const blurred = result.filter((item) => item.blur !== "none");
  if (solid) assert.deepEqual(blurred, [], JSON.stringify(blurred));
  if (overlay) assert(!blurred.some((item) => item.inApp), JSON.stringify(blurred));
  assert(blurred.filter((item) => item.large).length <= 2, JSON.stringify(blurred));
  if (solid) {
    const surfaces = await page.locator(".v2-app .v2-glass,.v2-portal .v2-sheet").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    assert(surfaces.length > 0);
    assert(surfaces.every((value) => color(value)[3] === 1), JSON.stringify(surfaces));
  }
}
async function pixelDifference(first, second) {
  const a = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(second).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(a.info, b.info);
  let total = 0, changed = 0;
  for (let i = 0; i < a.data.length; i++) { const difference = Math.abs(a.data[i] - b.data[i]); total += difference; if (difference > 2) changed++; }
  return { meanChannelChange: total / a.data.length, changedChannelFraction: changed / a.data.length };
}
async function glassMovement(theme, name, targetSelector, regionSelector, imageSelector) {
  const target = page.locator(targetSelector), region = page.locator(regionSelector);
  const placement = await page.evaluate(({ targetSelector: targetQuery, regionSelector: regionQuery, imageSelector: imageQuery }) => {
    const target = document.querySelector(targetQuery), region = document.querySelector(regionQuery);
    const targetRect = target.getBoundingClientRect(), max = region.scrollHeight - region.clientHeight;
    const images = [...document.querySelectorAll(imageQuery)].filter((node) => node.complete && node.naturalWidth > 0);
    if (!images.length) throw new Error(`No decoded real content images: ${imageQuery}`);
    let candidate = null;
    for (const image of images) {
      const rect = image.getBoundingClientRect();
      const desired = Math.max(0, Math.min(max, region.scrollTop + (rect.top + rect.bottom - targetRect.top - targetRect.bottom) / 2));
      const top = rect.top - (desired - region.scrollTop), bottom = rect.bottom - (desired - region.scrollTop);
      const overlap = Math.max(0, Math.min(bottom, targetRect.bottom) - Math.max(top, targetRect.top));
      if (!candidate || overlap > candidate.overlap) candidate = { image, desired, overlap };
    }
    region.scrollTop = candidate.desired;
    const imageRect = candidate.image.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    return { scrollTop: region.scrollTop, maxScroll: max, overlap: { width: Math.min(rect.right, imageRect.right) - Math.max(rect.left, imageRect.left), height: Math.min(rect.bottom, imageRect.bottom) - Math.max(rect.top, imageRect.top) },
      image: candidate.image.currentSrc, blur: style.backdropFilter || style.webkitBackdropFilter, background: style.backgroundColor,
      clip: { x: Math.ceil(rect.x + 2), y: Math.ceil(rect.y + 2), width: Math.floor(rect.width - 4), height: Math.floor(rect.height - 4) } };
  }, { targetSelector, regionSelector, imageSelector });
  assert(placement.overlap.width >= 24 && placement.overlap.height >= 16 && placement.maxScroll > 0, JSON.stringify(placement));
  assert(placement.blur !== "none" && /blur\(/.test(placement.blur), JSON.stringify(placement));
  assert(color(placement.background)[3] > 0 && color(placement.background)[3] < 1, JSON.stringify(placement));
  const first = await screenshot(theme, `${name}-scroll-before`, { clip: placement.clip });
  const next = placement.scrollTop + 40 <= placement.maxScroll ? placement.scrollTop + 40 : Math.max(0, placement.scrollTop - 40);
  assert(Math.abs(next - placement.scrollTop) >= 16, "Expected real content scroll under glass");
  await region.evaluate((node, value) => { node.scrollTop = value; }, next);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const second = await screenshot(theme, `${name}-scroll-after`, { clip: placement.clip });
  const difference = await pixelDifference(first, second);
  assert(difference.meanChannelChange > 0.15 && difference.changedChannelFraction > 0.01, JSON.stringify({ placement, difference }));
  materialEvidence.push({ theme, name, placement, scrollAfter: next, difference });
  await layers();
  assert(await target.isVisible());
}
async function openAndInspect(theme, trigger, title, { dark = false, solid = false, screenshotName } = {}) {
  const expectedFocus = await trigger.elementHandle();
  assert(expectedFocus, "Expected the original Sheet trigger");
  try {
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await dialog.waitFor();
    await appearance(theme, { solid, darkPortal: dark });
    await layers({ solid, overlay: true });
    if (!solid && !dark) await frozenMaterial(theme, dialog, "sheet");
    await localContrast(theme, dialog.locator(".v2-sheet-header .v2-section-title"), ".v2-sheet");
    await localContrast(theme, dialog.locator(".v2-sheet-header .v2-secondary"), ".v2-sheet");
    await noOverflow();
    if (screenshotName) await screenshot(theme, screenshotName);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    // Base UI can finish focus restoration after the Portal becomes hidden.
    // Wait for the actual original element; never manufacture focus or sleep.
    await page.waitForFunction((node) => node.isConnected && node === document.activeElement,
      expectedFocus, { polling: "raf", timeout: 2000 });
    assert(await expectedFocus.evaluate((node) => node === document.activeElement));
  } finally { await expectedFocus.dispose(); }
}

try {
  await check("unknown URL theme safely falls back to Warm Ivory", async () => {
    await open("unrecognised-theme");
    await controls();
    assert(await page.getByRole("radio", { name: themes["warm-ivory"].label, exact: true }).isChecked());
    await page.keyboard.press("Escape");
  });
  for (const [theme, palette] of Object.entries(themes)) {
    await check(`${theme} frozen semantic tokens and common status colors`, async () => {
      await open(theme);
      const tokens = await page.locator(".v2-app").evaluate((node, names) => Object.fromEntries(names.map((name) => [name, getComputedStyle(node).getPropertyValue(`--v2-${name}`).trim().toLowerCase()])), tokenNames);
      for (const name of tokenNames) assert.equal(tokens[name], palette[name], `${theme}: --v2-${name}`);
      await frozenMaterial(theme, page.locator(".v2-bottom-nav"), "navigation");
      await localContrast(theme, page.locator(".v2-brand h1"), ".v2-app");
      await localContrast(theme, page.locator(".v2-entry-card > span:last-child").first(), ".v2-entry-card");
      await open(theme, "components");
      const badge = await page.locator(".v2-state-badge--explicit").evaluate((node) => ({ text: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
      assert.deepEqual(badge, { text: "rgb(73, 104, 79)", background: "rgb(230, 239, 229)" });
      await screenshot(theme, "components-390");
    });
    for (const width of [320, 390, 412, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const screen of ["home", "detail", "cooking"]) await check(`${theme} ${width} ${screen}: same layout and no overflow`, async () => {
        await open(theme, screen, { mode: "focus" });
        await noOverflow(); await sameLayout(theme, screen, width); await layers();
        if (screen === "cooking") {
          await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
          const actual = await page.locator(".v2-cooking").evaluate((node) => getComputedStyle(node).backgroundColor);
          const expected = palette.cook.match(/\w\w/g).map((value) => Number.parseInt(value, 16));
          assert.equal(actual, `rgb(${expected.join(", ")})`);
          await localContrast(theme, page.locator(".v2-cook-instruction"), ".v2-cooking");
        }
        if (width === 390) await screenshot(theme, `${screen}-390`);
      });
    }
    await page.setViewportSize({ width: 320, height: 844 });
    for (const screen of ["home", "detail", "cooking", "components"]) await check(`${theme} 320 ${screen} 200% long text and reachable actions`, async () => {
      await open(theme, screen, { scenario: "long" }); await setLargeText(); await noOverflow();
      if (screen === "detail" || screen === "cooking") {
        const instruction = page.locator(screen === "detail" ? ".v2-step-list > li:first-child p" : ".v2-cook-instruction");
        const result = await readableEnd(instruction, screen === "detail" ? ".v2-detail-scroll" : ".v2-cook-scroll");
        assert(result.text.endsWith("保持小火，观察鸡翅颜色与汤汁状态，必要时轻轻翻动。".repeat(14)));
        assert(result.scrollTop > 0);
        if (screen === "detail") await readableEnd(page.locator(".v2-notes"), ".v2-detail-scroll");
        for (const action of await page.locator(".v2-bottom-actions button,.v2-cook-footer button").all()) await reachable(action);
      }
      await screenshot(theme, `${screen}-long-200-text-320`);
    });
    await check(`${theme} 320 200% long ingredients: full amount, final row and safe close`, async () => {
      await open(theme, "cooking", { scenario: "long" }); await setLargeText();
      const trigger = page.getByRole("button", { name: "查看食材", exact: true }); await trigger.click();
      const dialog = page.getByRole("dialog", { name: "食材清单", exact: true }); await dialog.waitFor();
      await appearance(theme, { darkPortal: true }); await layers({ overlay: true });
      await localContrast(theme, dialog.locator(".v2-ingredients dd").first(), ".v2-sheet-body");
      const amount = await readableEnd(dialog.locator(".v2-ingredients dd").first(), ".v2-sheet", "");
      assert.equal(amount.text, "500 克，按实际使用量填写，不自动缩放");
      await readableEnd(dialog.locator(".v2-ingredients dd").last(), ".v2-sheet", "");
      await screenshot(theme, "ingredients-long-200-text-320");
      const close = dialog.getByRole("button", { name: "关闭食材清单", exact: true }); await reachable(close); await close.click();
      await dialog.waitFor({ state: "hidden" }); assert(await trigger.evaluate((node) => node === document.activeElement));
      await page.getByText("第 1 步／共 6 步", { exact: true }).waitFor();
    });
    await check(`${theme} no-image and title-only content remains complete`, async () => {
      for (const scenario of ["no-image", "title-only"]) {
        await open(theme, "detail", { scenario }); await noOverflow();
        assert.equal(await page.locator(".v2-detail-hero").count(), 0);
        await reachable(page.getByRole("button", { name: scenario === "title-only" ? "补充做法" : "开始烹饪", exact: true }));
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await check(`${theme} every Sheet/Dialog portal matches theme and pauses background blur`, async () => {
      await open(theme);
      await openAndInspect(theme, page.getByRole("button", { name: "新增菜谱", exact: true }), "添加菜谱", { screenshotName: "add-sheet-390" });
      await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
      await page.getByRole("dialog", { name: "添加菜谱", exact: true }).getByRole("button", { name: /手动录入/ }).click();
      await page.getByRole("dialog", { name: "样板功能说明", exact: true }).waitFor();
      await appearance(theme); await layers({ overlay: true }); await page.keyboard.press("Escape");
      await open(theme, "detail");
      await openAndInspect(theme, page.getByRole("button", { name: "更多菜谱操作", exact: true }), "菜谱操作");
      await openAndInspect(theme, page.getByRole("button", { name: "查看菜谱封面大图", exact: true }), "菜谱封面");
      await open(theme, "cooking", { mode: "focus" });
      await openAndInspect(theme, page.getByRole("button", { name: "查看食材", exact: true }), "食材清单", { dark: true, screenshotName: "ingredients-sheet-390" });
      await openAndInspect(theme, page.getByRole("button", { name: "查看步骤 3 大图", exact: true }), "步骤 3 图片", { dark: true });
      await open(theme, "components");
      await openAndInspect(theme, page.getByRole("button", { name: "打开食材 Sheet", exact: true }), "食材清单样例", { screenshotName: "component-sheet-390" });
      await openAndInspect(theme, page.getByRole("button", { name: "打开危险确认样例", exact: true }), "移除这份样例？", { screenshotName: "component-dialog-390" });
    });
    await check(`${theme} glass covers moving real Home, Detail and Cooking content`, async () => {
      await open(theme);
      await glassMovement(theme, "home-nav-glass", ".v2-bottom-nav", ".v2-page-region", ".v2-recipe-row img");
      await screenshot(theme, "home-glass-comparison");
      const glass = await page.locator(".v2-bottom-nav").screenshot();
      await setSolid(theme, true); await layers({ solid: true });
      await screenshot(theme, "home-solid-comparison");
      const solid = await page.locator(".v2-bottom-nav").screenshot();
      const difference = await pixelDifference(glass, solid);
      assert(difference.meanChannelChange > 0.2, JSON.stringify(difference));
      materialEvidence.push({ theme, name: "same-state-glass-versus-solid", difference });
      await openAndInspect(theme, page.getByRole("button", { name: "新增菜谱", exact: true }), "添加菜谱", { solid: true, screenshotName: "add-sheet-solid-390" });
      await setSolid(theme, false);
      await glassMovement(theme, "home-header-glass", ".v2-home-controls", ".v2-page-region", ".v2-recent-card img");
      await open(theme, "detail");
      await glassMovement(theme, "detail-footer-glass", ".v2-bottom-actions", ".v2-detail-scroll", ".v2-step-image");
      await open(theme, "cooking", { mode: "focus" });
      await glassMovement(theme, "cooking-footer-glass", ".v2-cook-footer", ".v2-cook-scroll", ".v2-cook-image");
      await setSolid(theme, true); await layers({ solid: true });
      await openAndInspect(theme, page.getByRole("button", { name: "查看食材", exact: true }), "食材清单", { solid: true, dark: true, screenshotName: "ingredients-sheet-solid-390" });
      await open(theme, "components");
      await page.locator(".v2-material-control").scrollIntoViewIfNeeded();
      await glassMovement(theme, "component-material-glass", ".v2-material-control", ".v2-material-scroll", ".v2-material-scroll img");
      await openAndInspect(theme, page.getByRole("button", { name: "打开材质样例浮层", exact: true }), "食材清单样例");
    });
    await check(`${theme} Reduced Motion disables actual animations and transitions`, async () => {
      await page.emulateMedia({ reducedMotion: "reduce" }); await open(theme, "components");
      const styles = await page.locator(".v2-button,.v2-spinner,.v2-page-region").evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node);
        return { className: node.getAttribute("class") ?? "", animationName: style.animationName, animationDuration: style.animationDuration, transitionDuration: style.transitionDuration, scrollBehavior: style.scrollBehavior };
      }));
      assert(styles.some((item) => item.className.includes("v2-spinner")));
      assert(styles.every((item) => item.animationName.split(",").every((name) => name.trim() === "none") && item.transitionDuration.split(",").every((duration) => Number.parseFloat(duration) === 0) && item.scrollBehavior === "auto"), JSON.stringify(styles));
      assert.equal(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length), 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    });
  }
  await check("hot theme changes keep search, duration filter and selected recipe", async () => {
    await open("warm-ivory", "library");
    await page.getByRole("searchbox", { name: "搜索我的菜谱", exact: true }).fill("鸭");
    await page.getByRole("button", { name: "30–60 分钟", exact: true }).click();
    for (const theme of Object.keys(themes)) {
      await changeTheme(theme);
      assert.equal(await page.getByRole("searchbox", { name: "搜索我的菜谱", exact: true }).inputValue(), "鸭");
      assert.equal(await page.getByRole("button", { name: "30–60 分钟", exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await page.getByRole("button", { name: /^打开/ }).count(), 1);
    }
    await page.getByRole("button", { name: "打开啤酒鸭", exact: true }).click();
    for (const theme of Object.keys(themes)) { await changeTheme(theme); await page.getByRole("heading", { name: "啤酒鸭", exact: true }).waitFor(); }
    await page.getByRole("button", { name: "返回菜谱", exact: true }).click();
    assert.equal(await page.getByRole("searchbox", { name: "搜索我的菜谱", exact: true }).inputValue(), "鸭");
  });
  await check("hot theme changes preserve Guided step, live settings dialog, focus and completion", async () => {
    await open("warm-ivory", "cooking");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "下一步", exact: true }).click();
    const cooking = await page.locator(".v2-cooking").elementHandle();
    try {
      for (const theme of Object.keys(themes)) {
        await changeTheme(theme, { close: false }); await layers({ overlay: true });
        const radio = page.getByRole("radio", { name: themes[theme].label, exact: true });
        assert(await radio.evaluate((node) => document.activeElement === node));
        await page.getByRole("button", { name: "查看样板", exact: true }).click();
        assert(await page.locator(".v2-cooking").evaluate((node, original) => node === original, cooking));
        await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
      }
      for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "下一步", exact: true }).click();
      await page.getByRole("button", { name: "完成这道菜", exact: true }).click();
      for (const theme of Object.keys(themes)) {
        await changeTheme(theme);
        assert(await page.getByRole("button", { name: "完成这道菜", exact: true }).isDisabled());
        assert.equal(await page.getByText("演示完成确认。未写入任何做菜记录。", { exact: true }).count(), 1);
      }
    } finally { await cooking.dispose(); }
  });
  await check("hot theme changes retain component inputs, explicit review gate and saved acknowledgement", async () => {
    await open("warm-ivory", "components");
    await page.getByRole("textbox", { name: "菜名 默认", exact: true }).fill("保留这道菜");
    const saved = page.getByRole("button", { name: "保存审核样例", exact: true }); assert(await saved.isDisabled());
    await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).check(); await saved.click();
    for (const theme of Object.keys(themes)) {
      await changeTheme(theme);
      assert(await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).isChecked());
      assert(await saved.isEnabled());
      await page.getByText("样例已确认；未写入任何正式菜谱。", { exact: true }).waitFor();
      assert.equal(await page.getByRole("textbox", { name: "菜名 默认", exact: true }).inputValue(), "保留这道菜");
    }
  });
  await check("all visited documents avoid database initialization, storage writes, cookies and external/API requests", async () => {
    await noPersistence(); assert.deepEqual(external, []); assert.deepEqual(businessRequests, []); assert.deepEqual(errors, []);
  });
  const after = await uiV2EvidenceSource(root);
  assert.equal(after.fingerprint, testedSource.fingerprint, "Showcase/QA source changed during verification");
  const report = { status: "PASS", date: new Date().toISOString(), revision, testedSource, browser: browser.version(), checks, checkCount: checks.length,
    materials: materialEvidence, contrast: { scope: "Rendered local text/tint pairs composited against both black and white extrema; screenshots supplied for visual review, not a complete accessibility audit", records: contrastEvidence },
    errors, externalRequests: external, businessRequests, notRun: ["user/ChatGPT visual acceptance", "Android WebView", "IME", "TalkBack", "physical device/OEM", "same-device performance", "production G2-G4"] };
  await writeFile(path.join(out, "themes-results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, revision, evidence: out }));
} catch (error) {
  await page.screenshot({ path: path.join(out, "themes-failure.png") }).catch(() => {});
  const focus = await page.evaluate(() => ({ active: document.activeElement?.outerHTML.slice(0, 700), dialogs: [...document.querySelectorAll('[role="dialog"]')].map((node) => ({ title: node.getAttribute("aria-labelledby"), hidden: node.hidden })) })).catch(() => null);
  await writeFile(path.join(out, "themes-failure.json"), JSON.stringify({ status: "FAIL", revision, error: String(error), focus, checks, errors, external, businessRequests, materialEvidence, contrastEvidence }, null, 2));
  throw error;
} finally { await browser.close(); }
