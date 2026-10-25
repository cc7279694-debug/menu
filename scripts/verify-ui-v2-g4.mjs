// G4 fresh browser evidence. Only generated data in ephemeral browser contexts.
// Reuses the accepted QA suites; production source and historical evidence stay intact.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const option = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runtime = option("runtime", "C:/Users/CDD/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules");
const out = path.resolve(option("out", `output/playwright/ui-v2/g4/browser/run-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`));
assert(out.startsWith(path.join(root, "output", "playwright", "ui-v2", "g4") + path.sep), "Evidence must stay in a new G4 directory");
await mkdir(path.dirname(out), { recursive: true });
await mkdir(out, { recursive: false });
const suites = option("suites", "production,foundation,settings-dialogs,built-cooking,intake,supplemental").split(",");
const supplementalSections = new Set(option("supplemental-sections", "layout,image-contrast,contrast").split(","));
const gitRead = args => {
  const read = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(read.status, 0, `Read-only Git metadata failed: ${args.join(" ")}`);
  return read.stdout.trim();
};
const manifest = { startedAt: new Date().toISOString(), productionSourceBaseline: "e182a72", head: gitRead(["rev-parse", "HEAD"]),
  workingTreeStatus: gitRead(["status", "--short"]), productionDiff: gitRead(["diff", "--", "src/native"]),
  runnerSha256: createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"),
  requestedSuites: suites, requestedSupplementalSections: [...supplementalSections], runtime, out, runs: [],
  boundaries: "Browser only; generated data; real production components/services/repository with fake external ports. Android/IME/TalkBack/device performance NOT_RUN." };
const allowed = new Set(["production", "foundation", "settings-dialogs", "built-cooking", "intake", "supplemental"]);
assert(suites.every(name => allowed.has(name)), "Unknown suite");

async function replay(name) {
  const original = path.join(root, "scripts", `verify-ui-v2-${name}.mjs`);
  let source = await readFile(original, "utf8");
  const sha256 = createHash("sha256").update(source).digest("hex");
  const suiteOut = path.join(out, name);
  const transforms = ["G4 output directory", "stable original repository/require resolution"];
  source = source.replaceAll('createRequire(import.meta.url)', `createRequire(${JSON.stringify(path.join(root, "package.json"))})`)
    .replaceAll('fileURLToPath(new URL("../", import.meta.url))', JSON.stringify(root));
  const urlImport = /import \{ fileURLToPath \} from "node:url";\r?\n/;
  if (urlImport.test(source) && !source.replace(urlImport, "").includes("fileURLToPath")) {
    source = source.replace(urlImport, "");
    transforms.push("remove now-unused fileURLToPath import after stable root resolution");
  }
  if (name === "production") source = source.replace('const out = path.join(root, "output/playwright/ui-v2/g2/browser");', `const out = ${JSON.stringify(suiteOut)};`);
  if (name === "settings-dialogs") source = source.replace('path.resolve("output/playwright/ui-v2/g3-foundation/settings-dialogs")', JSON.stringify(suiteOut));
  if (name === "intake") source = source.replace('path.resolve("output/playwright/ui-v2/g3-remainder/browser")', JSON.stringify(suiteOut));
  if (name === "intake") {
    const before = /await gate\.scrollIntoViewIfNeeded\(\); await capture\(page, "04-ai-review-confirmation-gate"\);\r?\n    await gate\.check\(\);/;
    const after = 'await gate.scrollIntoViewIfNeeded(); await gate.check();\n    assert.equal(await gate.isChecked(), true); await capture(page, "04-ai-review-confirmation-gate");';
    assert(before.test(source), "Expected existing Review photography boundary");
    source = source.replace(before, after);
    transforms.push("Review checkbox action and checked assertion before full-page photography (known G3 constraint)");
  }
  assert(source.includes("await page.goto("), "Expected existing navigation boundary");
  const consoleLevels = name === "intake" ? '["warn"]' : '["error","warn"]';
  source = source.replace("await page.goto(", `page.on("console", message => { if (${consoleLevels}.includes(message.type())) errors.push("console " + message.type() + ": " + message.text()); });\n  await page.goto(`);
  transforms.push("record console warnings/errors in existing runtime-error assertion (intake already records errors)");
  // All legacy suites already observe external requests; explicitly abort them too.
  // Intake owns a fresh route guard for each of its ephemeral contexts.
  if (name !== "intake") {
    const guard = `await context.route("**/*", route => { const u = new URL(route.request().url()); if (["http:","https:"].includes(u.protocol) && !["http://127.0.0.1:5184","http://127.0.0.1:5186"].includes(u.origin)) return route.abort(); return route.continue(); });\n`;
    assert(source.includes("const page = await context.newPage()"), "Expected legacy context boundary");
    source = source.replace("const page = await context.newPage()", guard + "const page = await context.newPage()");
    transforms.push("abort off-origin HTTP(S) before navigation");
  }
  const runner = path.join(out, `replay-${name}.mjs`);
  await writeFile(runner, source);
  console.log(`RUN ${name}`);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, `--runtime=${runtime}`, `--out=${suiteOut}`], { cwd: root, windowsHide: true });
    let log = "";
    child.stdout.on("data", chunk => { log += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", chunk => { log += chunk; process.stderr.write(chunk); });
    child.on("error", reject);
    child.on("close", code => resolve({ code, log }));
  });
  await writeFile(path.join(out, `${name}.log`), run.log);
  const results = await readFile(path.join(suiteOut, "results.json"), "utf8").then(JSON.parse).catch(() => null);
  const files = await readdir(suiteOut).catch(() => []);
  const record = { name, original: path.relative(root, original), originalSha256: sha256, transforms,
    status: run.code === 0 ? "PASS" : "FAIL", exitCode: run.code, groupedChecks: results?.checks?.length ?? 0,
    screenshots: files.filter(file => file.endsWith(".png")).length, results: path.join(suiteOut, "results.json"),
    failure: results?.failure ?? (run.code === 0 ? null : run.log.slice(-3000)) };
  manifest.runs.push(record);
  await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function supplemental() {
  const require = createRequire(import.meta.url);
  const { chromium } = require(require.resolve("playwright", { paths: [root, runtime] }));
  const base = "http://127.0.0.1:5184/", moduleBase = `/@fs/${root.replaceAll("\\", "/")}src/native/`;
  const supplementOut = path.join(out, "supplemental"); await mkdir(supplementOut);
  const browser = await chromium.launch({ headless: true });
  const checks = [], geometry = [], focus = [], colors = [], captures = [], errors = [], external = [], consoleMessages = [];
  const result = { status: "RUNNING", checks, geometry, focus, colors, captures, errors, external, consoleMessages, tokenDiagnostics: [],
    scope: "Real production UI, generated legal long text and generated/corrupt local media in new browser IndexedDB. Synthetic recipio:back only tests routing. Root font 16/32px is browser CSS scaling, not Android font/IME/TalkBack. Solid data attribute is CSS contract emulation, not unsupported-WebView or device performance proof." };
  let activePage;
  const open = async (theme = "warm-ivory") => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN", reducedMotion: "reduce", serviceWorkers: "block" });
    await context.addInitScript(theme => localStorage.setItem("recipio.ui-v2.theme.v1", theme), theme);
    await context.route("**/*", route => {
      const u = new URL(route.request().url());
      if (["http:", "https:"].includes(u.protocol) && u.origin !== new URL(base).origin) { external.push(u.origin); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); activePage = page;
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (["error", "warn"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }); });
    await page.goto(base); await page.getByRole("button", { name: "新增菜谱", exact: true }).waitFor();
    assert.equal(await page.title(), "谱序 RECIPIO");
    assert.equal(await page.locator("vite-error-overlay").count(), 0, "No framework error overlay");
    return { page, context };
  };
  const settle = page => page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const capture = async (page, name) => {
    assert(!captures.includes(`${name}.png`), `Capture filename already used: ${name}`);
    await settle(page); await page.screenshot({ path: path.join(supplementOut, `${name}.png`) }); captures.push(`${name}.png`);
  };
  const check = async (name, action) => { await action(); checks.push(name); console.log(`PASS supplemental/${name}`); };
  async function layout(page, name) {
    await settle(page);
    const measured = await page.evaluate(() => {
      const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden]");
      const controls = [...document.querySelectorAll('.v2-production :is(button,input,textarea,select),.v2-production-cooking button,.v2-portal button,.v2-themed-dialog button')].filter(visible);
      // A native checkbox's enclosing label is its real tap target.
      const small = controls.map(el => el.matches('input[type="radio"],input[type="checkbox"]') ? el.closest("label") ?? el : el)
        .filter(el => { const r = el.getBoundingClientRect(); return r.width < 47.9 || r.height < 47.9; })
        .map(el => ({ label: el.getAttribute("aria-label") ?? el.textContent?.slice(0, 70), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
      const content = [...document.querySelectorAll('.v2-detail-body :is(h1,h2,h3,p,dt,dd),.v2-cook-scroll :is(h1,p),.v2-sheet :is(dt,dd),.v2-settings-about')].filter(visible);
      const clipped = content.filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1; })
        .map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 70), width: el.clientWidth, scrollWidth: el.scrollWidth }));
      return { width: innerWidth, height: innerHeight, font: getComputedStyle(document.documentElement).fontSize,
        scrollWidth: document.documentElement.scrollWidth, checkedControls: controls.length, small, clipped };
    });
    geometry.push({ name, ...measured });
    assert(measured.scrollWidth <= measured.width + 1, `${name}: document overflow`);
    assert.deepEqual(measured.small, [], `${name}: targets below48px`);
    assert.deepEqual(measured.clipped, [], `${name}: text horizontal clipping`);
  }
  async function trap(page, dialog, name) {
    await settle(page);
    await page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]'));
    assert(await dialog.evaluate(el => el.contains(document.activeElement)), `${name}: initial focus`);
    for (const key of ["Tab", "Shift+Tab"]) for (let i = 0; i < 12; i++) {
      await page.keyboard.press(key);
      // Base UI FloatingFocusManager explicitly enqueues focus-guard wrap in rAF.
      // Wait only for that library transition; the actual containment assertion stays.
      await page.waitForFunction(() => !document.activeElement?.matches("[data-base-ui-focus-guard]"), undefined, { polling: "raf" });
      const focused = await dialog.evaluate(el => ({ contained: el.contains(document.activeElement),
        active: document.activeElement?.outerHTML?.slice(0, 2000), dialog: el.outerHTML.slice(0, 700) }));
      focus.push({ name, key, iteration: i + 1, ...focused });
      assert(focused.contained, `${name}: ${key} escapes modal`);
    }
    focus.push({ name, initialInside: true, forwardTabs: 12, reverseTabs: 12, trapped: true });
  }
  async function returned(trigger, name) {
    await trigger.page().waitForFunction(selector => {
      const elements = [...document.querySelectorAll("button")];
      return elements.some(el => (el.getAttribute("aria-label") ?? el.textContent)?.trim() === selector && el === document.activeElement);
    }, name);
    assert(await trigger.evaluate(el => el === document.activeElement), `${name}: focus must return to invoker`);
    focus.push({ name, returnedToInvoker: true });
  }
  const back = page => page.evaluate(() => { const event = new Event("recipio:back", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
  try {
    const { page, context } = await open();
    await check("home_ready_by_production_root_and_add_button_not_legacy_slogan", async () => {
      const ready = await page.evaluate(() => ({ productionRoot: !!document.querySelector('.recipio-ui-v2.v2-production'),
        legacySloganInBody: document.body.innerText.includes("自己的做法，随时翻开"),
        addButtons: [...document.querySelectorAll('button')].filter(el => el.getAttribute('aria-label') === "新增菜谱").length }));
      assert.equal(ready.productionRoot, true); assert.equal(ready.legacySloganInBody, false); assert(ready.addButtons > 0);
      result.homeReadiness = ready;
    });
    const seeded = await page.evaluate(async moduleBase => {
      const { PreviewRecipeLibrary } = await import(moduleBase + "preview-store.ts");
      const { emptyDetails, recipeDetailsSchema } = await import(moduleBase + "recipe-model.ts");
      const { saveLocalImage } = await import(moduleBase + "media.ts");
      const store = new PreviewRecipeLibrary();
      const title = ("G4 GENERATED 只有自己知道的家常菜长标题".repeat(8)).slice(0, 120);
      const ingredient = "G4长食材名称含有来源说明以及需要辨认的完整文字".repeat(10);
      const amount = ("少量按实际口味调整并保留原始用量说明".repeat(30)).slice(0, 500);
      const step = "G4受控长步骤：保持小火并观察锅中食材的变化，必要时补少量清水，文字应完整保留且可以滚动阅读。".repeat(48);
      const details = recipeDetailsSchema.parse({ ...emptyDetails(title), servings: 3, totalMinutes: 60,
        ingredients: [{ name: ingredient, amount }, { name: "水", amount: "适量" }],
        steps: [{ instruction: step, imagePath: null }, { instruction: "G4 结束标记：关火后确认文字可达。", imagePath: null }],
        notes: "G4 GENERATED 非用户数据。长内容底部结束标记。" });
      const long = await store.createDetails(details);
      const missing = await store.createDetails({ ...emptyDetails("G4 GENERATED 缺失本地图片"), coverPath: `images/${crypto.randomUUID()}.png`, steps: [{ instruction: "本地文件缺失时保留这段真实文字。", imagePath: null }] });
      const corruptPath = await saveLocalImage(new File([new Uint8Array([1, 2, 3, 4])], "g4-controlled-invalid.png", { type: "image/png" }));
      const corrupt = await store.createDetails({ ...emptyDetails("G4 GENERATED 图片解码失败"), coverPath: corruptPath, steps: [{ instruction: "本地图片加载失败时仍然保留步骤。", imagePath: corruptPath }] });
      return { title, id: long.id, missing: missing.title, corrupt: corrupt.title,
        lengths: { title: title.length, ingredient: ingredient.length, amount: amount.length, step: step.length } };
    }, moduleBase);
    result.testData = seeded;
    await page.reload();
    await page.getByRole("button", { name: `打开 ${seeded.title}`, exact: true }).first().waitFor();
    await settle(page);
    const renderedNoImage = await page.locator('.v2-recent-card > [role="img"],.v2-recipe-row > [role="img"]').evaluateAll(elements => elements.map(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { text: el.textContent, surface: el.closest(".v2-recent-card") ? "recent-card" : "library-row", role: el.getAttribute("role"), foreground: s.color, background: s.backgroundColor,
        fontSize: s.fontSize, fontWeight: s.fontWeight, opacity: s.opacity, disabled: !!el.closest(":disabled"),
        width: r.width, height: r.height, html: el.outerHTML };
    }));
    assert(renderedNoImage.length >= 1, "Generated no-image surface must be rendered before contrast measurement");
    result.renderedNoImage = renderedNoImage;
    await capture(page, "warm-ivory-initial-generated-no-image-390-100");
    if (supplementalSections.has("layout")) {
    await check("add_sheet_focus_trap_escape_and_native_back_return", async () => {
      const trigger = page.getByRole("button", { name: "新增菜谱", exact: true });
      for (const close of ["Escape", "back"]) {
        await trigger.click(); const dialog = page.getByRole("dialog", { name: "添加菜谱", exact: true }); await dialog.waitFor();
        await trap(page, dialog, `add/${close}`); await layout(page, `add/${close}`);
        if (close === "Escape") await page.keyboard.press("Escape"); else assert.equal(await back(page), true);
        await dialog.waitFor({ state: "hidden" }); await returned(trigger, "新增菜谱");
      }
    });
    await page.getByRole("button", { name: `打开 ${seeded.title}`, exact: true }).first().click();
    await check("longest_legal_title_long_ingredient_amount_steps_all_widths_100_200", async () => {
      assert.equal(seeded.lengths.title, 120); assert.equal(seeded.lengths.amount, 500);
      assert.equal(await page.locator(".v2-detail-title").textContent(), seeded.title);
      assert.equal(await page.locator(".v2-detail-hero").count(), 0, "No-image recipe uses inline navigation");
      for (const width of [320, 390, 412, 768]) for (const font of [16, 32]) {
        await page.setViewportSize({ width, height: 844 }); await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; scrollTo(0, 0); }, font);
        await layout(page, `long-detail/${width}/${font}`);
        if (font === 32) await capture(page, `long-no-image-${width}-200-top`);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await settle(page);
        const clearance = await page.evaluate(() => ({ lastBottom: document.querySelector('.v2-detail-body > section:last-child').getBoundingClientRect().bottom,
          barTop: document.querySelector('.v2-bottom-actions').getBoundingClientRect().top }));
        geometry.push({ name: `long-detail-clearance/${width}/${font}`, ...clearance });
        assert(clearance.lastBottom <= clearance.barTop + 1, "Long detail final content must clear fixed controls");
      }
      await capture(page, "long-no-image-768-200-bottom");
    });
    await page.setViewportSize({ width: 768, height: 844 });
    await check("long_guided_body_scroll_and_nested_ingredients_back_focus", async () => {
      const trigger = page.getByRole("button", { name: "开始引导烹饪", exact: true }); await trigger.click();
      const dialog = page.getByRole("dialog", { name: "引导烹饪", exact: true }); await dialog.waitFor(); await trap(page, dialog, "long-guided");
      await layout(page, "long-guided/768/200");
      await dialog.locator(".v2-cook-scroll").evaluate(el => { el.scrollTop = el.scrollHeight; });
      const body = await dialog.locator(".v2-cook-scroll").evaluate(el => ({ scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        textBottom: el.querySelector(".v2-cook-instruction").getBoundingClientRect().bottom, footerTop: document.querySelector(".v2-cook-footer").getBoundingClientRect().top }));
      geometry.push({ name: "long-guided-scroll", ...body }); assert(body.scrollTop > 0); assert(body.textBottom <= body.footerTop + 1);
      await capture(page, "long-guided-768-200-bottom");
      const ingredientsTrigger = dialog.getByRole("button", { name: "查看食材", exact: true }); await ingredientsTrigger.click();
      const ingredients = page.getByRole("dialog", { name: "食材", exact: true }); await ingredients.waitFor();
      await trap(page, ingredients, "long-ingredients"); await layout(page, "long-ingredients/768/200"); await capture(page, "long-ingredients-768-200");
      await ingredients.evaluate(el => { el.scrollTop = el.scrollHeight; }); await settle(page);
      const ingredientEnd = await ingredients.evaluate(el => ({ scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        lastText: el.querySelector("dl > div:last-child")?.textContent,
        lastBottom: el.querySelector("dl > div:last-child").getBoundingClientRect().bottom, dialogBottom: el.getBoundingClientRect().bottom }));
      geometry.push({ name: "long-ingredients-scroll-end", ...ingredientEnd });
      assert(ingredientEnd.scrollTop > 0); assert(ingredientEnd.lastText.includes("水")); assert(ingredientEnd.lastBottom <= ingredientEnd.dialogBottom + 1);
      await capture(page, "long-ingredients-768-200-bottom");
      assert.equal(await back(page), true); await ingredients.waitFor({ state: "hidden" }); await dialog.waitFor(); await returned(ingredientsTrigger, "查看食材");
      await dialog.getByRole("button", { name: "退出引导", exact: true }).click(); await dialog.waitFor({ state: "hidden" }); await returned(trigger, "开始引导烹饪");
      const count = await page.evaluate(async ({ moduleBase, id }) => { const { PreviewRecipeLibrary } = await import(moduleBase + "preview-store.ts"); return (await new PreviewRecipeLibrary().getCookingSummary(id)).count; }, { moduleBase, id: seeded.id });
      assert.equal(count, 0, "Viewing/scrolling/back/exiting never records cooked");
    });
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
    await check("missing_file_and_real_blob_decode_error_keep_text_and_fallback", async () => {
      await page.getByRole("button", { name: "返回菜谱库", exact: true }).click();
      for (const [name, label] of [[seeded.missing, "missing-local-file"], [seeded.corrupt, "local-blob-decode-error"]]) {
        await page.getByRole("button", { name: `打开 ${name}`, exact: true }).first().click();
        await page.locator('.v2-cover-button > [role="img"]').waitFor();
        assert.equal(await page.locator('.v2-cover-button > [role="img"]').textContent(), "图片暂不可用");
        assert.equal(await page.locator('.v2-cover-button > img').count(), 0);
        await page.getByRole("heading", { name: "完整步骤", exact: true }).waitFor();
        await layout(page, label); await capture(page, label);
        await page.getByRole("button", { name: "返回菜谱库", exact: true }).click();
      }
    });
    }
    await context.close();
    if (supplementalSections.has("image-contrast")) for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) {
      const { page, context } = await open(theme);
      await page.evaluate(async fixturePath => {
        const original = document.getElementById("root"); original.hidden = true; original.id = "qa-original-root";
        const target = document.createElement("div"); target.id = "root"; document.body.append(target);
        const { renderFixture } = await import(fixturePath);
        window.__g4ImageFixture = await renderFixture(target, { invalidImage: true });
      }, `/@fs/${root.replaceAll("\\", "/")}scripts/fixtures/ui-v2-intake.tsx`);
      await page.getByRole("button", { name: "新增菜谱", exact: true }).click();
      await page.getByRole("button", { name: "AI 整理", exact: true }).click();
      await page.getByRole("button", { name: "添加截图", exact: true }).click();
      await page.locator(".v2-image-placeholder span").getByText("图片暂不可用", { exact: true }).waitFor();
      const imageSample = await page.locator(".v2-image-placeholder span").evaluate(el => {
        const s = getComputedStyle(el), bg = getComputedStyle(el.parentElement);
        return { text: el.textContent, foreground: s.color, background: bg.backgroundColor,
          fontSize: s.fontSize, fontWeight: s.fontWeight, disabled: !!el.closest(":disabled"), html: el.parentElement.outerHTML };
      });
      result.renderedAiImageFailures ??= [];
      result.renderedAiImageFailures.push({ theme, ...imageSample });
      await capture(page, `${theme}-ai-corrupt-image-fallback-390-100`);
      const linear = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const x = linear(imageSample.foreground), y = linear(imageSample.background), ratio = (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
      colors.push({ theme, ...imageSample, ratio, minimum: 4.5 });
      await check(`${theme}_actual_ai_shared_V2Image_decode_failure_normal_text_contrast`, async () => {
        assert.equal(imageSample.disabled, false); assert(ratio >= 4.5, `Actual AI V2Image failed image text contrast ${ratio}`);
        const calls = await page.evaluate(() => window.__g4ImageFixture.calls); result.aiImageCalls ??= []; result.aiImageCalls.push({ theme, ...calls });
        assert.equal(calls.ai, 0); assert.equal(calls.create, 0); assert.equal(calls.keyWrites, 0);
      });
      await context.close();
    }
    if (supplementalSections.has("contrast")) {
    for (const theme of ["warm-ivory", "pure-glass", "soft-sage"]) {
      const { page, context } = await open(theme);
      const themeTitle = `G4 GENERATED ${theme} 只有菜名`;
      await page.evaluate(async ({ moduleBase, title }) => {
        const { PreviewRecipeLibrary } = await import(moduleBase + "preview-store.ts");
        await new PreviewRecipeLibrary().create(title);
      }, { moduleBase, title: themeTitle });
      await page.reload(); await page.getByRole("button", { name: `打开 ${themeTitle}`, exact: true }).first().waitFor(); await settle(page);
      const themeSamples = await page.locator('.v2-recent-card > [role="img"],.v2-recipe-row > [role="img"]').evaluateAll(elements => elements.map(el => {
        const s = getComputedStyle(el);
        return { text: el.textContent, surface: el.closest(".v2-recent-card") ? "recent-card" : "library-row",
          foreground: s.color, background: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight, disabled: !!el.closest(":disabled") };
      }));
      assert.equal(themeSamples.length, 2, "Both recent card and library row render the generated title-only recipe");
      await capture(page, `${theme}-home-no-image-390-100`);
      await check(`${theme}_computed_contrast_and_solid_reduced_motion_768_200`, async () => {
        await page.setViewportSize({ width: 768, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
        await page.getByRole("navigation", { name: "主要导航" }).getByRole("button", { name: "设置", exact: true }).click();
        await layout(page, `${theme}/settings/768/200`);
        const tokens = await page.locator(".v2-production").evaluate(el => {
          const s = getComputedStyle(el), names = ["text", "secondary", "caption", "canvas", "surface", "muted", "action", "action-pressed", "control", "soft", "warning", "warning-surface", "error", "error-surface", "cook", "cook-secondary"];
          return Object.fromEntries(names.map(name => [name, s.getPropertyValue(`--v2-${name}`).trim()]));
        });
        const rgb = color => color.startsWith("#") ? color.slice(1).match(/../g).map(v => parseInt(v, 16)) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const luminance = color => rgb(color).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        for (const sample of themeSamples) {
          const ratio = contrast(sample.foreground, sample.background);
          colors.push({ theme, actualRenderedText: sample.text, surface: sample.surface, ratio, minimum: 4.5, fontSize: sample.fontSize,
            fontWeight: sample.fontWeight, foreground: sample.foreground, background: sample.background, disabled: sample.disabled });
          assert.equal(sample.disabled, false); assert(ratio >= 4.5, `Actual normal-size ${theme}/${sample.surface} no-image text ${sample.text}: contrast ${ratio}`);
        }
        result.tokenDiagnostics.push({ theme, foreground: "caption", background: "muted", ratio: contrast(tokens.caption, tokens.muted),
          applicability: "Diagnostic abstract pair; enabled normal image-placeholder text is checked above using its actual rendered colors. Disabled control styling is not an active text contrast failure." });
        for (const [foreground, background, minimum] of [["text", "canvas", 4.5], ["secondary", "surface", 4.5], ["#ffffff", "action", 4.5], ["#ffffff", "action-pressed", 4.5], ["control", "surface", 3], ["warning", "warning-surface", 4.5], ["error", "error-surface", 4.5], ["#fbfaf7", "cook", 4.5], ["cook-secondary", "cook", 4.5]]) {
          const ratio = contrast(tokens[foreground] ?? foreground, tokens[background] ?? background); colors.push({ theme, foreground, background, ratio, minimum });
          assert(ratio >= minimum, `${theme}/${foreground}/${background}: contrast ${ratio}`);
        }
        await page.getByRole("navigation", { name: "主要导航" }).getByRole("button", { name: "首页", exact: true }).click();
        await page.getByRole("button", { name: "新增菜谱", exact: true }).click(); const add = page.getByRole("dialog", { name: "添加菜谱", exact: true }); await add.waitFor();
        await page.evaluate(() => document.querySelectorAll('.recipio-ui-v2').forEach(el => el.setAttribute("data-v2-solid", "true")));
        const style = await add.evaluate(el => ({ filter: getComputedStyle(el).backdropFilter, background: getComputedStyle(el).backgroundColor,
          reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
          animations: [...el.querySelectorAll('*')].flatMap(child => child.getAnimations()).map(a => ({ duration: a.effect.getTiming().duration, iterations: a.effect.getTiming().iterations })) }));
        geometry.push({ name: `${theme}/solid-reduced`, ...style }); assert.equal(style.filter, "none"); assert(!style.background.startsWith("rgba(")); assert.equal(style.reduced, true); assert.deepEqual(style.animations, []);
        await layout(page, `${theme}/solid-add/768/200`); await capture(page, `${theme}-solid-add-768-200`);
      });
      await context.close();
    }
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(consoleMessages, []); result.status = "PASS";
  } catch (error) {
    result.status = "FAIL"; result.failure = { message: error.message, stack: error.stack };
    if (activePage && !activePage.isClosed()) await capture(activePage, "failure").catch(() => {});
    console.error(error);
  } finally {
    result.browser = browser.version(); result.finishedAt = new Date().toISOString();
    await writeFile(path.join(supplementOut, "results.json"), JSON.stringify(result, null, 2)); await browser.close();
    manifest.runs.push({ name: "supplemental", status: result.status, groupedChecks: checks.length, screenshots: captures.length,
      layouts: geometry.length, contrasts: colors.length, focusRecords: focus.length, failure: result.failure ?? null, results: path.join(supplementOut, "results.json") });
    await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  }
}

for (const name of suites) {
  if (name === "supplemental") await supplemental(); else await replay(name);
  if (manifest.runs.at(-1)?.status !== "PASS") break;
}
manifest.finishedAt = new Date().toISOString(); manifest.status = manifest.runs.every(run => run.status === "PASS") ? "PASS" : "FAIL";
await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`${manifest.status} G4 browser evidence: ${out}`);
if (manifest.status !== "PASS") process.exitCode = 1;
