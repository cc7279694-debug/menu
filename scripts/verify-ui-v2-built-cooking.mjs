// Regression for compiled CSS, not Vite dev CSS: fullscreen cooking must not
// inherit the shared dialog's half-screen centering utilities. No native/AI calls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const runtime = process.argv.find(value => value.startsWith("--runtime="))?.slice(10);
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), runtime].filter(Boolean) }));
const base = "http://127.0.0.1:5186/";
const out = path.resolve(process.argv.find(value => value.startsWith("--out="))?.slice(6)
  ?? "output/playwright/ui-v2/g2-android/built-cooking");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN" });
const page = await context.newPage();
const checks = [], errors = [], external = [], geometry = [];
page.on("pageerror", error => errors.push(error.message));
context.on("request", request => { if (!request.url().startsWith(base) && !/^(blob:|data:)/.test(request.url())) external.push(request.url().split("?")[0]); });
async function painted() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
let failure;
try {
  await page.goto(base);
  await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
  await page.getByRole("button", { name: "手动录入", exact: true }).click();
  await page.getByLabel("菜名", { exact: true }).fill("G2 BUILT LAYOUT GENERATED");
  for (let index = 1; index <= 2; index++) {
    await page.getByRole("button", { name: "添加步骤", exact: true }).click();
    await page.getByLabel(`步骤 ${index}`, { exact: true }).fill(`受控第 ${index} 步：检查当前步骤在屏幕内完整可读。`);
  }
  await page.getByRole("button", { name: "快速保存菜谱", exact: true }).click();
  await page.getByRole("heading", { name: "G2 BUILT LAYOUT GENERATED", exact: true }).waitFor();
  for (const mode of ["focus", "guided"]) {
    await page.getByRole("button", { name: mode === "focus" ? "放大步骤 1" : "开始引导烹饪", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: mode === "focus" ? "单步查看" : "引导烹饪", exact: true });
    await dialog.waitFor();
    for (const width of [320, 390, 412, 768]) for (const font of [16, 32]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(value => { document.documentElement.style.fontSize = `${value}px`; }, font);
      await painted();
      const measured = await dialog.evaluate(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        const box = target => { const r = target.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        return { viewport: { width: innerWidth, height: innerHeight },
          dialog: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          translate: style.translate, body: box(element.querySelector(".v2-cook-scroll")),
          footer: box(element.querySelector(".v2-cook-footer")) };
      });
      geometry.push({ mode, width, font, ...measured });
      await page.screenshot({ path: path.join(out, "latest.png") });
      assert.ok(Math.abs(measured.dialog.x) <= 1 && Math.abs(measured.dialog.y) <= 1,
        `COMPILED_COOKING_OFFSCREEN ${JSON.stringify({ mode, width, font, ...measured })}`);
      assert.ok(Math.abs(measured.dialog.width - width) <= 1 && Math.abs(measured.dialog.height - 844) <= 1, "Cooking must fill the actual viewport");
      assert.ok(measured.body.x >= -1 && measured.body.y >= -1 && measured.body.width > 0 && measured.body.height > 0
        && measured.body.right <= width + 1 && measured.body.bottom <= 845, "Real step body must remain on screen");
      assert.ok(measured.footer.x >= -1 && measured.footer.y >= -1 && measured.footer.width > 0 && measured.footer.height > 0
        && measured.footer.right <= width + 1 && measured.footer.bottom <= 845, "Both navigation controls must be reachable, not just below a maximum coordinate");
      checks.push(`${mode}-${width}-${font === 32 ? "200" : "100"}`);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole("button", { name: "下一步", exact: true }).click();
    await painted();
    if (mode === "guided") await page.screenshot({ path: path.join(out, "guided-readable.png") });
    await dialog.getByRole("button", { name: mode === "focus" ? "返回完整步骤" : "退出引导", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(`PASS ${checks.length} compiled Focus/Guided viewport/text layouts; real next/exit controls; errors0/external0`);
} catch (error) {
  failure = String(error);
  throw error;
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify({ checks, errors, external, geometry, failure,
    scope: "Actual minified production build in a fresh browser context; not Android evidence." }, null, 2));
  await context.close(); await browser.close();
}
