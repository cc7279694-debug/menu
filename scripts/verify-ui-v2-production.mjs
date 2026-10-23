import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Browser-only controlled fixtures in a new ephemeral context/origin. Never
// import this script from the app, touch an existing profile, or call AI.
const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = process.argv.find(value => value.startsWith("--runtime="))?.slice(10);
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: [root, runtime].filter(Boolean) }));
const base = "http://127.0.0.1:5184/";
const moduleBase = `/@fs/${root.replaceAll("\\", "/")}src/native/`;
const out = path.join(root, "output/playwright/ui-v2/g2/browser");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
  locale: "zh-CN", timezoneId: "Asia/Shanghai", reducedMotion: "reduce", serviceWorkers: "block" });
const page = await context.newPage();
const checks = [], errors = [], external = [], screenshots = [], layouts = [];
page.on("pageerror", error => errors.push(error.message));
context.on("request", request => {
  if (!request.url().startsWith(base) && !/^(blob:|data:)/.test(request.url())) external.push(request.url().split("?")[0]);
});
async function check(name, action) { await action(); checks.push(name); console.log(`PASS ${name}`); }
async function painted() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function shot(name) {
  await painted(); await page.screenshot({ path: path.join(out, `${name}.png`) }); screenshots.push(name);
}
async function layout(name) {
  await painted();
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    height: innerHeight, scroll: scrollY }));
  layouts.push({ name, ...size }); assert.ok(size.scrollWidth <= size.width + 1, `${name}: horizontal overflow`);
}
async function nativeBack() { await page.evaluate(() => window.dispatchEvent(new Event("recipio:back", { cancelable: true }))); }
const nav = () => page.getByRole("navigation", { name: "主要导航" });
const recipeTitle = "G2 测试 · 可乐鸡翅";
async function openRecipe() {
  await page.getByRole("button", { name: `打开 ${recipeTitle}`, exact: true }).click();
  await page.getByRole("heading", { name: recipeTitle, exact: true }).waitFor();
}
let seeded;
try {
  await page.goto(base);
  await page.getByRole("heading", { name: "谱序", exact: true }).waitFor();
  await check("fresh_empty_library_has_no_sample_food", async () => {
    assert.equal(await page.getByRole("button", { name: /^打开 / }).count(), 0);
    await page.getByRole("heading", { name: "先记下第一道想做的菜" }).waitFor();
    await shot("empty-390");
  });
  seeded = await page.evaluate(async ({ moduleBase, recipeTitle }) => {
    const { PreviewRecipeLibrary } = await import(moduleBase + "preview-store.ts");
    const { emptyDetails } = await import(moduleBase + "recipe-model.ts");
    const { saveLocalImage } = await import(moduleBase + "media.ts");
    const store = new PreviewRecipeLibrary();
    // A visibly marked, non-food test pattern, stored through the real media
    // service. Not a G1 asset, production fallback, or private photograph.
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 900;
    const c = canvas.getContext("2d"); c.fillStyle = "#e3ded0"; c.fillRect(0, 0, 1200, 900);
    c.fillStyle = "#879780"; c.fillRect(60, 60, 1080, 600); c.fillStyle = "#f9f6ef";
    c.font = "48px sans-serif"; c.fillText("LOCAL IMAGE TEST", 120, 300); c.font = "32px sans-serif";
    c.fillText("Controlled fixture / no private photo", 120, 390);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const coverPath = await saveLocalImage(new File([blob], "controlled-image.png", { type: "image/png" }));
    for (let i = 0; i < 101; i++) await store.create(`G2 测试 · 本地条目 ${String(i).padStart(3, "0")}`);
    const nameOnly = await store.create("G2 测试 · 只有菜名也能保存，长标题仍然完整可读，不需要先补齐做法");
    const recipe = await store.createDetails({ ...emptyDetails(recipeTitle), coverPath,
      totalMinutes: 30, servings: 3, caloriesPerServing: 328,
      ingredients: [{ name: "鸡翅", amount: "500 克" }, { name: "可乐", amount: "330 毫升" }, { name: "生抽", amount: "2 勺" }],
      preparations: [{ instruction: "鸡翅洗净，提前腌一会儿", minutes: null, timingText: "一会儿" }],
      steps: [{ instruction: "将鸡翅冷水下锅，加入姜片后焯水。", imagePath: coverPath },
        { instruction: "将鸡翅煎至两面金黄，加入可乐和生抽。", imagePath: null },
        { instruction: "转小火焖 20 分钟，最后开大火收汁。", imagePath: null }],
      keyTips: [{ instruction: "最后收汁容易糊，留在锅边观察。", stepNumber: 3 }],
      notes: "非私人测试菜谱。\n下次糖少放一点。" });
    await store.recordCooking(recipe.id, crypto.randomUUID());
    await store.saveDetails(recipe.id, { ...recipe, notes: recipe.notes + "\n补充测试备注。" });
    return { id: recipe.id, nameOnly: nameOnly.title, moduleBase };
  }, { moduleBase, recipeTitle });
  await page.reload(); await page.getByRole("button", { name: `打开 ${recipeTitle}`, exact: true }).waitFor();
  await check("real_local_home_and_list", async () => {
    assert.equal(await nav().getByRole("button").count(), 3);
    assert.equal(await page.getByRole("button", { name: /^打开 / }).count(), 100);
    await shot("home-390"); await layout("home-390");
    await nav().getByRole("button", { name: "我的菜谱", exact: true }).click();
    await page.getByLabel("耗时筛选").waitFor(); await shot("library-390");
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    await page.getByRole("button", { name: "上一页", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('button[aria-label^="打开 "]').length === 3);
    await page.getByRole("button", { name: "上一页", exact: true }).click();
    await page.getByRole("button", { name: `打开 ${recipeTitle}`, exact: true }).waitFor();
  });
  await check("local_search_filter_and_return_position", async () => {
    await page.getByLabel("搜索菜名或食材").fill("鸡翅");
    await page.getByLabel("耗时筛选").selectOption("short");
    await page.waitForFunction(() => document.querySelectorAll('button[aria-label^="打开 "]').length === 1);
    await shot("search-390"); await openRecipe();
    await page.getByRole("button", { name: "返回菜谱库" }).click();
    assert.equal(await page.getByLabel("搜索菜名或食材").inputValue(), "鸡翅");
    assert.equal(await page.getByLabel("耗时筛选").inputValue(), "short");
    await page.getByRole("button", { name: "清空搜索" }).click();
    await page.getByLabel("耗时筛选").selectOption("all");
    await page.waitForFunction(() => document.querySelectorAll('button[aria-label^="打开 "]').length === 100);
    await page.evaluate(() => scrollTo(0, 1200)); const y = await page.evaluate(() => scrollY);
    // Do not let Playwright auto-scroll the target row before opening it.
    await page.getByRole("button", { name: "打开 G2 测试 · 本地条目 095", exact: true }).evaluate(button => button.click());
    await page.getByRole("heading", { name: "G2 测试 · 本地条目 095", exact: true }).waitFor();
    await page.getByRole("button", { name: "返回菜谱库" }).click();
    await page.waitForFunction(y => Math.abs(scrollY - y) < 2, y);
    await page.evaluate(() => scrollTo(0, 0));
  });
  await openRecipe(); await shot("detail-390");
  await check("full_content_local_image_and_readonly_focus", async () => {
    assert.equal(await nav().count(), 0);
    await page.getByRole("img", { name: `${recipeTitle} 封面`, exact: true }).waitFor();
    await page.getByRole("heading", { name: "完整步骤", exact: true }).waitFor();
    await page.getByRole("button", { name: "放大步骤 1", exact: true }).click();
    await page.getByRole("dialog", { name: "单步查看", exact: true }).waitFor();
    await shot("focus-390"); await page.getByRole("button", { name: "返回完整步骤" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  });
  await check("short_history_and_editor_restore_detail_position", async () => {
    for (const [entry, heading, back] of [["查看做菜记录", "做菜记录", "返回菜谱"], ["查看修改记录", "修改记录", "返回菜谱"], ["编辑菜谱", "编辑菜谱", "取消"]]) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const y = await page.evaluate(() => scrollY);
      await page.getByRole("button", { name: entry, exact: true }).first().evaluate(button => button.click());
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await shot(`${heading === "编辑菜谱" ? "editor" : heading === "修改记录" ? "changes" : "history"}-390`);
      await page.getByRole("button", { name: back, exact: true }).click();
      await page.getByRole("heading", { name: recipeTitle, exact: true }).waitFor();
      await painted();
      await page.waitForFunction(y => Math.abs(scrollY - y) < 2, y);
    }
  });
  await check("guided_sheet_back_and_explicit_completion_only", async () => {
    await page.getByRole("button", { name: "开始引导烹饪" }).click();
    await page.getByRole("dialog", { name: "引导烹饪", exact: true }).waitFor();
    await shot("cooking-390"); await layout("cooking-390");
    await page.getByRole("button", { name: "查看食材" }).click();
    await page.getByRole("dialog", { name: "食材", exact: true }).waitFor(); await shot("ingredients-sheet-390");
    assert.equal(await page.getByRole("checkbox").count(), 0); await nativeBack();
    await page.getByRole("dialog", { name: "食材", exact: true }).waitFor({ state: "hidden" });
    await page.getByRole("dialog", { name: "引导烹饪", exact: true }).waitFor();
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    const count = await page.evaluate(async ({ moduleBase, id }) => {
      const { PreviewRecipeLibrary } = await import(moduleBase + "preview-store.ts");
      return (await new PreviewRecipeLibrary().getCookingSummary(id)).count;
    }, seeded); assert.equal(count, 1);
    await page.getByRole("button", { name: "完成这道菜", exact: true }).click();
    await page.getByRole("heading", { name: "已记录做过这道菜", exact: true }).waitFor(); await shot("completion-390");
    await page.getByRole("button", { name: "返回菜谱", exact: true }).click();
  });
  await check("responsive_detail_controls_and_content_clearance", async () => {
    for (const width of [320, 390, 412, 768]) for (const font of [16, 32]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(font => document.documentElement.style.fontSize = `${font}px`, font);
      await painted();
      await page.mouse.move(width - 4, 300);
      await page.mouse.wheel(0, 100000);
      await page.waitForFunction(() => Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 2);
      await layout(`detail-${width}-${font}`);
      const clear = await page.evaluate(() => {
        const last = document.querySelector('.v2-detail-body > section:last-child').getBoundingClientRect();
        const bar = document.querySelector('.v2-bottom-actions').getBoundingClientRect();
        return { width:innerWidth, font:getComputedStyle(document.documentElement).fontSize,
          scroll:scrollY, total:document.documentElement.scrollHeight,
          padding:getComputedStyle(document.querySelector('.v2-detail-scroll')).paddingBottom,
          reserved:document.querySelector('.v2-production-detail').style.getPropertyValue('--v2-controls-height'),
          lastBottom: last.bottom, barTop: bar.top, barBottom: bar.bottom, height: innerHeight };
      });
      assert.ok(clear.lastBottom <= clear.barTop + 1, JSON.stringify(clear));
      assert.ok(clear.barBottom <= clear.height + 1, JSON.stringify(clear));
      if (font === 32) await shot(`detail-${width}-200`);
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; scrollTo(0, 0); });
  });
  await check("name_only_no_image_and_native_sheet_back", async () => {
    await page.getByRole("button", { name: "返回菜谱库" }).click();
    await page.getByRole("button", { name: `打开 ${seeded.nameOnly}`, exact: true }).click();
    await page.getByRole("button", { name: "补充做法", exact: true }).waitFor(); await shot("name-only-390");
    assert.equal(await page.getByRole("img").count(), 0);
    await page.getByRole("button", { name: "返回菜谱库" }).click();
    await page.getByRole("button", { name: "新增菜谱" }).click(); await shot("add-sheet-390");
    await nativeBack(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("main", { name: "我的菜谱", exact: true }).waitFor();
  });
  await check("legacy_g3_entries_return_without_provider_request", async () => {
    for (const entry of ["AI 整理", "从网页链接导入", "帮我找做法"]) {
      await page.getByRole("button", { name: "新增菜谱" }).click();
      await page.getByRole("dialog", { name: "添加菜谱" }).getByRole("button", { name: entry, exact: true }).click();
      await page.getByRole("button", { name: "返回", exact: true }).waitFor();
      await page.getByRole("button", { name: "返回", exact: true }).click();
      if (entry === "AI 整理") await page.getByRole("button", { name: "放弃本轮整理", exact: true }).click();
      if (entry === "从网页链接导入") await page.getByRole("button", { name: "放弃网页导入", exact: true }).click();
      await page.getByRole("main", { name: "我的菜谱", exact: true }).waitFor();
    }
    await nav().getByRole("button", { name: "设置", exact: true }).click();
    await page.getByRole("heading", { name: "设置", exact: true }).waitFor();
    assert.equal(await page.locator('.v2-production-form').count(), 0);
    await nav().getByRole("button", { name: "首页", exact: true }).click();
    await page.getByRole("main", { name: "首页", exact: true }).waitFor();
  });
  await check("responsive_home_editor_cooking_and_solid_material", async () => {
    for (const width of [320, 390, 412, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => document.documentElement.style.fontSize = "32px");
      await layout(`home-${width}-200`);
      await page.mouse.move(width - 4, 300); await page.mouse.wheel(0, 100000);
      await page.waitForFunction(() => Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 2);
      const clear = await page.evaluate(() => ({ last:document.querySelector('.v2-recipe-list li:last-child').getBoundingClientRect().bottom,
        bar:document.querySelector('.v2-production-nav').getBoundingClientRect().top }));
      assert.ok(clear.last <= clear.bar + 1, JSON.stringify(clear));
      await page.evaluate(() => scrollTo(0, 0));
      if (width === 320) await shot("home-320-200");
      await openRecipe();
      await page.getByRole("button", { name: "编辑菜谱" }).click(); await page.getByLabel("菜名").waitFor();
      await layout(`editor-${width}-200`);
      if (width === 320) await shot("editor-320-200");
      await page.getByRole("button", { name: "取消", exact: true }).click();
      await page.getByRole("button", { name: "开始引导烹饪" }).click();
      await layout(`cooking-${width}-200`);
      const controls = await page.locator('.v2-cook-footer').boundingBox();
      assert.ok(controls.y + controls.height <= 845);
      await page.getByRole("button", { name: "查看食材" }).click();
      await page.getByRole("dialog", { name: "食材", exact: true }).waitFor();
      await layout(`ingredients-${width}-200`); await nativeBack();
      await page.getByRole("dialog", { name: "食材", exact: true }).waitFor({state:"hidden"});
      if (width === 320) await shot("cooking-320-200");
      await page.getByRole("button", { name: "退出引导" }).click();
      await page.getByRole("button", { name: "返回菜谱库" }).click();
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px";
      document.querySelector('.v2-production').setAttribute('data-v2-solid','true');
      scrollTo(0,0);
    });
    const material=await page.locator('.v2-home-controls').evaluate(el => ({blur:getComputedStyle(el).backdropFilter,background:getComputedStyle(el).backgroundColor}));
    assert.equal(material.blur,"none"); assert.ok(!material.background.startsWith('rgba('));
    await shot("solid-home-390");
    await page.evaluate(() => document.querySelector('.v2-production').removeAttribute('data-v2-solid'));
  });
  await check("fresh_reload_keeps_local_recipe_and_no_external_request", async () => {
    await page.reload(); await page.getByRole("button", { name: `打开 ${recipeTitle}`, exact: true }).waitFor();
    assert.deepEqual(external, []); assert.deepEqual(errors, []);
  });
  console.log(`PASS ${checks.length} production browser checks`);
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify({ checks, errors, external, screenshots, layouts,
    evidence: "Fresh browser IndexedDB + controlled media only; native Back event routing is not Android IME proof." }, null, 2));
  await context.close(); await browser.close();
}
