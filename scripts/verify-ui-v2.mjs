import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiV2EvidenceSource } from "./ui-v2-evidence-source.mjs";

// Uses an existing Playwright installation only; never downloads browsers/packages.
const require = createRequire(import.meta.url);
const runtime = process.argv.find((v) => v.startsWith("--runtime="))?.slice(10);
const theme = process.argv.find((v) => v.startsWith("--theme="))?.slice(8) ?? "warm-ivory";
const darkBackgrounds = {
  "warm-ivory": "rgb(32, 36, 32)",
  "pure-glass": "rgb(25, 36, 42)",
  "soft-sage": "rgb(29, 43, 34)",
};
assert(Object.hasOwn(darkBackgrounds, theme), `Unknown regression theme: ${theme}`);
const { chromium } = runtime ? require(require.resolve("playwright", { paths: [runtime] })) : require("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const testedSource = await uiV2EvidenceSource(root);
const outputRoot = process.argv.find((value) => value.startsWith("--out="))?.slice(6) ?? "output/playwright/ui-v2/theme-refresh";
const out = path.resolve(root, outputRoot, theme, "regression");
const base = "http://127.0.0.1:5182/ui-v2-showcase/";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [], external = [], checks = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
context.on("request", (request) => {
  const url = request.url();
  if (!url.startsWith("http://127.0.0.1:5182/") && !url.startsWith("ws://127.0.0.1:5182/") && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url.split("?")[0]);
});
async function check(name, action) { await action(); checks.push(name); }
async function open(query = "") {
  const url = new URL(base + query);
  url.searchParams.set("theme", theme);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.locator(".v2-demo-bar").waitFor();
  assert.equal(await page.locator(".v2-app").getAttribute("data-v2-theme"), theme);
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
  assert.equal(await page.title(), "谱序 RECIPIO · UI V2 隔离样板");
}
async function screenshot(name) { await page.screenshot({ path: path.join(out, name + ".png") }); }
async function noOverflow() {
  const result = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth,
    regions: [...document.querySelectorAll(".v2-page-region,.v2-detail-scroll,.v2-cook-scroll,.v2-sheet")].map((node) => ({ width: node.clientWidth, scroll: node.scrollWidth })) }));
  assert(result.body <= result.width + 1 && result.document <= result.width + 1, JSON.stringify(result));
  assert(result.regions.every((region) => region.scroll <= region.width + 1), JSON.stringify(result));
}
async function largeText() {
  await page.getByRole("button", { name: "样板设置", exact: true }).click();
  await page.getByRole("checkbox", { name: "200% 字号", exact: true }).check();
  await page.getByRole("button", { name: "查看样板", exact: true }).click();
  assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).fontSize), "32px");
}
async function readableTextEnd(locator, regionSelector) {
  const result = await locator.evaluate((node, selector) => {
    const region = node.closest(selector);
    if (!region) throw new Error(`Missing scrolling region: ${selector}`);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let lastText = null;
    for (let text = walker.nextNode(); text; text = walker.nextNode()) if (text.textContent.trim()) lastText = text;
    if (!lastText) throw new Error("Expected readable text");
    const end = lastText.textContent.trimEnd().length;
    const range = document.createRange();
    range.setStart(lastText, end - 1); range.setEnd(lastText, end);
    const regionRect = region.getBoundingClientRect();
    const top = Math.max(0, regionRect.top + region.clientTop);
    let bottom = Math.min(innerHeight, regionRect.top + region.clientTop + region.clientHeight);
    // The refreshed controls overlap scrolling content; visibility stops at the
    // control bar, not the scrolling region's now-hidden bottom edge.
    // A portalled Sheet has its own viewport above those background controls.
    if (!region.closest(".v2-portal")) {
      for (const footer of document.querySelectorAll(".v2-bottom-actions,.v2-cook-footer")) {
        const rect = footer.getBoundingClientRect();
        if (rect.width && rect.height && rect.top > regionRect.top && rect.top < bottom
          && rect.right > regionRect.left && rect.left < regionRect.right) bottom = rect.top;
      }
    }
    // Scroll the actual region to the final character, rather than treating off-screen DOM as visible.
    region.scrollTop += range.getBoundingClientRect().bottom - bottom + 12;
    const tail = range.getBoundingClientRect();
    const style = getComputedStyle(node);
    return { text: node.textContent, scrollTop: region.scrollTop, visible: tail.width > 0 && tail.height > 0
      && tail.top >= top - 1 && tail.bottom <= bottom + 1 && tail.left >= -1 && tail.right <= innerWidth + 1,
      unclipped: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1
        && style.textOverflow !== "ellipsis" && style.webkitLineClamp === "none",
      tail: { top: tail.top, bottom: tail.bottom, left: tail.left, right: tail.right }, top, bottom };
  }, regionSelector);
  assert(result.visible && result.unclipped, JSON.stringify(result));
  return result;
}
async function reachableControl(locator) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      viewportWidth: innerWidth, viewportHeight: innerHeight, client: node.clientHeight, scroll: node.scrollHeight };
  });
  assert(result.width >= 48 && result.height >= 48 && result.left >= -1 && result.right <= result.viewportWidth + 1
    && result.top >= -1 && result.bottom <= result.viewportHeight + 1 && result.scroll <= result.client + 1, JSON.stringify(result));
}
async function restoredFocus(originalTarget) {
  assert(originalTarget, "Expected the original overlay trigger");
  try {
    // Portal removal and Base UI focus cleanup can finish on different frames.
    // Require the captured original node, without focusing it from the test.
    await page.waitForFunction((node) => node.isConnected && node === document.activeElement,
      originalTarget, { polling: "raf", timeout: 2000 });
    assert(await originalTarget.evaluate((node) => node === document.activeElement));
  } finally { await originalTarget.dispose(); }
}
async function keyboardFocus(locator) {
  for (let i = 0; i < 24; i++) {
    if (await locator.evaluate((node) => node === document.activeElement && node.matches(":focus-visible"))) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard focus did not reach ${await locator.getAttribute("aria-label") || await locator.textContent()}`);
}
async function darkFocusContrast(locator, surfaceSelector) {
  await keyboardFocus(locator);
  const result = await locator.evaluate((node, selector) => {
    const style = getComputedStyle(node);
    return { color: style.outlineColor, style: style.outlineStyle, width: parseFloat(style.outlineWidth),
      background: getComputedStyle(node.closest(selector)).backgroundColor };
  }, surfaceSelector);
  function channels(color) {
    const values = color.match(/[\d.]+/g)?.map(Number);
    assert(values?.length >= 3, `Unsupported computed color: ${color}`);
    return [...values.slice(0, 3), values[3] ?? 1];
  }
  function composite(foreground, background) {
    return foreground.slice(0, 3).map((channel, i) => channel * foreground[3] + background[i] * (1 - foreground[3]));
  }
  function luminance(rgb) {
    const values = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  const background = channels(result.background), outline = channels(result.color);
  // A translucent Sheet must not be measured as though its RGB values were opaque.
  // Black/white underlays bound the local tint's luminance; this checks this focus ring,
  // not every text/background pair or a complete accessibility conformance claim.
  const contrasts = [0, 255].map((value) => {
    const surface = composite(background, [value, value, value]);
    const ring = luminance(composite(outline, surface)), fill = luminance(surface);
    return (Math.max(ring, fill) + 0.05) / (Math.min(ring, fill) + 0.05);
  });
  assert(result.style === "solid" && result.width >= 2 && Math.min(...contrasts) >= 3,
    JSON.stringify({ ...result, contrastsOverBlackAndWhite: contrasts }));
}
try {
  await check("390 Home identity, no overlay and meaningful content", async () => {
    await open(); assert.equal(await page.getByRole("navigation", { name: "主导航" }).getByRole("button").count(), 3);
    await page.getByRole("heading", { name: "最近加入" }).waitFor(); await screenshot("home-390"); await noOverflow();
  });
  await check("Home photos load as actual local generated fixtures", async () => {
    const images = await page.locator(".v2-recent-card img").evaluateAll((nodes) => nodes.map((node) => ({ complete: node.complete, width: node.naturalWidth, source: node.currentSrc })));
    assert.equal(images.length, 3); assert(images.every((image) => image.complete && image.width === 1000 && image.source.startsWith("http://127.0.0.1:5182/")));
  });
  await check("Search and detail return preserve local query; no network service", async () => {
    await page.getByRole("searchbox", { name: "搜索我的菜谱" }).fill("鸡翅");
    await page.getByRole("button", { name: "打开可乐鸡翅", exact: true }).click(); await screenshot("detail-390");
    await page.getByRole("button", { name: "返回菜谱", exact: true }).click();
    assert.equal(await page.getByRole("searchbox", { name: "搜索我的菜谱" }).inputValue(), "鸡翅");
  });
  await check("Add Sheet four choices, background focus isolation, Escape restores focus", async () => {
    const trigger = page.getByRole("button", { name: "新增菜谱", exact: true });
    const originalTarget = await trigger.elementHandle(); await trigger.click();
    const dialog = page.getByRole("dialog", { name: "添加菜谱", exact: true }); await dialog.waitFor();
    assert.equal(await dialog.locator(".v2-action-list > button").count(), 4); await screenshot("add-sheet-390");
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    assert(await dialog.evaluate((node) => node.contains(document.activeElement)));
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    await restoredFocus(originalTarget);
  });
  await check("Full detail steps, Guided navigation and explicit completion", async () => {
    await open("?screen=detail"); assert.equal(await page.getByRole("button", { name: /单步查看步骤/ }).count(), 6);
    await page.getByRole("button", { name: "开始烹饪", exact: true }).click();
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
    const background = await page.locator(".v2-cook-instruction").evaluate((node) => getComputedStyle(node.closest(".v2-cooking")).backgroundColor);
    assert.equal(background, darkBackgrounds[theme]); await screenshot("cooking-390");
    assert.equal(await page.getByRole("button", { name: "完成这道菜", exact: true }).count(), 0);
    await page.getByRole("button", { name: "查看食材", exact: true }).click();
    const ingredients = page.getByRole("dialog", { name: "食材清单", exact: true }); await ingredients.waitFor();
    assert.equal(await ingredients.getByRole("checkbox").count(), 0); await screenshot("ingredients-390");
    await page.keyboard.press("Escape"); await ingredients.waitFor({ state: "hidden" });
    await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByRole("button", { name: "完成这道菜", exact: true }).click();
    assert(await page.getByRole("button", { name: "完成这道菜", exact: true }).isDisabled());
    await page.getByText("演示完成确认。未写入任何做菜记录。", { exact: true }).waitFor();
  });
  await check("Focus never exposes cooking completion", async () => {
    await open("?screen=detail"); await page.getByRole("button", { name: "单步查看步骤 6", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "完成这道菜", exact: true }).count(), 0);
    assert(await page.getByRole("button", { name: "下一步", exact: true }).isDisabled());
  });
  await check("Component six-state controls and explicit review gate", async () => {
    await open("?screen=components"); await screenshot("components-390");
    assert.equal(await page.locator(".v2-button-sample").count(), 24);
    const save = page.getByRole("button", { name: "保存审核样例", exact: true }); assert(await save.isDisabled());
    await page.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容", exact: true }).check();
    await save.click(); await page.getByText("样例已确认；未写入任何正式菜谱。", { exact: true }).waitFor();
  });
  for (const width of [320, 390, 412, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const screen of ["home", "detail", "cooking"]) {
      await check(`${width} ${screen} no horizontal overflow`, async () => {
        await open(`?screen=${screen}&mode=focus`); await noOverflow();
        if (width === 320) await screenshot(`${screen}-320`);
      });
    }
  }
  await page.setViewportSize({ width: 320, height: 844 });
  for (const [scenario, screen] of [["no-image", "detail"], ["title-only", "detail"], ["long", "detail"], ["long", "cooking"], ["empty", "home"]]) {
    await check(`320 ${scenario} ${screen} valid readable state`, async () => {
      await open(`?screen=${screen}&scenario=${scenario}`); await noOverflow();
      if (scenario === "title-only") { assert.equal(await page.locator(".v2-detail-hero").count(), 0); await page.getByRole("button", { name: "补充做法", exact: true }).waitFor(); }
      if (scenario === "empty") await page.getByRole("button", { name: "添加第一道菜", exact: true }).waitFor();
      await screenshot(`${screen}-${scenario}-320`);
    });
  }
  await check("320 broken local cover falls back without hiding detail content or actions", async () => {
    await open("?screen=detail&scenario=broken-image");
    await page.getByText("图片暂不可用", { exact: true }).waitFor();
    await page.getByRole("heading", { name: "可乐鸡翅", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /单步查看步骤/ }).count(), 6);
    const start = page.getByRole("button", { name: "开始烹饪", exact: true });
    await reachableControl(start); await start.click();
    await page.getByText("第 1 步／共 6 步", { exact: true }).waitFor(); await noOverflow();
  });
  for (const screen of ["home", "detail", "cooking", "components"]) {
    await check(`320 ${screen} 200% root text has no horizontal overflow`, async () => {
      await open(`?screen=${screen}`);
      await page.getByRole("button", { name: "样板设置", exact: true }).click();
      await page.getByRole("checkbox", { name: "200% 字号", exact: true }).check();
      await page.getByRole("button", { name: "查看样板", exact: true }).click();
      assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).fontSize), "32px");
      await noOverflow(); await screenshot(`${screen}-200-text-320`);
    });
  }
  for (const screen of ["detail", "cooking"]) {
    await check(`320 long ${screen} with 200% text retains unclipped footer actions`, async () => {
      await open(`?screen=${screen}&scenario=long`);
      await page.getByRole("button", { name: "样板设置", exact: true }).click();
      await page.getByRole("checkbox", { name: "200% 字号", exact: true }).check();
      await page.getByRole("button", { name: "查看样板", exact: true }).click();
      await noOverflow();
      const actions = await page.locator(".v2-bottom-actions button,.v2-cook-footer button").evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, bottom: rect.bottom, top: rect.top, client: node.clientHeight, scroll: node.scrollHeight };
      }));
      assert(actions.length >= 2);
      assert(actions.every((a) => a.width >= 48 && a.height >= 48 && a.top >= 0 && a.bottom <= 845 && a.scroll <= a.client + 1), JSON.stringify(actions));
      await screenshot(`${screen}-long-200-text-320`);
    });
  }
  for (const screen of ["detail", "cooking"]) {
    await check(`320 long ${screen} with 200% text scrolls its complete final line into view`, async () => {
      await open(`?screen=${screen}&scenario=long`); await largeText();
      const instruction = page.locator(screen === "detail" ? ".v2-step-list > li:first-child p" : ".v2-cook-instruction");
      const result = await readableTextEnd(instruction, screen === "detail" ? ".v2-detail-scroll" : ".v2-cook-scroll");
      assert(result.text.endsWith("保持小火，观察鸡翅颜色与汤汁状态，必要时轻轻翻动。".repeat(14)));
      assert(result.scrollTop > 0, "Long text must actually scroll before its last line can be read");
      if (screen === "detail") await readableTextEnd(page.locator(".v2-notes"), ".v2-detail-scroll");
      await noOverflow(); await screenshot(`${screen}-long-200-text-end-320`);
    });
  }
  await check("320 long ingredients with 200% text preserve the full amount, final row and safe close", async () => {
    await open("?screen=cooking&scenario=long"); await largeText();
    const trigger = page.getByRole("button", { name: "查看食材", exact: true });
    const originalTarget = await trigger.elementHandle(); await trigger.click();
    const dialog = page.getByRole("dialog", { name: "食材清单", exact: true }); await dialog.waitFor();
    assert.equal(await dialog.getByRole("checkbox").count(), 0);
    const amount = await readableTextEnd(dialog.locator(".v2-ingredients dd").first(), ".v2-sheet");
    assert.equal(amount.text, "500 克，按实际使用量填写，不自动缩放");
    await screenshot("ingredients-long-200-text-amount-320");
    await readableTextEnd(dialog.locator(".v2-ingredients dd").last(), ".v2-sheet");
    const close = dialog.getByRole("button", { name: "关闭食材清单", exact: true });
    await reachableControl(close); await close.click(); await dialog.waitFor({ state: "hidden" });
    await restoredFocus(originalTarget);
    await page.getByText("第 1 步／共 6 步", { exact: true }).waitFor(); await noOverflow();
  });
  await check("320 Add Sheet with 200% text reaches and activates its last choice", async () => {
    await open(); await largeText();
    const trigger = page.getByRole("button", { name: "新增菜谱", exact: true });
    const originalTarget = await trigger.elementHandle(); await trigger.click();
    const dialog = page.getByRole("dialog", { name: "添加菜谱", exact: true }); await dialog.waitFor();
    const lastChoice = dialog.locator(".v2-action-list > button").last();
    assert((await lastChoice.textContent()).startsWith("帮我找做法"));
    await reachableControl(lastChoice); await noOverflow(); await screenshot("add-sheet-last-choice-200-text-320");
    await lastChoice.click();
    const explanation = page.getByRole("dialog", { name: "样板功能说明", exact: true }); await explanation.waitFor();
    await explanation.getByText(/已选择「帮我找做法」/).waitFor();
    const dismiss = explanation.getByRole("button", { name: "知道了", exact: true });
    await reachableControl(dismiss); await dismiss.click(); await explanation.waitFor({ state: "hidden" });
    await restoredFocus(originalTarget);
  });
  await check("320 Guided with 200% text reaches the final step and completes only after explicit activation", async () => {
    await open("?screen=cooking&scenario=long"); await largeText();
    const notice = page.getByText("演示完成确认。未写入任何做菜记录。", { exact: true });
    assert.equal(await notice.count(), 0);
    for (let step = 1; step < 6; step++) {
      assert.equal(await page.getByRole("button", { name: "完成这道菜", exact: true }).count(), 0);
      const next = page.getByRole("button", { name: "下一步", exact: true });
      await reachableControl(next); await next.click();
      await page.getByText(`第 ${step + 1} 步／共 6 步`, { exact: true }).waitFor();
      assert.equal(await notice.count(), 0);
    }
    await readableTextEnd(page.locator(".v2-cook-instruction"), ".v2-cook-scroll");
    const complete = page.getByRole("button", { name: "完成这道菜", exact: true });
    await reachableControl(complete); assert(await complete.isEnabled()); await complete.dblclick();
    assert(await complete.isDisabled()); assert.equal(await notice.count(), 1);
    await readableTextEnd(notice, ".v2-cook-scroll"); await noOverflow(); await screenshot("guided-complete-200-text-320");
  });
  await check("Dark cooking controls and portalled Sheet have visible keyboard focus with at least 3:1 contrast", async () => {
    await open("?screen=cooking"); await largeText();
    await darkFocusContrast(page.getByRole("button", { name: "下一步", exact: true }), ".v2-cooking");
    await screenshot("cooking-focus-200-text-320");
    const trigger = page.getByRole("button", { name: "查看食材", exact: true });
    const originalTarget = await trigger.elementHandle();
    await keyboardFocus(trigger); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "食材清单", exact: true }); await dialog.waitFor();
    await darkFocusContrast(dialog.getByRole("button", { name: "关闭食材清单", exact: true }), ".v2-sheet");
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const focus = await dialog.evaluate((node) => {
        const active = document.activeElement;
        return { inside: node.contains(active), ownedGuard: active?.hasAttribute("data-base-ui-focus-guard")
          && (active === node.previousElementSibling || active === node.nextElementSibling), active: active?.outerHTML.slice(0, 240) };
      });
      assert(focus.inside || focus.ownedGuard, JSON.stringify(focus));
      if (!focus.inside) {
        // Base UI's adjacent guard queues wraparound focus on requestAnimationFrame.
        // Wait for that DOM condition; a background target or a stuck guard still fails.
        const popup = await dialog.elementHandle();
        try {
          await page.waitForFunction((node) => node.isConnected && node.contains(document.activeElement), popup, { polling: "raf", timeout: 2000 });
        } finally { await popup.dispose(); }
      }
      assert(await dialog.evaluate((node) => node.contains(document.activeElement)));
    }
    await screenshot("ingredients-focus-200-text-320");
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    await restoredFocus(originalTarget);
  });
  for (const screen of ["detail", "cooking"]) {
    await check(`${screen} step photo opens a local preview and returns keyboard focus`, async () => {
      await open(`?screen=${screen}${screen === "cooking" ? "&mode=focus" : ""}`);
      const trigger = page.getByRole("button", { name: "查看步骤 3 大图", exact: true });
      const originalTarget = await trigger.elementHandle(); await trigger.click();
      const dialog = page.getByRole("dialog", { name: "步骤 3 图片", exact: true }); await dialog.waitFor();
      const image = await dialog.locator("img").evaluate(async (node) => {
        await node.decode();
        return { complete: node.complete, width: node.naturalWidth, source: node.currentSrc };
      });
      assert(image.complete && image.width > 0 && image.source.startsWith("http://127.0.0.1:5182/"));
      await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
      await restoredFocus(originalTarget);
      if (screen === "cooking") await page.getByText("第 3 步／共 6 步", { exact: true }).waitFor();
    });
  }
  await check("Reduced motion and solid fallback retain navigation behavior", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" }); await open();
    await page.getByRole("button", { name: "样板设置", exact: true }).click();
    await page.getByRole("checkbox", { name: "实体玻璃回退", exact: true }).check();
    await page.getByRole("button", { name: "查看样板", exact: true }).click();
    assert.equal(await page.locator(".v2-bottom-nav").evaluate((node) => getComputedStyle(node).backdropFilter), "none");
    await page.getByRole("navigation", { name: "主导航" }).getByRole("button", { name: "菜谱", exact: true }).click();
    await page.getByRole("heading", { name: "我的菜谱", exact: true }).waitFor();
  });
  await check("No demo persistence, cookies or external requests", async () => {
    const storage = await page.evaluate(async () => ({ indexedDb: await indexedDB.databases(), local: localStorage.length, session: sessionStorage.length }));
    assert.deepEqual(storage, { indexedDb: [], local: 0, session: 0 }); assert.equal((await context.cookies()).length, 0); assert.deepEqual(external, []);
  });
  assert.deepEqual(errors, [], "Relevant browser errors: " + JSON.stringify(errors));
  assert.equal((await uiV2EvidenceSource(root)).fingerprint, testedSource.fingerprint, "Showcase/QA source changed during verification");
  await writeFile(path.join(out, "results.json"), JSON.stringify({ status: "PASS", date: new Date().toISOString(), theme, browser: browser.version(), source: "Actual DEV showcase; existing Playwright runtime; original G1 regression matrix rerun", contrastScope: "Dark focus outlines over their local tint composited on both black and white; not a full accessibility audit", checks, errors, externalRequests: external.length, notRun: ["Android IME", "TalkBack", "user phone", "OEM", "same-device performance comparison", "production G2-G4", "user visual acceptance"] }, null, 2));
  await writeFile(path.join(out, "source-provenance.json"), JSON.stringify(testedSource, null, 2));
  console.log(JSON.stringify({ status: "PASS", theme, checks: checks.length, browser: browser.version(), evidence: out }));
} catch (error) {
  await screenshot("failure").catch(() => {});
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    return active ? { tag: active.tagName.toLowerCase(), role: active.getAttribute("role"),
      label: active.getAttribute("aria-label") ?? active.textContent?.trim().slice(0, 120) ?? "",
      inDialog: !!active.closest('[role="dialog"]'), focusGuard: active.hasAttribute("data-base-ui-focus-guard") } : null;
  }).catch(() => ({ unavailable: true }));
  await writeFile(path.join(out, "failure.json"), JSON.stringify({ message: String(error), passedChecks: checks, errors, external, focus }, null, 2));
  throw error;
} finally { await browser.close(); }
