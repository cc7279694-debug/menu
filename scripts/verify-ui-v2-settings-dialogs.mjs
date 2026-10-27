import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url), runtime = process.argv.find(v => v.startsWith("--runtime="))?.slice(10);
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), runtime].filter(Boolean) }));
const root = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/");
const out = path.resolve("output/playwright/ui-v2/g3-foundation/settings-dialogs"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: "reduce" });
const page = await context.newPage(), checks = [], errors = [];
page.on("pageerror", e => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5184/");
  await page.evaluate(async fixturePath => {
    document.getElementById("root").hidden = true;
    const target = document.createElement("div"); document.body.append(target);
    const { renderFixture } = await import(fixturePath);
    window.__g3FixtureCalls = renderFixture(target);
    document.documentElement.style.fontSize = "32px";
  }, `/@fs/${root}scripts/fixtures/ui-v2-settings.tsx`);
  for (const [name, theme, surface] of [["Warm Ivory", "warm-ivory", "rgb(251, 250, 247)"], ["Pure Glass", "pure-glass", "rgb(255, 255, 255)"], ["Soft Sage", "soft-sage", "rgb(250, 252, 249)"]]) {
    await page.getByRole("radio", { name: new RegExp(name) }).check();
    for (const [open, dialogName, cancel] of [["删除 AI 密钥", "删除本机 AI 密钥？", "保留密钥"], ["验证模型访问", "验证 qwen3.8-flash 访问？", "暂不验证"], ["恢复并替换当前数据", "确认替换当前数据？", "返回检查"]]) {
      await page.getByRole("button", { name: open, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: dialogName, exact: true }); await dialog.waitFor();
      await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
      assert.equal(await dialog.getAttribute("data-v2-theme"), theme);
      assert.equal(await dialog.evaluate(e => getComputedStyle(e).backgroundColor), surface);
      const rect = await dialog.boundingBox(); assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 321 && rect.y + rect.height <= 845);
      await dialog.getByRole("button", { name: cancel, exact: true }).scrollIntoViewIfNeeded();
      await dialog.getByRole("button", { name: cancel, exact: true }).click(); await dialog.waitFor({ state: "hidden" });
      checks.push(theme + " / " + open);
    }
  }
  assert.deepEqual(await page.evaluate(() => window.__g3FixtureCalls), { keyWrites: 0, exports: 0, imports: 0, restores: 0 });
  assert.deepEqual(errors, []); console.log(`PASS ${checks.length} real rendered settings confirmation dialogs at320/200%; mocked ports,0 key/backup operations`);
} finally { await writeFile(path.join(out, "results.json"), JSON.stringify({ checks, errors, scope: "Real UI components/portals with fake non-network key and backup ports; not Native verification." }, null, 2)); await context.close(); await browser.close(); }
