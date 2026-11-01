// Local synthetic browser checks. No real website, Provider, device, or personal DB.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runtime = argument("runtime"), out = argument("out"), base = argument("base") ?? "http://127.0.0.1:5199/";
assert(runtime && out && path.isAbsolute(runtime) && path.isAbsolute(out), "Explicit isolated runtime and output paths required");
assert.equal(new URL(base).hostname, "127.0.0.1");
const qaRequire = createRequire(path.join(runtime, "recipio-xhs-qa.cjs"));
assert.equal(qaRequire("playwright/package.json").version, "1.62.1");
const { chromium } = qaRequire("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const moduleBase = `/@fs/${root.replaceAll("\\", "/").replace(/\/$/, "")}/`;
await mkdir(out); // Never overwrite an earlier evidence directory.
const result = { source: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), checks: [], screenshots: [], errors: [], external: [], realAiCalls: 0 };
const browser = await chromium.launch({ executablePath: process.env.RECIPIO_QA_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) {
    for (const scenario of ["public-note", "title-only", "video", "partial", "login", "challenge", "fake-ip", "complete"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "zh-CN", deviceScaleFactor: 1 });
      await context.addInitScript(value => localStorage.setItem("recipio.ui-v2.theme.v1", value), theme);
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(base).origin) return route.continue();
        result.external.push(url.origin); return route.abort();
      });
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      page.on("pageerror", error => result.errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") result.errors.push(message.text()); });
      await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
      await page.evaluate(async ({ source, scenario }) => {
        const old = document.getElementById("root"); old.hidden = true; old.id = "qa-original-root";
        const target = document.createElement("div"); target.id = "root"; document.body.append(target);
        const { renderXhsFixture } = await import(source + "scripts/fixtures/xhs-link.tsx");
        window.__xhsFixture = await renderXhsFixture(target, scenario);
      }, { source: moduleBase, scenario });
      await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
      await page.getByRole("button", { name: "从网页链接导入", exact: true }).click();
      await page.getByLabel("网页链接", { exact: true }).fill("https://xhslink.cn/o/synthetic");
      await page.getByRole("button", { name: "读取网页", exact: true }).click();
      if (["login", "challenge", "fake-ip"].includes(scenario)) {
        const alert = page.getByRole("alert"); await alert.waitFor();
        assert((await alert.innerText()).includes({ login: "要求登录", challenge: "验证码", "fake-ip": "Fake-IP" }[scenario]));
        assert.equal(await page.getByRole("region", { name: "网页读取结果", exact: true }).count(), 0);
      } else if (scenario === "complete") {
        await page.getByRole("heading", { name: "检查网页菜谱", exact: true }).waitFor();
      } else {
        await page.getByRole("heading", { name: scenario === "title-only" ? "仅获取到标题" : "网页信息不完整", exact: true }).waitFor();
        if (scenario === "video") assert((await page.getByRole("region", { name: "网页读取结果" }).innerText()).includes("不会读取视频画面或口播"));
        if (scenario === "title-only") assert.equal(await page.getByRole("button", { name: "使用 AI 继续整理", exact: true }).isEnabled(), false);
      }
      assert.equal(await page.evaluate(() => window.__xhsFixture.calls.ai), 0);
      assert.equal(await page.evaluate(async () => (await window.__xhsFixture.recipes()).length), 0);
      const screenshot = `${theme}-${scenario}.png`;
      await page.screenshot({ path: path.join(out, screenshot), fullPage: true }); result.screenshots.push(screenshot);
      if (scenario === "title-only") {
        await page.getByLabel("补充菜谱文字", { exact: true }).fill("青菜200克，清水500毫升。洗净后煮熟。");
        await page.getByRole("button", { name: "加入补充文字", exact: true }).click();
        assert.equal(await page.evaluate(() => window.__xhsFixture.calls.ai), 0);
        await page.getByRole("button", { name: "使用 AI 继续整理", exact: true }).click();
        await page.getByRole("heading", { name: "整理结果仍不完整", exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.__xhsFixture.calls.ai), 1);
        assert.equal(await page.getByRole("button", { name: "确认保存菜谱", exact: true }).isEnabled(), false);
        const image = `${theme}-incomplete-ai.png`; await page.screenshot({ path: path.join(out, image), fullPage: true }); result.screenshots.push(image);
      }
      result.checks.push({ theme, scenario, status: "PASS" });
      await context.close();
    }
  }
  assert.deepEqual(result.external, []); assert.deepEqual(result.errors, []);
  console.log(JSON.stringify({ checks: result.checks.length, screenshots: result.screenshots.length, external: result.external.length, errors: result.errors.length }));
} finally {
  await browser.close(); await writeFile(path.join(out, "results.json"), JSON.stringify(result, null, 2));
}
