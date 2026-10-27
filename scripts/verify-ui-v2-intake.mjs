// Standalone browser evidence with a fresh profile and generated data only.
// Browser plugin unavailable in this workflow; regular Playwright is explicitly in scope.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const option = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runtime = option("runtime", "C:/Users/CDD/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), runtime] }));
const base = option("url", "http://127.0.0.1:5184/");
assert.equal(new URL(base).hostname, "127.0.0.1", "Only the local QA server is allowed");
const root = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/");
const out = path.resolve("output/playwright/ui-v2/g3-remainder/browser");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], external = [], surfaces = [], captures = [];
const themes = ["warm-ivory", "pure-glass", "soft-sage"];
const themeNames = ["Warm Ivory", "Pure Glass", "Soft Sage"];
const surfacesByTheme = { "warm-ivory": "#fbfaf7", "pure-glass": "#ffffff", "soft-sage": "#fafcf9" };
let activePage;
let failure = null;

async function open({ theme = "warm-ivory", width = 390, font = 16, configured = true, duplicate = false, solid = false, motion = "reduce" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: motion });
  await context.addInitScript(theme => localStorage.setItem("recipio.ui-v2.theme.v1", theme), theme);
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== new URL(base).origin) { external.push(url.origin); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage(); activePage = page;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(base);
  await page.evaluate(async ({ fixturePath, configured, duplicate, font }) => {
    const original = document.getElementById("root");
    original.hidden = true; original.id = "qa-original-root";
    const target = document.createElement("div"); target.id = "root"; document.body.append(target);
    const { renderFixture } = await import(fixturePath);
    window.__intakeFixture = await renderFixture(target, { configured, duplicate });
    document.documentElement.style.fontSize = `${font}px`;
  }, { fixturePath: `/@fs/${root}scripts/fixtures/ui-v2-intake.tsx`, configured, duplicate, font });
  // Test-only loss-of-transparency mode uses the existing CSS fallback contract.
  // This emulates data-v2-solid presentation; it does not claim CSS @supports coverage.
  if (solid) await page.evaluate(() => {
    const apply = () => document.querySelectorAll("#root .recipio-ui-v2,.v2-portal,.v2-themed-dialog").forEach(el => el.setAttribute("data-v2-solid", "true"));
    const observer = new MutationObserver(apply); observer.observe(document.body, { childList: true, subtree: true }); apply();
  });
  await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
  return { page, close: () => context.close() };
}
async function state(page) { return page.evaluate(() => window.__intakeFixture.snapshot()); }
async function calls(page) { return page.evaluate(() => window.__intakeFixture.calls); }
async function click(page, name) { await page.getByRole("button", { name, exact: true }).click(); }
async function settled(page) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
}
async function checkLayout(page, name, theme) {
  await settled(page);
  const evidence = await page.evaluate(() => {
    const visible = element => !!element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && !element.closest("[hidden]");
    const candidates = [...document.querySelectorAll('#root :is(input,textarea,button,select,h1,h2,h3,h4,p,article,fieldset),[role="dialog"]')].filter(visible);
    const offenders = candidates.filter(element => {
      const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1;
    }).map(element => ({ tag: element.tagName, text: element.textContent?.slice(0, 90), x: element.getBoundingClientRect().x, width: element.getBoundingClientRect().width }));
    const scope = document.querySelector("#root .v2-production");
    return { width: innerWidth, font: getComputedStyle(document.documentElement).fontSize,
      scrollWidth: document.documentElement.scrollWidth, theme: scope?.getAttribute("data-v2-theme"),
      background: scope ? getComputedStyle(scope).backgroundColor : null,
      surface: scope ? getComputedStyle(scope).getPropertyValue("--v2-surface").trim() : null, offenders };
  });
  surfaces.push({ name, ...evidence });
  assert.equal(evidence.theme, theme, `${name}: active theme`);
  assert.equal(evidence.surface, surfacesByTheme[theme], `${name}: computed theme surface token`);
  assert(evidence.scrollWidth <= evidence.width + 1, `${name}: document overflow ${evidence.scrollWidth}/${evidence.width}`);
  assert.deepEqual(evidence.offenders, [], `${name}: horizontal clipping`);
  assert.equal(await page.locator("vite-error-overlay").count(), 0, `${name}: no framework overlay`);
}
async function capture(page, name) { await settled(page); await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }); captures.push(`${name}.png`); }
async function enter(page, type) {
  await click(page, "新增菜谱");
  await click(page, type === "ai" ? "AI 整理" : type === "link" ? "从网页链接导入" : "帮我找做法");
}
async function aiInput(page, images = 2) {
  await enter(page, "ai");
  await page.getByLabel("菜谱文字", { exact: true }).fill("番茄炒蛋，番茄2个，鸡蛋3个。番茄切块，鸡蛋打散。炒熟后拌匀。");
  for (let index = 0; index < images; index++) await click(page, "添加截图");
  assert.equal((await calls(page)).ai, 0);
}
async function review(page) { await click(page, "开始 AI 整理"); await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor(); }
async function observeReview(page) {
  await page.evaluate(() => {
    window.__reviewEvents = [];
    const describe = element => element instanceof Element ? { tag: element.tagName, type: element.type, label: element.getAttribute("aria-label"), text: element.textContent?.slice(0, 40) } : null;
    const log = (type, event) => {
      const checkbox = document.querySelector('.v2-review-confirmation input');
      window.__reviewEvents.push({ type, target: describe(event?.target), key: event?.key, x: event?.clientX, y: event?.clientY,
        checked: checkbox?.checked, confirmed: window.__intakeFixture.snapshot().ai.confirmed,
        disabled: checkbox?.disabled, fieldsetDisabled: checkbox?.closest("fieldset")?.disabled,
        scrollY, active: describe(document.activeElement), rect: checkbox?.getBoundingClientRect().toJSON(),
        trusted: event?.isTrusted, prevented: event?.defaultPrevented, time: performance.now() });
      if (window.__reviewEvents.length > 200) window.__reviewEvents.shift();
    };
    for (const type of ["pointerdown", "pointerup", "click", "input", "change", "keydown", "keyup", "recipio:back", "scroll", "focusin", "focusout"]) document.addEventListener(type, event => log(type, event), true);
    window.__intakeFixture.observeAi(() => log("ai-observed"));
  });
}
async function locateServings(page, animate = false) {
  const before = await state(page), writes = (await calls(page)).create;
  const field = page.getByLabel("约几人份", { exact: true });
  assert.equal(await field.inputValue(), "2");
  await click(page, "定位份数");
  const result = await field.evaluate(async element => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element), animations = element.getAnimations();
    const evidence = { focused: document.activeElement === element, value: element.value,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      y: rect.y, bottom: rect.bottom, viewport: innerHeight,
      outlineStyle: style.outlineStyle, boxShadow: style.boxShadow,
      animations: animations.map(animation => ({ kind: animation.constructor.name, duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes().map(frame => frame.backgroundColor) })),
      soft: style.getPropertyValue("--v2-soft").trim(), surface: style.getPropertyValue("--v2-surface").trim() };
    await Promise.all(animations.map(animation => animation.finished));
    return { ...evidence, remainingAnimations: element.getAnimations().length };
  });
  assert.equal(result.focused, true, "Locate focuses the existing servings field");
  assert.equal(result.value, "2", "Locate does not alter the field");
  assert(result.y >= -1 && result.bottom <= result.viewport + 1, "Located field is visible in viewport");
  assert.equal(result.reduced, !animate);
  if (animate) {
    // Native focus styles can also create ordinary CSS transitions; the new
    // location highlight is the explicit Web Animations API background effect.
    const highlight = result.animations.filter(animation => animation.kind === "Animation" && animation.frames.every(frame => frame !== undefined));
    assert.equal(highlight.length, 1, "One explicit location background highlight");
    assert.equal(highlight[0].duration, 800, "Location highlight lasts 800ms");
  } else assert.equal(result.animations.length, 0, "Reduced motion does not animate the field");
  assert.equal(result.remainingAnimations, 0, "Location animation finishes without a timer workaround");
  const after = await state(page);
  assert.equal(after.ai.confirmed, false, "Locate never confirms Review");
  assert.deepEqual(after.ai.draft, before.ai.draft, "Locate never changes the service draft");
  assert.equal((await calls(page)).create, writes, "Locate never saves");
  assert.equal(writes, 0);
  surfaces.push({ name: "Review locate servings", ...result });
}
async function parser(page, partial = false) {
  await enter(page, "link");
  await page.getByLabel("网页链接", { exact: true }).fill(`https://example.com/${partial ? "partial" : "complete"}`);
  assert.equal((await calls(page)).read, 0);
  await click(page, "读取网页");
  if (partial) await page.getByRole("heading", { name: "网页信息不完整", exact: true }).waitFor();
  else await page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor();
  assert.equal((await calls(page)).ai, 0);
  assert.equal(await page.getByRole("checkbox", { name: /我已检查/ }).count(), 0);
}
async function find(page) {
  await enter(page, "finder");
  await page.getByLabel("想做什么菜", { exact: true }).fill("番茄炒蛋");
  await page.getByLabel("偏好（可选）", { exact: true }).fill("少油、家常");
  assert.equal((await calls(page)).search, 0); assert.equal((await calls(page)).extract, 0);
  await click(page, "开始寻找"); await page.getByRole("heading", { name: "找到 3 个做法，请选择", exact: true }).waitFor();
  assert.equal((await calls(page)).search, 1); assert.equal((await calls(page)).extract, 0);
}
async function portal(page, name, theme) {
  const dialog = page.getByRole("dialog", { name, exact: true }); await dialog.waitFor(); await settled(page);
  const result = await dialog.evaluate(element => {
    const appearance = element.closest("[data-v2-theme]"); const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
    return { theme: appearance?.getAttribute("data-v2-theme"), solid: appearance?.getAttribute("data-v2-solid"),
      x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight,
      background: style.backgroundColor, color: style.color, backdropFilter: style.backdropFilter,
      surface: style.getPropertyValue("--v2-surface").trim(), overflowY: style.overflowY };
  });
  surfaces.push({ name: `portal/${name}`, ...result }); assert.equal(result.theme, theme);
  assert.equal(result.surface, surfacesByTheme[theme], `${name}: computed portal theme token`);
  assert(result.x >= -1 && result.y >= -1 && result.right <= result.width + 1 && result.bottom <= result.height + 1, `Portal bounds: ${JSON.stringify(result)}`);
  if (result.solid === "true") assert.equal(result.backdropFilter, "none");
}

try {
  // Ten Warm Ivory production screenshots from real user actions.
  {
    const { page, close } = await open({ motion: "no-preference" }); await enter(page, "ai");
    await checkLayout(page, "AI input", themes[0]); await capture(page, "01-ai-input");
    await page.getByLabel("菜谱文字", { exact: true }).fill("番茄炒蛋，番茄2个，鸡蛋3个。番茄切块，鸡蛋打散。炒熟后拌匀。");
    await click(page, "添加截图"); await click(page, "添加截图");
    const original = (await state(page)).ai.images.map(image => image.id);
    await click(page, "后移截图 1"); assert.deepEqual((await state(page)).ai.images.map(image => image.id), original.toReversed());
    await click(page, "移除截图 2"); await click(page, "添加截图");
    assert.equal((await state(page)).ai.images.length, 2); assert.equal((await calls(page)).ai, 0);
    for (let index = 0; index < 4; index++) await click(page, "添加截图");
    assert.equal(await page.getByRole("button", { name: "添加截图", exact: true }).isDisabled(), true);
    for (let index = 6; index > 2; index--) await click(page, `移除截图 ${index}`);
    await checkLayout(page, "AI two images", themes[0]); await capture(page, "02-ai-two-images");
    await review(page); await locateServings(page, true);
    checks.push("Review location focuses visible existing servings field/value2 without confirmation/save; no-preference highlight800ms completes");
    await checkLayout(page, "AI Review", themes[0]); await capture(page, "03-ai-review");
    const gate = page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true });
    assert.equal(await page.getByRole("button", { name: "快速保存菜谱", exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__intakeFixture.assertServiceReviewGate()), true);
    await page.getByLabel("菜名", { exact: true }).press("Enter"); assert.equal((await calls(page)).create, 0);
    await gate.scrollIntoViewIfNeeded(); await capture(page, "04-ai-review-confirmation-gate");
    await gate.check(); await page.evaluate(() => window.__intakeFixture.armUncertain());
    await click(page, "快速保存菜谱"); await page.getByRole("heading", { name: "先核对保存结果", exact: true }).waitFor();
    await checkLayout(page, "Save uncertain", themes[0]); await capture(page, "09-save-uncertain");
    const originalId = (await calls(page)).createdIds[0];
    await click(page, "核对保存结果"); await page.getByRole("heading", { name: "番茄炒蛋", exact: true }).waitFor();
    assert.equal((await calls(page)).create, 1); assert((await calls(page)).recoverIds.filter(id => id === originalId).length >= 2);
    const recipes = await page.evaluate(() => window.__intakeFixture.recipes());
    assert.equal(recipes.length, 1); assert.equal(recipes[0].id, originalId);
    assert.equal(recipes[0].coverPath, null); assert(recipes[0].steps.every(step => step.imagePath === null));
    assert(!JSON.stringify(recipes).match(/previewUri|data:image|sourceUrl|example\.com|imageIds/));
    checks.push("AI explicit request, reorder/remove, Review UI+service+Enter gate, real uncertain commit/original UUID recovery, source images excluded");
    await close();
  }
  for (const partial of [false, true]) {
    const { page, close } = await open(); await parser(page, partial);
    await checkLayout(page, partial ? "Parser partial" : "Parser complete", themes[0]);
    await capture(page, partial ? "06-link-parser-partial" : "05-link-parser-complete");
    if (partial) { await click(page, "直接完善菜谱"); await page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor(); assert.equal((await calls(page)).ai, 0); }
    await click(page, "快速保存菜谱"); await page.getByRole("heading", { name: "番茄炒蛋", exact: true }).waitFor();
    assert(!JSON.stringify(await page.evaluate(() => window.__intakeFixture.recipes())).match(/sourceUrl|example\.com|private-source-image/));
    checks.push(`Parser ${partial ? "partial can directly complete" : "complete"}: real parsing, 0 AI, source metadata excluded`); await close();
  }
  {
    const { page, close } = await open(); await find(page);
    await checkLayout(page, "Finder three candidates", themes[0]); await capture(page, "07-finder-three-candidates");
    await page.getByRole("button", { name: "按这个做法整理", exact: true }).nth(1).click();
    await page.getByText("已选定 · 正在整理", { exact: true }).waitFor();
    await checkLayout(page, "Finder selected extracting", themes[0]); await capture(page, "08-finder-selected-extracting");
    assert.deepEqual((await calls(page)).extractedIds, ["qa-source-2"]);
    assert.equal((await state(page)).finder.selected.sourceUrl, "https://example.com/recipe-2");
    await page.evaluate(() => window.__intakeFixture.resolveExtract());
    await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor();
    assert.equal((await calls(page)).ai, 0); assert.equal((await calls(page)).search, 1); assert.equal((await calls(page)).extract, 1);
    checks.push("Finder Search/Extract are two explicit calls; selected candidate ID/URL frozen; real service and normalizer Review handoff"); await close();
  }
  {
    const { page, close } = await open(); await aiInput(page, 0); await page.evaluate(() => window.__intakeFixture.emitShare());
    await page.getByRole("status", { name: "待处理分享", exact: true }).waitFor();
    await page.evaluate(() => window.__intakeFixture.emitShare());
    await page.getByText("较早的待处理分享已被新分享替换；当前编辑内容保持不变。", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "打开这次分享", exact: true }).isDisabled(), true);
    // React may synchronize a controlled textarea's textContent on parent rerender;
    // a wrapping-label exact text selector then includes that default text in Playwright.
    assert((await page.locator(".v2-ai-intake textarea").inputValue()).startsWith("番茄炒蛋"));
    await checkLayout(page, "Share pending", themes[0]); await capture(page, "10-share-pending");
    assert.equal((await calls(page)).ai, 0); checks.push("Real ShareTargetController defers receipt and preserves dirty input without AI"); await close();
  }
  // Actual settings interaction while the AI session remains alive.
  {
    const { page, close } = await open({ configured: false }); await aiInput(page);
    const before = (await state(page)).ai; await click(page, "前往设置 AI 密钥");
    for (let index = 0; index < themes.length; index++) await page.getByRole("radio", { name: new RegExp(themeNames[index]) }).check();
    await click(page, "设置 AI 密钥"); await click(page, "返回本轮 AI 整理");
    const after = (await state(page)).ai;
    assert.equal(after.operationId, before.operationId); assert.deepEqual(after.input, before.input); assert.deepEqual(after.images, before.images);
    await checkLayout(page, "Settings theme preserves session", "soft-sage");
    checks.push("Real settings theme changes preserve input/image IDs/operationId"); await close();
  }
  // Full mobile width matrix + 200% font/solid fallback for each approved theme.
  for (const theme of themes) for (const config of [
    { width: 320, font: 16, solid: false }, { width: 390, font: 16, solid: false },
    { width: 412, font: 16, solid: false }, { width: 320, font: 32, solid: true },
  ]) {
    const label = `${theme}/${config.width}/${config.font}/${config.solid ? "solid" : "glass"}`;
    {
      const { page, close } = await open({ theme, ...config, duplicate: true }); await aiInput(page);
      await checkLayout(page, `${label}/AI`, theme);
      await click(page, "预览截图 1"); await portal(page, "查看截图", theme);
      await page.keyboard.press("Escape"); await page.getByRole("dialog", { name: "查看截图", exact: true }).waitFor({ state: "hidden" });
      await click(page, "返回"); await portal(page, "放弃本轮整理？", theme); await click(page, "继续整理");
      await review(page); await observeReview(page); await locateServings(page); await checkLayout(page, `${label}/Review`, theme);
      await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).check();
      if (config.font === 32) await capture(page, `${theme}-320-font200-solid`);
      await click(page, "快速保存菜谱"); await portal(page, "已存在同名菜谱", theme);
      await click(page, "返回检查"); assert.equal((await calls(page)).create, 0);
      await close();
    }
    for (const partial of [false, true]) {
      const { page, close } = await open({ theme, ...config }); await parser(page, partial);
      await checkLayout(page, `${label}/Parser-${partial ? "partial" : "complete"}`, theme); await close();
    }
    {
      const { page, close } = await open({ theme, ...config }); await find(page);
      await checkLayout(page, `${label}/Finder`, theme); await close();
    }
    checks.push(`${label}: AI/images/Review + locate focus/value/scroll/no-confirm/no-save/reduced-motion0, screenshot Sheet + discard Dialog, Parser complete/partial, Finder`);
  }
  assert.deepEqual(external, [], "External network requests must remain 0");
  assert.deepEqual(errors, [], "No app console/runtime errors");
  console.log(`PASS ${checks.length} browser checks; ${captures.length} screenshots; external requests 0`);
} catch (error) {
  failure = { message: error.message };
  if (activePage && !activePage.isClosed()) {
    failure.dom = await activePage.evaluate(() => {
      const checkbox = document.querySelector('.v2-review-confirmation input'), rect = checkbox?.getBoundingClientRect();
      return { scrollY, focused: document.activeElement?.outerHTML?.slice(0, 500), checkbox: checkbox?.outerHTML,
        bounds: rect?.toJSON(), checked: checkbox?.checked, events: window.__reviewEvents,
        confirmed: window.__intakeFixture.snapshot().ai.confirmed,
        atCenter: rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.outerHTML?.slice(0, 500) : null };
    }).catch(() => null);
    const name = `failure-${Date.now()}`;
    await activePage.screenshot({ path: path.join(out, `${name}-viewport.png`), fullPage: false }).catch(() => {});
    await capture(activePage, name).catch(() => {});
  }
  throw error;
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify({ status: failure ? "FAIL" : "PASS", failure, checks, captures, surfaces, errors, external,
    scope: "Real LibraryApp + AI/Link/Finder services + PreviewRecipeLibrary. Generated data and fake external I/O. Native Provider source authentication, device, real AI, TalkBack NOT_RUN. Solid attribute emulation, not browser CSS @supports verification." }, null, 2));
  await browser.close();
}
