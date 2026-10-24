// Minified production build, fresh browser storage only; no paid/provider calls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const runtime = process.argv.find(v => v.startsWith("--runtime="))?.slice(10);
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), runtime].filter(Boolean) }));
const base = "http://127.0.0.1:5186/";
const out = path.resolve(process.argv.find(v => v.startsWith("--out="))?.slice(6) ?? "output/playwright/ui-v2/g3-foundation/browser");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN", reducedMotion: "reduce" });
const page = await context.newPage(), checks = [], geometry = [], errors = [], external = [];
page.on("pageerror", e => errors.push(e.message));
context.on("request", r => { if (!r.url().startsWith(base) && !/^(blob:|data:)/.test(r.url())) external.push(r.url().split("?")[0]); });
const themes = [
  { id: "warm-ivory", name: "Warm Ivory", canvas: "rgb(246, 244, 239)", muted: "rgb(240, 236, 229)", action: "rgb(73, 104, 79)", cook: "rgb(32, 36, 32)", cookToken: "#202420" },
  { id: "pure-glass", name: "Pure Glass", canvas: "rgb(247, 249, 251)", muted: "rgb(238, 242, 245)", action: "rgb(45, 98, 102)", cook: "rgb(25, 36, 42)", cookToken: "#19242a" },
  { id: "soft-sage", name: "Soft Sage", canvas: "rgb(239, 245, 238)", muted: "rgb(227, 237, 226)", action: "rgb(54, 94, 69)", cook: "rgb(29, 43, 34)", cookToken: "#1d2b22" },
];
const nav = () => page.getByRole("navigation", { name: "主要导航" });
const go = label => nav().getByRole("button", { name: label, exact: true }).click();
async function painted() { await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }); }
async function check(name, run) { await run(); checks.push(name); console.log("PASS " + name); }
async function finderBoundary() {
  const box = await page.locator(".v2-entry-card--secondary").evaluate(e => {
    const s = getComputedStyle(e); return { border: s.borderTopWidth, color: s.borderTopColor, background: s.backgroundColor, text: s.color, shadow: s.boxShadow };
  });
  assert.equal(box.border, "1px"); assert.notEqual(box.color, "rgba(0, 0, 0, 0)", "Finder complete tap boundary cannot be transparent");
  assert.notEqual(box.background, "rgba(0, 0, 0, 0)", "Finder must have a quiet solid surface");
}
let failure;
try {
  await page.goto(base); assert.equal(await page.title(), "谱序 RECIPIO");
  await check("finder_complete_boundary_is_visible_before_theme_changes", finderBoundary);
  // Recipe created through the real UI, never via a production seed or private profile.
  await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
  await page.getByRole("button", { name: "手动录入", exact: true }).click();
  await page.getByLabel("菜名", { exact: true }).fill("G3 GENERATED 主题测试汤");
  await page.getByRole("button", { name: "添加步骤", exact: true }).click();
  await page.getByLabel("步骤 1", { exact: true }).fill("小火煮熟，检查正文与控制区主题，未确认完成前不记录做过。");
  await page.getByRole("button", { name: "添加步骤", exact: true }).click();
  await page.getByLabel("步骤 2", { exact: true }).fill("尝味后关火。");
  await page.getByRole("button", { name: "快速保存菜谱", exact: true }).click();
  await page.getByRole("button", { name: "返回菜谱库", exact: true }).click();
  for (const theme of themes) {
    await go("设置"); await page.getByRole("radio", { name: new RegExp(theme.name) }).check();
    await check(theme.id + "_root_settings_nav_real_computed_styles", async () => {
      await painted(); assert.equal(await page.locator(".v2-production").evaluate(e => getComputedStyle(e).backgroundColor), theme.canvas);
      assert.equal(await nav().getAttribute("data-v2-theme"), theme.id);
      assert.equal(await nav().getByRole("button", { name: "设置", exact: true }).evaluate(e => getComputedStyle(e).color), theme.action);
      assert.equal(await page.getByRole("heading", { name: "谱序 RECIPIO", exact: true }).count(), 0);
      await page.screenshot({ path: path.join(out, theme.id + "-settings-390.png") });
    });
    await go("首页"); await painted(); await finderBoundary();
    const placeholderRgb = await page.locator(".v2-recent-card > [role=img]").first().evaluate(e => {
      const canvas = document.createElement("canvas"), c = canvas.getContext("2d");
      c.fillStyle = getComputedStyle(e).backgroundColor; c.fillRect(0, 0, 1, 1);
      return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    assert.deepEqual(placeholderRgb, theme.muted.match(/\d+/g).map(Number), "Missing-image surfaces must also follow the current theme");
    await page.screenshot({ path: path.join(out, theme.id + "-home-390.png") });
    if (theme.id === "warm-ivory") await page.locator(".v2-entry-grid").screenshot({ path: path.join(out, "warm-ivory-finder-entry-390.png") });
    await page.reload(); await page.getByRole("button", { name: "新增菜谱" }).waitFor();
    assert.equal(await page.locator(".v2-production").getAttribute("data-v2-theme"), theme.id);
    await page.getByRole("button", { name: "新增菜谱" }).click();
    const add = page.getByRole("dialog", { name: "添加菜谱" }); await add.waitFor();
    assert.equal(await page.locator(".v2-portal").getAttribute("data-v2-theme"), theme.id);
    await add.getByRole("button", { name: "关闭添加菜谱" }).click();
    await page.getByRole("button", { name: "打开 G3 GENERATED 主题测试汤", exact: true }).first().click();
    for (const [start, name, exit] of [["放大步骤 1", "单步查看", "返回完整步骤"], ["开始引导烹饪", "引导烹饪", "退出引导"]]) {
      await page.getByRole("button", { name: start, exact: true }).click();
      const dialog = page.getByRole("dialog", { name, exact: true }); await painted();
      assert.equal(await dialog.locator(".v2-cooking").getAttribute("data-v2-theme"), theme.id);
      assert.equal(await dialog.locator(".v2-cooking").evaluate(e => getComputedStyle(e).backgroundColor), theme.cook);
      assert.equal(await dialog.getByRole("button", { name: "查看食材" }).evaluate(e => getComputedStyle(e).color), "rgb(251, 250, 247)");
      assert.equal(await dialog.locator(".v2-cook-footer .v2-button--primary").evaluate(e => getComputedStyle(e).backgroundColor), theme.action);
      await dialog.getByRole("button", { name: "查看食材" }).click();
      const ingredients = page.getByRole("dialog", { name: "食材", exact: true }); await ingredients.waitFor();
      assert.equal(await ingredients.evaluate(e => getComputedStyle(e).getPropertyValue("--v2-cook").trim()), theme.cookToken);
      await ingredients.getByRole("button", { name: "关闭食材" }).click();
      await dialog.getByRole("button", { name: exit, exact: true }).click();
    }
    await page.getByRole("button", { name: "返回菜谱库" }).click();
    await check(theme.id + "_settings_clearance_responsive_and_solid", async () => {
      await go("设置");
      for (const width of [320, 390, 412]) for (const font of [16, 32]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(n => { document.documentElement.style.fontSize = n + "px"; }, font); await painted();
        await page.getByRole("heading", { name: "关于 / 版本", exact: true }).scrollIntoViewIfNeeded();
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await painted();
        const measured = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          end: document.querySelector(".v2-settings-about").getBoundingClientRect().bottom,
          navTop: document.querySelector(".v2-production-nav").getBoundingClientRect().top }));
        geometry.push({ theme: theme.id, width, font, ...measured });
        assert(measured.scrollWidth <= width + 1, "Settings horizontal overflow");
        assert(measured.end <= measured.navTop + 1, "Settings final content must scroll fully above navigation");
        const small = await page.locator(".v2-settings button,.v2-settings label,.v2-production-nav button").evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 48 || r.height < 48); }).length);
        assert.equal(small, 0, "Settings/nav touch targets >=48px");
      }
      await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
      await page.locator(".v2-production").evaluate(e => { e.dataset.v2Solid = "true"; });
      await nav().evaluate(e => { e.dataset.v2Solid = "true"; }); await painted();
      assert.equal(await nav().locator(".v2-glass").evaluate(e => getComputedStyle(e).backdropFilter), "none");
      await go("首页"); await page.getByRole("button", { name: "新增菜谱" }).click(); await add.waitFor();
      await page.locator(".v2-portal").evaluate(e => { e.dataset.v2Solid = "true"; });
      assert.equal(await add.evaluate(e => getComputedStyle(e).backdropFilter), "none");
      await add.getByRole("button", { name: "关闭添加菜谱" }).click();
      await page.locator(".v2-production").evaluate(e => { delete e.dataset.v2Solid; }); await nav().evaluate(e => { delete e.dataset.v2Solid; });
    });
  }
  await check("finder_entry_stays_explicit_no_automatic_request", async () => {
    await page.locator(".v2-entry-card--secondary").click(); await page.getByLabel("想做什么菜").waitFor();
    await page.getByRole("button", { name: "返回", exact: true }).click();
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  });
  console.log(`PASS ${checks.length} grouped checks; 18 settings layouts; three themes/cold mounts/portals/Focus/Guided; errors0/external0`);
} catch (e) { failure = String(e); await page.screenshot({ path: path.join(out, "failure.png") }); throw e; }
finally { await writeFile(path.join(out, "results.json"), JSON.stringify({ checks, geometry, errors, external, failure, scope: "Fresh compiled browser context, not Android evidence" }, null, 2)); await context.close(); await browser.close(); }
