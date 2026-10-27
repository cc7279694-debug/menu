// QA only; never run on a phone or another project's emulator.
// Port 5582 is deliberate: historical port 5580 belongs to an unrelated host service.
// Caller verifies live QEMU ownership and takes protected before/after fingerprints.
// node scripts/verify-ui-v2-g4-core-android.mjs --owned-qemu-pid=<verified PID>
//   --expected-code=<final code> --expected-sha256=<final APK SHA256> [--adb=<absolute adb.exe>]
// Uses the installed production UI/SQLite/SAF, no SQL, fake ports, paid actions or cleanup.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { device, packageName, delay } from "./android-webview.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serial = "emulator-5582", avd = "Recipio_Backup_36", runId = randomUUID();
const title = `G4 GENERATED ${runId}`, ingredient = `G4 INGREDIENT ${runId}`;
const imageName = `RECIPIO_G4_${runId}.png`, fixtureNotes = "G4 受控测试内容\n中文与 Emoji 🍚";
const themes = ["warm-ivory", "pure-glass", "soft-sage"];
const checks = [], notRun = [], shots = [], geometries = [];
let stage = "arguments", d, out, originalTheme, originalNetwork, networkChanged = false;
let status = "FAILED", failureStage, themeRestored = false, networkRestored = false, fixtureSaveObserved = false;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const quote = JSON.stringify;
const heading = value => `[...document.querySelectorAll('h1,h2,h3')].some(e=>e.getClientRects().length&&e.textContent.trim()===${quote(value)})`;
const visibleButton = (label, scope = "document") => `[...(${scope}).querySelectorAll('button')].find(e=>e.getClientRects().length&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent.trim())===${quote(label)})`;
const field = label => `[...document.querySelectorAll('label')].find(e=>e.getClientRects().length&&(e.querySelector('span')?.textContent.trim()||e.textContent.trim())===${quote(label)})?.querySelector('input,textarea')`;

function checkpoint(name) { stage = name; console.log(`STAGE ${name}`); }
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
function unavailable(reason) {
  notRun.push({ check: stage, reason });
  const error = new Error("Native control unavailable without guessing"); error.code = "G4_NOT_RUN"; throw error;
}
async function until(expression, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  do { if (await d.evaluate(expression)) return; await delay(100); } while (Date.now() < deadline);
  throw new Error(`Controlled UI condition failed: ${label}`); // Never dumps body/private data.
}
async function click(label, scope = "document") {
  await until(`(()=>{const b=${visibleButton(label, scope)};if(!b)return false;b.click();return true})()`, `button ${label}`);
}
async function setInput(selector, value) {
  await until(`!!(${selector})`, "generated input exists");
  await d.evaluate(`(()=>{const e=${selector},p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${quote(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await until(`(${selector}).value===${quote(value)}`, "generated input updates");
}
async function fill(label, value) { await setInput(field(label), value); }
async function rootReady() {
  await until("!!document.querySelector('.recipio-ui-v2.v2-production[data-v2-root] nav[aria-label=\"主要导航\"]')", "production root navigation");
  assert(await d.evaluate("!document.querySelector('[aria-label=\"待处理分享\"]')"), "Do not consume unknown pending shares");
}
async function coldStart() {
  await d.coldStart();
  assert(await d.evaluate("location.origin==='https://localhost'"), "Only installed local WebView is supported");
  await rootReady();
}
async function themeValue() { return d.evaluate("document.querySelector('.recipio-ui-v2.v2-production')?.dataset.v2Theme"); }
async function chooseTheme(theme) {
  await click("设置");
  await until("!!document.querySelector('.v2-settings')", "settings route");
  await d.evaluate(`(()=>{const r=document.querySelector('.v2-settings input[type=radio][name=\"recipio-theme\"][value=${quote(theme)}]');if(!r||r.disabled)throw new Error('Known theme radio absent');r.click();return true})()`);
  await until(`document.querySelector('.v2-production')?.dataset.v2Theme===${quote(theme)}&&document.querySelector('.v2-settings input[type=radio]:checked')?.value===${quote(theme)}`, "theme propagates from official radio");
}
async function openFixture() {
  await click("我的菜谱");
  await setInput("document.querySelector('input[aria-label=\"搜索菜名或食材\"]')", title);
  await until(`document.querySelectorAll('.v2-recipe-row').length===1&&!!(${visibleButton(`打开 ${title}`)})`, "unique generated recipe result");
  await click(`打开 ${title}`);
  await until(heading(title), "generated detail title");
}
async function detailImage() {
  await until(`(()=>{const e=document.querySelector('.v2-production-detail img[alt=${quote(`${title} 封面`)}]');return !!e&&e.complete&&e.naturalWidth===64&&e.naturalHeight===48})()`, "generated local PNG decoded");
}
async function records(expected) {
  await click("查看做菜记录");
  await until(heading("做菜记录"), "own cooking history route");
  await until(`document.querySelectorAll('.v2-history-list [data-testid=\"cooking-record\"]').length===${expected}&&!document.body.innerText.includes('读取本地做菜记录…')`, "own visible cooking record count");
  if (expected === 0) assert(await d.evaluate("document.body.innerText.includes('还没有做菜记录。只有点击完成才会记录。')"), "Zero records need an explicit empty state");
  await click("返回菜谱");
  await until(heading(title), "return to generated detail");
}
async function viewerPainted() {
  await d.evaluate("(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()");
  const geometry = await d.evaluate("(()=>{const e=document.querySelector('.v2-production-cooking');if(!e)return null;const box=t=>{const r=t.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return{width:innerWidth,height:innerHeight,dialog:box(e),body:box(e.querySelector('.v2-cook-scroll')),footer:box(e.querySelector('.v2-cook-footer'))}})()");
  assert(geometry && Math.abs(geometry.dialog.x) <= 1 && Math.abs(geometry.dialog.y) <= 1, "Cooking must start inside the viewport");
  for (const part of ["dialog", "body", "footer"]) {
    const box = geometry[part];
    assert(box.x >= -1 && box.y >= -1 && box.width > 0 && box.height > 0 && box.right <= geometry.width + 1 && box.bottom <= geometry.height + 1, "Cooking content/controls must be on screen");
  }
  geometries.push(geometry);
}
async function viewerClick(label) {
  await viewerPainted();
  const point = await d.evaluate(`(()=>{const b=${visibleButton(label, "document.querySelector('.v2-production-cooking')")};if(!b)return null;const r=b.getBoundingClientRect();if(r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1)return null;return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  assert(point, "Observed cooking control must be inside the viewport");
  await d.command("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await d.command("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
function nativeFocus(expectedPackage) {
  return d.adb("shell", "dumpsys", "window").split(/[\r\n]+/).some(line => line.includes("mCurrentFocus=") && line.includes(expectedPackage + "/"));
}
async function nativeXml(expectedPackage) {
  const deadline = Date.now() + 15000;
  do {
    if (nativeFocus(expectedPackage)) {
      const path = `/data/local/tmp/recipio-g4-${runId}.xml`;
      try {
        d.adb("shell", "uiautomator", "dump", "--compressed", path);
        const xml = d.adb("shell", "cat", path);
        if (xml.includes(`package="${expectedPackage}"`)) return xml;
      } finally { d.adb("shell", "rm", "-f", path); } // Only this exact generated temporary file.
    }
    await delay(150);
  } while (Date.now() < deadline);
  unavailable("Known native window unavailable; no guessed control was used; dependent remaining core checks were not run");
}
function nativeTap(xml, predicate) {
  const node = (xml.match(/<node\b[^>]*>/g) ?? []).find(predicate);
  if (!node) return false;
  const bounds = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
  assert(bounds && +bounds[3] > +bounds[1] && +bounds[4] > +bounds[2], "Native control has no observed usable bounds");
  d.adb("shell", "input", "tap", String(Math.floor((+bounds[1] + +bounds[3]) / 2)), String(Math.floor((+bounds[2] + +bounds[4]) / 2)));
  return true;
}
async function selectGeneratedCover(imagePath) {
  d.adb("push", imagePath, `/sdcard/Download/${imageName}`);
  d.adb("shell", "am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", `file:///sdcard/Download/${imageName}`);
  await d.evaluate("(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='选择本地封面');if(!l?.querySelector('input[type=file]'))throw new Error('Known native cover control absent');l.querySelector('input').click();return true})()");
  const documents = "com.google.android.documentsui";
  const imageNode = node => node.includes(`text="${imageName}"`) || node.includes(`content-desc="${imageName},`);
  let selected = false, xml;
  const deadline = Date.now() + 5000;
  do { xml = await nativeXml(documents); if (nativeTap(xml, imageNode)) { selected = true; break; } await delay(150); } while (Date.now() < deadline);
  if (!selected) {
    if (!nativeTap(xml, node => node.includes('content-desc="Show roots"'))) unavailable("Inspected DocumentsUI roots control unavailable; no alternate control guessed");
    xml = await nativeXml(documents);
    if (!nativeTap(xml, node => node.includes('text="Downloads"') && node.includes('resource-id="android:id/title"'))) unavailable("Inspected Downloads root unavailable; no alternate control guessed");
    const selectionDeadline = Date.now() + 15000;
    do { xml = await nativeXml(documents); if (nativeTap(xml, imageNode)) { selected = true; break; } await delay(150); } while (Date.now() < selectionDeadline);
  }
  assert(selected, "Only the exact generated UUID image may be selected");
  await until("(()=>{const e=document.querySelector('img[alt=\"菜谱封面\"]');return !!e&&e.complete&&e.naturalWidth===64&&e.naturalHeight===48})()", "native imported generated cover");
}
async function safeShot(name, cooking = false) {
  const safe = await d.evaluate(`!document.querySelector('[aria-label=\"待处理分享\"]')&&${cooking
    ? `!!document.querySelector('.v2-production-cooking')&&document.querySelector('.v2-cook-toolbar p')?.textContent===${quote(title)}`
    : `!!document.querySelector('.v2-production-detail')&&${heading(title)}`}`);
  if (!safe || !nativeFocus(packageName)) { notRun.push({ check: `screenshot-${name}`, reason: "Cannot prove that only generated content is visible" }); return; }
  const bytes = d.raw("exec-out", "screencap", "-p");
  writeFileSync(join(out, `${name}.png`), bytes, { flag: "wx" });
  shots.push({ file: `${name}.png`, sha256: hash(bytes) });
}
function network() {
  return Object.fromEntries([["airplane", "airplane_mode_on"], ["wifi", "wifi_on"], ["data", "mobile_data"]]
    .map(([key, setting]) => [key, d.adb("shell", "settings", "get", "global", setting)]));
}
function generatedPng() {
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (name, bytes) => { const type = Buffer.from(name), length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(bytes.length); checksum.writeUInt32BE(crc(Buffer.concat([type, bytes]))); return Buffer.concat([length, type, bytes, checksum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(64, 0); header.writeUInt32BE(48, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc((64 * 3 + 1) * 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) { const index = y * (64 * 3 + 1) + 1 + x * 3, dark = (Math.floor(x / 8) + Math.floor(y / 8)) % 2; pixels[index] = dark ? 132 : 239; pixels[index + 1] = dark ? 155 : 231; pixels[index + 2] = dark ? 126 : 208; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}

let ownedQemuPid, expectedCode, expectedSha256, actualPackage;
try {
  const options = new Map();
  for (const argument of process.argv.slice(2)) {
    const match = /^--(adb|owned-qemu-pid|expected-code|expected-sha256)=(.+)$/.exec(argument);
    assert(match && !options.has(match[1]), "Unknown/duplicate argument"); options.set(match[1], match[2]);
  }
  ownedQemuPid = Number(options.get("owned-qemu-pid")); expectedCode = Number(options.get("expected-code")); expectedSha256 = options.get("expected-sha256")?.toLowerCase();
  assert(Number.isSafeInteger(ownedQemuPid) && ownedQemuPid > 0, "A caller-verified owned QEMU PID is required");
  assert(Number.isSafeInteger(expectedCode) && expectedCode > 0 && /^[a-f0-9]{64}$/.test(expectedSha256 ?? ""), "Explicit installed final code/SHA required");
  const adb = options.get("adb") ?? "C:/Users/CDD/AppData/Local/MirraAndroid/sdk/platform-tools/adb.exe";
  assert(isAbsolute(adb) && existsSync(adb), "Existing absolute adb executable required");
  const processProbe = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    `$g4OwnedProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${ownedQemuPid}'; if($null -eq $g4OwnedProcess){exit 1}; [pscustomobject]@{ExecutablePath=$g4OwnedProcess.ExecutablePath; CommandLine=$g4OwnedProcess.CommandLine} | ConvertTo-Json -Compress`],
  { timeout: 15000, encoding: "utf8" });
  assert(!processProbe.error && processProbe.status === 0, "Cannot inspect the explicit owned QEMU PID");
  const ownedProcess = JSON.parse(processProbe.stdout.replace(/^\uFEFF/, ""));
  assert(typeof ownedProcess.ExecutablePath === "string" && /^qemu-system-(?:x86_64|aarch64)(?:-headless)?\.exe$/i.test(basename(ownedProcess.ExecutablePath)), "Owned PID is not the actual QEMU process");
  assert(typeof ownedProcess.CommandLine === "string" && /(?:-avd\s+|@)["']?Recipio_Backup_36(?:["']|\s|$)/.test(ownedProcess.CommandLine)
    && /(?:^|\s)-port\s+5582(?:\s|$)/.test(ownedProcess.CommandLine), "Owned QEMU command must match Recipio_Backup_36 on port5582");
  d = device(adb, serial);
  checkpoint("owned target and exact installed candidate");
  assert(d.adb("emu", "avd", "name").split(/[\r\n]+/)[0] === avd, "Wrong AVD");
  assert(d.adb("shell", "getprop", "ro.build.version.sdk") === "36" && d.adb("shell", "getprop", "sys.boot_completed") === "1", "Owned API36 target must be booted");
  const metadata = d.adb("shell", "dumpsys", "package", packageName), path = d.adb("shell", "pm", "path", packageName);
  assert(/^package:\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/.test(path), "Installed monolithic target required");
  actualPackage = { code: Number(/\bversionCode=(\d+)/.exec(metadata)?.[1]), sha256: d.adb("shell", "sha256sum", path.slice(8)).split(/\s/)[0] };
  assert(actualPackage.code === expectedCode && actualPackage.sha256 === expectedSha256, "Installed target differs from caller's final candidate");
  const baseOut = join(root, "output/playwright/ui-v2/g4/resume-20261025");
  let cursor = root;
  for (const segment of relative(root, baseOut).split(sep)) { cursor = join(cursor, segment); if (existsSync(cursor)) assert(!lstatSync(cursor).isSymbolicLink(), "Output links are forbidden"); }
  const ignored = spawnSync("git", ["-C", root, "check-ignore", "--quiet", "output/playwright/ui-v2/g4/resume-20261025/core-probe.json"], { timeout: 10000 });
  assert(ignored.status === 0, "Evidence directory must be ignored");
  mkdirSync(baseOut, { recursive: true }); out = join(baseOut, `core-${runId}`); mkdirSync(out);
  const imageBytes = generatedPng(), imagePath = join(out, imageName); writeFileSync(imagePath, imageBytes, { flag: "wx" });

  checkpoint("home library settings and initial appearance");
  await coldStart(); originalTheme = await themeValue(); assert(themes.includes(originalTheme), "Unknown original appearance");
  await click("我的菜谱"); await until(heading("我的菜谱"), "library route");
  await click("设置"); await until(heading("设置"), "settings route");
  await click("首页"); await rootReady(); pass("actual production home/library/settings navigation");

  checkpoint("create one UUID recipe through official editor and native SAF");
  await click("新增菜谱"); await click("手动录入"); await until(heading("记下这道菜"), "new recipe editor");
  await fill("菜名", title); await fill("做菜耗时（分钟）", "30"); await fill("约几人份", "2");
  await click("添加食材"); await fill("食材 1", ingredient); await fill("用量 1", "500 克");
  for (let index = 1; index <= 2; index++) { await click("添加步骤"); await fill(`步骤 ${index}`, `G4 受控步骤 ${index}：${index === 1 ? "清洗切块。" : "小火煮熟。"}`); }
  await fill("个人备注", fixtureNotes); await selectGeneratedCover(imagePath);
  await click("快速保存菜谱"); await until(heading(title), "new UUID detail"); fixtureSaveObserved = true; await detailImage();
  await safeShot("generated-detail"); pass("one generated UUID recipe, ingredients, two steps and generated local PNG saved through real UI/SAF");

  checkpoint("local search filter and exact generated result");
  await click("返回菜谱库"); await click("我的菜谱");
  await setInput("document.querySelector('input[aria-label=\"搜索菜名或食材\"]')", ingredient);
  await d.evaluate("(()=>{const e=document.querySelector('select[aria-label=\"耗时筛选\"]');if(!e)throw new Error('Known duration filter absent');e.value='short';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until(`document.querySelectorAll('.v2-recipe-row').length===1&&!!(${visibleButton(`打开 ${title}`)})`, "ingredient and duration result");
  await click(`打开 ${title}`); await until(heading(title), "generated search result detail"); await click("返回菜谱库");
  assert(await d.evaluate(`document.querySelector('input[aria-label=\"搜索菜名或食材\"]').value===${quote(ingredient)}&&document.querySelector('select[aria-label=\"耗时筛选\"]').value==='short'`), "Search/filter must survive detail return");
  await openFixture(); pass("local ingredient search/duration filter/detail return preserve query and filter");

  checkpoint("cancel unsaved edits only on generated recipe");
  await click("编辑菜谱"); await until(heading("编辑菜谱"), "own editor"); await fill("个人备注", `${fixtureNotes}\nG4 UNSAVED ${runId}`);
  // Return the CDP callback before the real synchronous native confirm opens.
  await d.evaluate(`(()=>{const b=${visibleButton("取消")};if(!b)throw new Error('Known editor cancel absent');setTimeout(()=>b.click(),0);return true})()`);
  const confirm = await nativeXml(packageName);
  assert(confirm.includes("有未保存的修改"), "Only the observed native unsaved-edit confirmation may be accepted");
  assert(nativeTap(confirm, node => node.includes('resource-id="android:id/button1"')), "Observed native confirmation button missing");
  await until(heading(title), "discard returns to own saved detail");
  assert(await d.evaluate(`document.querySelector('.v2-notes')?.textContent.includes(${quote(fixtureNotes)})&&!document.body.innerText.includes('G4 UNSAVED')`), "Unsaved generated edit must not replace saved notes");
  await detailImage(); pass("actual editor Cancel/native discard keeps generated saved notes and cover");

  checkpoint("Focus and Guided do not record until explicit completion");
  await records(0); await click("放大步骤 1"); await viewerClick("下一步"); await viewerClick("返回完整步骤"); await until(heading(title), "Focus exit"); await records(0);
  await click("开始引导烹饪"); await viewerClick("下一步"); await viewerClick("上一步"); await viewerClick("退出引导"); await until(heading(title), "Guided exit"); await records(0);
  await click("开始引导烹饪"); await viewerClick("查看食材"); await until("!!document.querySelector('.v2-portal [role=dialog]')", "real nested ingredient Sheet");
  d.adb("shell", "input", "keyevent", "KEYCODE_BACK"); await until("!document.querySelector('.v2-portal [role=dialog]')&&!!document.querySelector('.v2-production-cooking')", "nested Back keeps Guided");
  await viewerClick("下一步"); await safeShot("generated-guided", true); await viewerClick("完成这道菜");
  await until(heading("已记录做过这道菜"), "explicit completion result"); await click("返回菜谱"); await until(heading(title), "completion return"); await records(1);
  await click("查看修改记录"); await until(heading("修改记录"), "own modification history"); await click("返回菜谱"); await until(heading(title), "history return");
  pass("Focus/Guided exits show zero records; one explicit completion shows exactly one real history entry");

  checkpoint("three themes persist through actual owned app cold starts");
  await click("返回菜谱库");
  for (const theme of themes) {
    checkpoint(`theme ${theme}: official radio and home propagation`);
    await chooseTheme(theme); await click("首页"); assert(await themeValue() === theme, "Home appearance propagation");
    checkpoint(`theme ${theme}: actual cold start and persistence`);
    await coldStart();
    await until(`document.querySelector('.v2-production')?.dataset.v2Theme===${quote(theme)}`, "acknowledged Native theme recovered after actual cold start");
    checkpoint(`theme ${theme}: generated recipe image and record readback`);
    await openFixture(); await detailImage(); await records(1); await click("返回菜谱库");
    pass(`official ${theme} radio survives cold start with generated recipe/image/record readable`);
  }

  checkpoint("online entries open/cancel without clicking any network action");
  for (const entry of ["AI 整理", "从网页链接导入", "帮我找做法"]) {
    await click("新增菜谱"); await click(entry);
    const selector = entry === "AI 整理" ? ".v2-ai-intake textarea" : entry === "从网页链接导入" ? ".v2-link-intake input[type=url]" : ".v2-finder input";
    await until(`!!document.querySelector(${quote(selector)})`, "existing optional entry"); await click("返回");
    // Frozen AI/Link headers always open confirmation, including an empty input.
    // Clean Finder input instead awaits discard and returns directly to its root.
    if (entry !== "帮我找做法") {
      const confirmationTitle = entry === "AI 整理" ? "放弃本轮整理？" : "放弃本轮网页导入？";
      const confirmation = `[...document.querySelectorAll('[role=dialog]')].find(e=>e.getClientRects().length&&[...e.querySelectorAll('h2')].some(h=>h.textContent.trim()===${quote(confirmationTitle)}))`;
      await until(`!!(${confirmation})`, "frozen empty-input discard dialog");
      await click(entry === "AI 整理" ? "放弃本轮整理" : "放弃网页导入", confirmation);
    }
    await rootReady();
  }
  pass("AI/link/Finder entry and cancellation only; no Provider/read/search/extract action clicked");

  checkpoint("native Backup SAF open and real cancellation");
  await click("设置"); await click("导出完整备份"); await nativeXml("com.google.android.documentsui");
  if (/\bmInputShown=true\b/.test(d.adb("shell", "dumpsys", "input_method"))) {
    d.adb("shell", "input", "keyevent", "KEYCODE_BACK");
    const deadline = Date.now() + 8000;
    while (!/\bmInputShown=false\b/.test(d.adb("shell", "dumpsys", "input_method")) && Date.now() < deadline) await delay(100);
    assert(/\bmInputShown=false\b/.test(d.adb("shell", "dumpsys", "input_method")), "Picker keyboard must close before cancelling SAF");
  }
  assert(nativeFocus("com.google.android.documentsui"), "Only the owned export picker may receive Back");
  d.adb("shell", "input", "keyevent", "KEYCODE_BACK");
  await until("document.body.innerText.includes('操作已取消，当前数据未替换。')", "real export cancellation status");
  pass("real native Backup export chooser opened and cancelled without document selection/write");

  checkpoint("flight-mode cold start with theme recipe image and record");
  originalNetwork = network();
  if (Object.values(originalNetwork).every(value => value === "0" || value === "1")) {
    networkChanged = true;
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable"); d.adb("shell", "svc", "wifi", "disable"); d.adb("shell", "svc", "data", "disable");
    assert(JSON.stringify(network()) === JSON.stringify({ airplane: "1", wifi: "0", data: "0" }), "Observed airplane/WiFi/mobile-data state must be offline");
    await coldStart();
    await until("document.querySelector('.v2-production')?.dataset.v2Theme==='soft-sage'", "acknowledged Native theme recovered after offline cold start");
    await openFixture(); await detailImage(); await safeShot("generated-offline-detail"); await records(1);
    await click("开始引导烹饪"); await viewerClick("下一步"); await viewerClick("退出引导"); await until(heading(title), "offline Guided exit"); await records(1);
    pass("airplane/WiFi/data-off cold start retains theme, generated recipe/local PNG and one record; Guided does not add records");
  } else notRun.push({ check: "flight-mode cold start", reason: "Unknown initial network settings cannot be safely restored" });
  const externalRequests = d.events.filter(event => event.method === "Network.requestWillBeSent").filter(event => {
    try { const url = new URL(event.params.request.url); return !["blob:", "data:"].includes(url.protocol) && url.hostname !== "localhost"; } catch { return true; }
  }).length;
  assert(externalRequests === 0, "Unexpected external WebView request; private URL deliberately omitted");
  pass("observed WebView external request count is zero; Native transport was not replaced or instrumented");
  status = notRun.length ? "PARTIAL_NOT_RUN" : "PASS";
} catch (error) {
  failureStage = stage; status = error?.code === "G4_NOT_RUN" ? "PARTIAL_NOT_RUN" : "FAILED";
  if (out) {
    try {
      writeFileSync(join(out, "private-failure.txt"), `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`, { flag: "wx" });
    } catch { console.error("Private failure diagnostic could not be written; original exception remains omitted from public output"); }
  }
  console.error(`${status} ${stage}; private UI/subprocess output intentionally omitted`);
  process.exitCode = status === "FAILED" ? 1 : 2;
} finally {
  if (d) {
    try {
      if (networkChanged) {
        d.adb("shell", "cmd", "connectivity", "airplane-mode", originalNetwork.airplane === "1" ? "enable" : "disable");
        d.adb("shell", "svc", "wifi", originalNetwork.wifi === "1" ? "enable" : "disable");
        d.adb("shell", "svc", "data", originalNetwork.data === "1" ? "enable" : "disable");
        assert(JSON.stringify(network()) === JSON.stringify(originalNetwork), "Network restoration readback failed");
      }
      networkRestored = true;
    } catch { status = "FAILED"; failureStage ??= "restore original network settings"; process.exitCode = 1; }
    try {
      if (originalTheme) { await coldStart(); await chooseTheme(originalTheme); await click("首页"); assert(await themeValue() === originalTheme, "Original theme restoration readback failed"); themeRestored = true; }
    } catch { status = "FAILED"; failureStage ??= "restore original theme"; process.exitCode = 1; }
    try { d.close(); } catch { status = "FAILED"; failureStage ??= "remove owned CDP forward"; process.exitCode = 1; }
  }
  if (out) {
    const receipt = { status, at: new Date().toISOString(), serial, avd, sdk: 36, ownedQemuPid,
      ownership: "Caller must verify this live QEMU PID/command/port before invocation", actualPackage,
      generated: { runId, title, ingredient, imageName, saveObserved: fixtureSaveObserved, cleanupAttempted: false }, checks, notRun, shots, geometries,
      failureStage, themeRestored, networkRestored, onlineActionsClicked: 0, fakeTransports: 0,
      protectedData: "No SQL or operations on unknown recipes; exact original-row/media preservation must be verified by caller before/after fingerprint",
      limits: ["Native HTTP calls not instrumented; only known UI entry/cancel actions used", "IME8 belongs to separate instrumentation evidence", "TalkBack/performance/destructive restore NOT_RUN", "No screenshot of library/settings/picker/unknown records"] };
    const path = join(out, "receipt.json"); writeFileSync(path, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ status, checks: checks.length, notRun: notRun.length, receipt: path }));
  }
}
