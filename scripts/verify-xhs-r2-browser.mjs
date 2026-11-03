// Local-only real browser UI checks. No target website, Native picker or real AI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runtime = arg("runtime"), out = arg("out"), base = arg("base") ?? "http://127.0.0.1:5203/";
assert(runtime && out && path.isAbsolute(runtime) && path.isAbsolute(out));
assert.equal(new URL(base).hostname, "127.0.0.1");
const qaRequire = createRequire(path.join(runtime, "r2-qa.cjs"));
const { chromium } = qaRequire("playwright");
const root = fileURLToPath(new URL("../", import.meta.url)), moduleBase = `/@fs/${root.replaceAll("\\", "/").replace(/\/$/, "")}/`;
await mkdir(out);
const results = { source: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), checks: [], screenshots: [], external: [], errors: [], realAiCalls: 0, nativePicker: "NOT_RUN" };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) {
    for (const scenario of ["missing-state", "unsupported-state", "wrong-target", "unresolved-link", "media-only", "direct-note", "generic", "login", "challenge"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "zh-CN" });
      await context.addInitScript(value => localStorage.setItem("recipio.ui-v2.theme.v1", value), theme);
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(base).origin) return route.continue();
        results.external.push(url.origin); return route.abort();
      });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on("pageerror", error => results.errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") results.errors.push(message.text()); });
      await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
      await page.evaluate(async ({ moduleBase, scenario }) => {
        const old = document.getElementById("root"); old.hidden = true; old.id = "qa-original-root";
        const target = document.createElement("div"); target.id = "root"; document.body.append(target);
        const { renderR2Fixture } = await import(moduleBase + "scripts/fixtures/xhs-r2.tsx");
        window.__r2 = await renderR2Fixture(target, scenario);
      }, { moduleBase, scenario });
      await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
      await page.getByRole("button", { name: "从网页链接导入", exact: true }).click();
      await page.getByLabel("网页链接", { exact: true }).fill("https://xhslink.cn/o/synthetic");
      await page.getByRole("button", { name: "读取网页", exact: true }).click();
      if (["login", "challenge"].includes(scenario)) await page.getByRole("alert").waitFor();
      else if (scenario === "generic") await page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor();
      else {
        await page.getByRole("heading", { name: scenario === "direct-note" ? "网页信息不完整" : "仅获取到标题", exact: true }).waitFor();
        const state = await page.evaluate(() => window.__r2.snapshot());
        assert.equal(state.link.parsed.candidates.length, 0);
        assert(!state.link.visible.text.includes("推荐菜"));
        if (scenario !== "direct-note") assert.equal(state.link.visible.text, "");
        assert.equal(await page.getByRole("button", { name: "使用 AI 继续整理", exact: true }).isEnabled(), scenario === "direct-note");
      }
      assert.equal(await page.evaluate(() => window.__r2.calls.ai), 0);
      assert.equal(await page.evaluate(async () => (await window.__r2.recipes()).length), 0);
      if (["missing-state", "direct-note"].includes(scenario)) {
        const file = `${theme}-${scenario}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true }); results.screenshots.push(file);
      }
      if (scenario === "missing-state") {
        await page.getByRole("button", { name: "添加菜谱截图并用 AI 整理", exact: true }).click();
        await page.getByRole("heading", { name: "整理菜谱", exact: true }).waitFor();
        assert((await page.locator("body").innerText()).includes("来源提示：合成来源标题"));
        assert.equal(await page.getByLabel("菜谱文字", { exact: true }).inputValue(), "");
        await page.getByRole("button", { name: "添加截图", exact: true }).click();
        await page.getByRole("button", { name: "预览截图 1", exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.__r2.calls.ai), 0);
        const image = page.getByRole("img", { name: "截图 1", exact: true });
        await image.evaluate(img => img.decode());
        assert.equal(await image.evaluate(img => img.naturalHeight), 1800);
        const capture = `${theme}-screenshot-input.png`; await page.screenshot({ path: path.join(out, capture), fullPage: true }); results.screenshots.push(capture);
        await page.getByRole("button", { name: "开始 AI 整理", exact: true }).click();
        await page.getByRole("heading", { name: "检查整理结果", exact: true }).waitFor();
        const requests = await page.evaluate(() => window.__r2.calls.requests);
        assert.equal(requests.length, 1); assert.equal(requests[0].text, ""); assert.equal(requests[0].imageIds.length, 1);
        assert.equal(await page.getByRole("button", { name: "确认保存菜谱", exact: true }).isEnabled(), false);
        await page.getByLabel("菜名", { exact: true }).fill("我校对的合成长图饭");
        const review = `${theme}-screenshot-review.png`; await page.screenshot({ path: path.join(out, review), fullPage: true }); results.screenshots.push(review);
        await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).check();
        await page.getByRole("button", { name: "确认保存菜谱", exact: true }).click();
        await page.getByRole("heading", { name: "我校对的合成长图饭", exact: true }).waitFor();
        const recipes = await page.evaluate(() => window.__r2.recipes());
        assert.equal(recipes.length, 1); assert.equal(recipes[0].steps.length, 8); assert.equal(recipes[0].coverPath, null);
        assert(recipes[0].steps.every(step => step.imagePath === null));
        assert(!JSON.stringify(recipes).includes("合成来源标题")); assert(!JSON.stringify(recipes).includes("xhslink.cn"));
        assert.equal(await page.evaluate(() => window.__r2.snapshot().ai.images.length), 0);
        assert.equal(await page.evaluate(() => window.__r2.snapshot().link.visible), null);
      }
      results.checks.push({ theme, scenario, status: "PASS" }); await context.close();
    }
  }
  assert.deepEqual(results.external, []); assert.deepEqual(results.errors, []);
} finally {
  await browser.close(); await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ checks: results.checks.length, screenshots: results.screenshots.length, errors: results.errors.length, external: results.external.length }));
