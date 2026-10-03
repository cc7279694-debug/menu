import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { device, delay } from "./android-webview.mjs";
const [adbPath, serial, mode = "inspect"] = process.argv.slice(2);
assert(["baseline","inspect","fresh","create","flows","sort","media","step-media","cancel-media","back","upgrade-baseline","upgrade","picker","save-image"].includes(mode),"Unknown native verification mode");
const d = device(adbPath, serial);
const out = resolve("artifacts/android-daily");
mkdirSync(out, { recursive: true });
const checks = [];
let success = false;
let failure = null;
const originalAirplane = d.adb("shell", "settings", "get", "global", "airplane_mode_on");
const record = (text) => { checks.push(text); console.log(`PASS: ${text}`); };
const textHas = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
function dbRead(path, action) {
  const db = new DatabaseSync(path, { readOnly: true });
  try { return action(db); } finally { db.close(); }
}
const detailReady = "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='编辑菜谱')";
async function save() { await d.click("快速保存菜谱"); await d.wait(detailReady); }
async function open(title) { await d.click(`打开 ${title}`); await d.wait(detailReady); }
async function picker(index = 0) {
  // Actual Android system picker, not a injected blob or JS filesystem write.
  d.adb("push", resolve("native/public/icon.png"), "/sdcard/Pictures/recipio-native-cover.png");
  d.adb("shell", "am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", "file:///sdcard/Pictures/recipio-native-cover.png");
  const point = await d.evaluate(`(() => {const el=document.querySelectorAll('input[type=file]')[${JSON.stringify(index)}];if(!el)throw new Error('File input absent');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await d.command("Input.dispatchMouseEvent", {type:"mousePressed",button:"left",clickCount:1,...point});
  await d.command("Input.dispatchMouseEvent", {type:"mouseReleased",button:"left",clickCount:1,...point});
  await delay(1000);
  d.adb("shell", "uiautomator", "dump", "/sdcard/recipio-picker.xml");
}
async function chooseSystemPhoto(alt = "菜谱封面") {
  const selectedImage=`[...document.querySelectorAll('img')].find(image=>image.alt===${JSON.stringify(alt)})`;
  const oldSource=await d.evaluate(`${selectedImage}?.src || ''`);
  let xml;
  for(let i=0;i<15;i++) {
    d.adb("shell","uiautomator","dump","/sdcard/recipio-picker.xml");
    xml=d.adb("shell","cat","/sdcard/recipio-picker.xml");
    if(xml.includes('content-desc="Photo taken') || xml.includes('text="recipio-native-cover.png"') || xml.includes('content-desc="recipio-native-cover.png,')) break;
    await delay(250);
  }
  const node=xml.match(/<node[^>]*(?:content-desc="(?:Photo taken|recipio-native-cover\.png,)[^>]*|text="recipio-native-cover\.png"[^>]*)bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(node,"No device image in native picker");
  d.adb("shell","input","tap",String((+node[1]+ +node[3])/2),String((+node[2]+ +node[4])/2));
  const ready=`(()=>{const image=${selectedImage};return image?.naturalWidth>0 && image.src!==${JSON.stringify(oldSource)};})()`;
  // Single-selection Android pickers return immediately; some versions show Done.
  for(let i=0;i<15;i++) {
    if(await d.evaluate(ready)) return;
    d.adb("shell","uiautomator","dump","/sdcard/recipio-picker.xml");
    xml=d.adb("shell","cat","/sdcard/recipio-picker.xml");
    const done=xml.match(/<node[^>]*text="Done"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if(done) {
      d.adb("shell","input","tap",String((+done[1]+ +done[3])/2),String((+done[2]+ +done[4])/2));
      await d.wait(ready); return;
    }
    await delay(250);
  }
  throw new Error("System image selection did not return a new image");
}
async function row() {
  return d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:\"SELECT * FROM recipes WHERE title='可乐鸡翅' AND deleted_at IS NULL\",values:[]}).then(r=>r.values[0])");
}
try {
  if (mode === "baseline") {
    const path = await d.snapshot("apk0-before.db");
    const baseline = dbRead(path, (db) => ({ version: db.prepare("PRAGMA user_version").get().user_version, rows: db.prepare("SELECT * FROM recipes").all() }));
    assert.equal(baseline.version, 1);
    writeFileSync(resolve(out, "baseline.json"), JSON.stringify(baseline, null, 2));
    record(`actual installed APK-0 SQLite v1 captured (${baseline.rows.length} rows)`);
  } else {
    d.adb("shell", "cmd", "connectivity", "airplane-mode", "enable");
    assert.equal(d.adb("shell", "settings", "get", "global", "airplane_mode_on"), "1");
    if (mode === "save-image" || mode === "picker") await d.connect();
    else await d.coldStart();
    console.log(await d.evaluate("({platform:window.Capacitor.getPlatform(),url:location.href,text:document.body.innerText})"));
    assert.equal(await d.evaluate("window.Capacitor.getPlatform()"), "android");
    assert((await d.evaluate("location.href")).startsWith("https://localhost"));
    if (mode === "inspect") {
      await d.screenshot(resolve(out, "initial.png"));
      const path = await d.snapshot("migrated.db");
      dbRead(path, (db) => {
        assert.equal(db.prepare("PRAGMA user_version").get().user_version, 2);
        assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
        const baseline = JSON.parse(readFileSync(resolve(out, "baseline.json"), "utf8"));
        for (const row of baseline.rows) assert.deepEqual({...db.prepare("SELECT id,title,created_at FROM recipes WHERE id=?").get(row.id)}, { id: row.id,title:row.title,created_at:row.created_at });
        console.log(db.prepare("SELECT id,title,total_minutes,notes FROM recipes").all());
      });
      record("native plugin migration v1→v2 retains actual existing IDs, titles and created_at; integrity ok");
    } else if (mode === "create") {
      await d.click("新增菜谱");
      assert.equal(await d.evaluate("document.querySelector('[aria-label=\"快速保存菜谱\"]').disabled"), true);
      await d.fill("菜名", "可乐鸡翅");
      await d.fill("做菜耗时（分钟）", "35");
      for (const [name, amount] of [["鸡翅","500g"],["可乐","1罐"],["生抽","2勺"]]) {
        await d.click("添加食材");
        const n = await d.evaluate("document.querySelectorAll('input[placeholder=\"例如 500克／适量\"]').length");
        await d.fill(`食材 ${n}`, name); await d.fill(`用量 ${n}`, amount);
      }
      for (const [i, instruction] of ["鸡翅洗净划口", "加入可乐生抽小火焖煮", "最后收汁"].entries()) {
        await d.click("添加步骤"); await d.fill(`步骤 ${i+1}`, instruction);
      }
      await d.click("添加准备事项"); await d.fill("准备事项 1", "提前腌制"); await d.fill("准备时长 1（分钟）", "20");
      await d.click("添加关键事项"); await d.fill("关键事项 1", "收汁最后几分钟容易糊"); await d.fill("关联步骤 1（可选）", "3");
      await d.fill("个人备注", "下次少放盐");
      await picker();
      await chooseSystemPhoto(); await save(); await d.wait(textHas("500g"));
      record("complete recipe saved through native UI with a device-selected local image");
    } else if (mode === "picker") {
      await picker();
    } else if (mode === "save-image") {
      await d.wait("document.querySelector('img[alt=\"菜谱封面\"]')?.naturalWidth>0");
      await save(); await d.wait(textHas("500g"));
      record("complete recipe saved through native UI with a device-selected local image");
    } else if (mode === "flows") {
      await open("可乐鸡翅"); await d.wait("document.querySelector('img[alt=\"可乐鸡翅 封面\"]')?.naturalWidth>0");
      // Restore this script's known fixture before a repeat of the same interaction loop.
      if (await d.evaluate(textHas("原生离线编辑已保存"))) {
        await d.click("编辑菜谱"); await d.fill("食材 1","鸡翅"); await d.fill("用量 1","500g");
        await d.fill("步骤 1","鸡翅洗净划口"); await d.fill("准备事项 1","提前腌制"); await d.fill("准备时长 1（分钟）","20");
        await d.fill("关键事项 1","收汁最后几分钟容易糊"); await d.fill("个人备注","下次少放盐"); await save();
      }
      for (const value of ["500g","提前腌制","收汁最后几分钟容易糊","最后收汁","下次少放盐"]) await d.wait(textHas(value));
      record("flight-mode cold start loads complete recipe and persistent native cover");
      await d.click("返回菜谱库"); await d.click("新增菜谱"); await d.fill("菜名", "啤酒鸭"); await save();
      await d.click("编辑菜谱"); await d.fill("菜名","啤酒鸭（改名）"); await save();
      await d.click("编辑菜谱"); await d.fill("菜名","啤酒鸭"); await save();
      record("name-only recipe has no required extra fields");
      await d.click("删除这道菜"); await d.click("撤销"); await d.wait(textHas("啤酒鸭"));
      record("delete undo restores name-only recipe");
      await open("啤酒鸭"); await d.click("删除这道菜"); await delay(5500);
      await d.coldStart(); assert.equal(await d.evaluate(textHas("啤酒鸭")), false);
      record("expired deletion stays deleted after force-stop/cold start");
      await d.click("我的菜谱");
      for (const q of ["可乐","鸡翅","不存在的食材",""]) {
        await d.fill("搜索菜名或食材",q);
        await d.wait(q==="不存在的食材"?textHas("没有符合条件的菜谱"):textHas("可乐鸡翅"));
      }
      record("title/ingredient search, no-result and reset through native UI");
      await open("可乐鸡翅"); await d.click("编辑菜谱");
      await d.fill("食材 1","鸡翅中"); await d.fill("用量 1","600g"); await d.fill("步骤 1","洗净划口后焯水");
      await d.fill("准备事项 1","先腌制入味"); await d.fill("准备时长 1（分钟）","25");
      await d.fill("关键事项 1","收汁需不断翻动"); await d.fill("个人备注","原生离线编辑已保存");
      await save(); await d.coldStart(); await open("可乐鸡翅"); await d.wait(textHas("原生离线编辑已保存"));
      record("all editable text fields persist after force-stop in flight mode");
      await d.screenshot(resolve(out,"detail.png"));
      await d.click("编辑菜谱");
      d.adb("shell","input","keyevent","4"); await delay(600);
      await d.wait(detailReady);
      record("Android back from unchanged editor returns to detail");
    } else if (mode === "sort") {
      const before=await row();
      await d.click("新增菜谱"); await d.fill("菜名","排序较新的菜谱"); await save();
      await d.click("返回菜谱库"); await open("可乐鸡翅"); await d.click("编辑菜谱");
      await d.fill("菜名","可乐鸡翅 · 改名"); await save();
      await d.coldStart(); await open("可乐鸡翅 · 改名");
      record("name edit persists after force-stop");
      await d.click("编辑菜谱"); await d.fill("菜名","可乐鸡翅"); await save();
      assert.equal((await row()).created_at,before.created_at);
      await d.click("返回菜谱库");
      const labels=await d.evaluate("[...document.querySelectorAll('button[aria-label^=\"打开 \"]')].map(b=>b.getAttribute('aria-label'))");
      assert(labels.indexOf("打开 排序较新的菜谱")<labels.indexOf("打开 可乐鸡翅"));
      record("editing an older recipe preserves created_at and does not promote it above a newer recipe");
      await open("排序较新的菜谱"); await d.click("删除这道菜"); await delay(5500);
    } else if (mode === "media") {
      const before=await row();
      await open("可乐鸡翅"); await d.click("编辑菜谱"); await picker(); await chooseSystemPhoto(); await save();
      const replaced=await row(); assert.notEqual(replaced.cover_path,before.cover_path); assert.equal(replaced.created_at,before.created_at);
      await d.coldStart(); await open("可乐鸡翅"); await d.wait("document.querySelector('img[alt=\"可乐鸡翅 封面\"]')?.naturalWidth>0");
      record("native picker replacement uses a new stable private file and survives cold start");
      await d.click("编辑菜谱"); await d.click("移除封面"); await save(); assert.equal((await row()).cover_path,null);
      record("image removal clears SQLite reference; files retained conservatively for snapshots");
      await d.click("编辑菜谱"); await picker(); await chooseSystemPhoto(); await save();
      await d.wait("document.querySelector('img[alt=\"可乐鸡翅 封面\"]')?.naturalWidth>0");
      assert.equal((await row()).created_at,before.created_at);
      record("cover reattached for overwrite-upgrade evidence; original creation time unchanged");
    } else if (mode === "cancel-media") {
      const before = await row();
      await open("可乐鸡翅"); await d.click("编辑菜谱");
      await d.fill("个人备注", "选图取消后保留输入");
      await picker();
      const chooser = d.adb("shell", "cat", "/sdcard/recipio-picker.xml");
      assert(chooser.includes('package="com.google.android.documentsui"'), "Native document picker absent");
      d.adb("shell", "input", "keyevent", "4");
      await d.wait("!document.querySelector('[aria-label=\"快速保存菜谱\"]').disabled");
      assert.equal(await d.evaluate("[...document.querySelectorAll('textarea')].at(-1).value"), "选图取消后保留输入");
      await d.wait("document.querySelector('img[alt=\"菜谱封面\"]')?.naturalWidth>0");
      assert.deepEqual(await row(), before);
      assert.equal(await d.evaluate("!!document.querySelector('[role=alert]')"), false);
      record("native picker cancellation preserves cover, unsaved text and every recipe field without an error");
    } else if (mode === "step-media") {
      const before=await row();
      assert(before,"Step image fixture recipe absent");
      const query={database:"recipio",statement:"SELECT * FROM recipe_steps WHERE recipe_id=? AND position=0",values:[before.id]};
      const firstStep=()=>d.evaluate(`window.Capacitor.Plugins.CapacitorSQLite.query(${JSON.stringify(query)}).then(r=>r.values[0])`);
      const beforeStep=await firstStep();
      assert(beforeStep,"Step image fixture first step absent");
      const imageAlt="步骤 1 参考图";
      const selectedImage=`[...document.querySelectorAll('img')].find(image=>image.alt===${JSON.stringify(imageAlt)})`;
      await open("可乐鸡翅"); await d.click("编辑菜谱"); await picker(1); await chooseSystemPhoto(imageAlt); await save();
      const added=await firstStep();
      assert.match(added.image_path,/^images\/[a-f0-9-]+\.(png|jpg|webp|avif)$/i);
      assert.equal(added.instruction,beforeStep.instruction);
      await d.coldStart(); await open("可乐鸡翅"); await d.wait(`${selectedImage}?.naturalWidth>0`);
      assert.deepEqual(await firstStep(),added);
      const persisted=await row();
      assert.equal(persisted.created_at,before.created_at);
      assert.equal(persisted.cover_path,before.cover_path);
      record("system-selected first step image persists in SQLite and renders after flight-mode cold start");
      await d.click("编辑菜谱"); await d.click("移除步骤图片"); await save();
      const removed=await firstStep();
      assert.equal(removed.image_path,null);
      assert.equal(removed.instruction,beforeStep.instruction);
      const after=await row();
      assert.equal(after.created_at,before.created_at);
      assert.equal(after.cover_path,before.cover_path);
      assert.equal(await d.evaluate(`!!(${selectedImage})`),false);
      record("step image removal clears SQLite reference while preserving instruction, cover and creation time");
    } else if (mode === "back") {
      await d.click("我的菜谱");
      await open("可乐鸡翅"); await d.click("编辑菜谱");
      d.adb("shell","input","keyevent","4"); await delay(600);
      await d.wait(detailReady);
      record("Android physical back returns unchanged editor to detail");
      await d.click("编辑菜谱"); await d.fill("个人备注","这条不应保存");
      d.adb("shell","input","keyevent","4"); await delay(300);
      d.adb("shell","uiautomator","dump","/sdcard/recipio-dialog.xml");
      const dialog=d.adb("shell","cat","/sdcard/recipio-dialog.xml");
      assert(dialog.includes("有未保存的修改"),"Dirty native back requires confirmation");
      d.adb("shell","input","keyevent","4"); await delay(300);
      assert.equal(await d.evaluate("[...document.querySelectorAll('textarea')].at(-1).value"),"这条不应保存");
      record("native dirty-back confirmation dismissal preserves input");
      // Return from CDP evaluation before the native confirm blocks the renderer.
      await d.wait("(() => {const b=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())==='取消');if(!b||b.disabled)return false;setTimeout(()=>b.click(),0);return true;})()");
      await delay(100);
      d.adb("shell","uiautomator","dump","/sdcard/recipio-dialog.xml");
      const discard=d.adb("shell","cat","/sdcard/recipio-dialog.xml");
      const ok=discard.match(/<node[^>]*text="OK"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      assert(ok,"Native discard confirmation button absent");
      d.adb("shell","input","tap",String((+ok[1]+ +ok[3])/2),String((+ok[2]+ +ok[4])/2));
      await d.wait(detailReady);
      assert.equal((await row()).notes,"原生离线编辑已保存");
      d.adb("shell","input","keyevent","4"); await d.wait("!!document.querySelector('[aria-label=\"新增菜谱\"]')");
      d.adb("shell","input","keyevent","4"); await delay(300);
      await d.wait(textHas("今天想做什么"));
      record("native back traverses detail→list→home without duplicate writes");
    } else if (mode === "fresh") {
      await d.wait(textHas("先记下第一道想做的菜"));
      await d.click("新增菜谱"); await d.fill("菜名","全新安装持久化验证"); await save();
      await d.coldStart(); await open("全新安装持久化验证");
      record("fresh Android user install initializes empty SQLite and preserves creation across cold starts");
      const user=d.adb("shell","am","get-current-user");
      const path=resolve(out,"fresh-native.db");
      d.adb("shell","am","force-stop","app.recipio.local");
      writeFileSync(path,d.raw("exec-out","run-as","app.recipio.local","--user",user,"cat","databases/recipioSQLite.db"));
      dbRead(path,db=>{assert.equal(db.prepare("PRAGMA user_version").get().user_version,2);assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check,"ok");});
      record("fresh native SQLite file schema v2 and integrity ok");
    } else if (mode === "upgrade" || mode === "upgrade-baseline") {
      await open("可乐鸡翅"); await d.wait(textHas("原生离线编辑已保存")); await d.wait("document.querySelector('img[alt=\"可乐鸡翅 封面\"]')?.naturalWidth>0");
      assert(await d.evaluate("document.documentElement.scrollWidth<=innerWidth"));
      const path=await d.snapshot(mode==="upgrade"?"after-overwrite.db":"before-overwrite.db");
      const data=dbRead(path,db=>{
        assert.equal(db.prepare("PRAGMA user_version").get().user_version,2);
        assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check,"ok");
        assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(),[]);
        const tables=["recipes","recipe_ingredients","recipe_steps","recipe_preparations","recipe_key_tips","recipe_changes"];
        return Object.fromEntries(tables.map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
      });
      const recipe=data.recipes.find(r=>r.title==="可乐鸡翅");
      assert(recipe.cover_path?.startsWith("images/"));
      const bytes=d.raw("exec-out","run-as","app.recipio.local","cat",`files/${recipe.cover_path}`);
      const state={data,imageBytes:bytes.length,imageSha256:createHash("sha256").update(bytes).digest("hex")};
      const reference=resolve(out,"overwrite-baseline.json");
      if(mode==="upgrade-baseline") {writeFileSync(reference,JSON.stringify(state,null,2));record("all six native tables and private cover hash captured before overwrite install");}
      else {
        assert.deepEqual(JSON.parse(JSON.stringify(state)),JSON.parse(readFileSync(reference,"utf8")));
        record("overwrite install retains every field in six native tables and identical private image bytes in flight mode");
      }
    }
    const remote = d.events.filter(e=>e.method==="Network.requestWillBeSent" && /^https?:/.test(e.params.request.url) && !e.params.request.url.startsWith("https://localhost/"));
    assert.deepEqual(remote, [], "Core issued remote network requests");
    const errors = d.events.filter(e=>e.method==="Runtime.exceptionThrown");
    assert.deepEqual(errors, [], "WebView runtime exception");
    if(!["inspect","fresh","upgrade","upgrade-baseline"].includes(mode)) assert(await d.evaluate("document.documentElement.scrollWidth<=innerWidth"),"Mobile horizontal overflow");
    record("no remote core requests or JS runtime exceptions observed in attached WebView");
  }
  success = true;
} catch (error) {
  failure=error.message;
  throw error;
} finally {
  writeFileSync(resolve(out, `${mode}-verification.json`), JSON.stringify({mode,serial,success,failure,checks,events:d.events,completedAt:new Date().toISOString()},null,2));
  d.close();
  d.adb("shell", "cmd", "connectivity", "airplane-mode", originalAirplane==="1"?"enable":"disable");
}
