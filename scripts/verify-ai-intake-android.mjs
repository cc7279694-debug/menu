// Explicit generated-data AVD only. Never targets a phone, never invokes real Provider.
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve,isAbsolute} from "node:path";
import JSZip from "jszip";
import {device,delay} from "./android-webview.mjs";
const [adbPath,serial,mode,apk]=process.argv.slice(2);
assert(isAbsolute(adbPath)&&existsSync(adbPath),"Absolute installed ADB required");
assert(["baseline","upgrade","secrets","picker","flows","temp","backup","offline","narrow","reinstall"].includes(mode),"Explicit APK-4 mode required");
assert(apk&&isAbsolute(apk)&&existsSync(apk),"Absolute APK required");
const d=device(adbPath,serial),out=resolve("artifacts/ai-intake");
mkdirSync(out,{recursive:true});
assert.equal(d.adb("emu","avd","name").split(/\r?\n/)[0].trim(),"Recipio_Backup_36","Do not switch target");
assert.equal(d.adb("shell","getprop","sys.boot_completed"),"1");
const sha=b=>createHash("sha256").update(b).digest("hex"),checks=[];
function boundedLogs(){
 const pid=d.adb("shell","pidof","app.recipio.local").split(" ")[0];
 return [[],["--pid="+pid]].map(filter=>{const result=spawnSync(adbPath,["-s",serial,"logcat","-d","-t","1000","-v","brief",...filter],{timeout:15000,maxBuffer:8*1024*1024,encoding:"utf8"});assert.equal(result.status,0,"Bounded log capture failed; never print device log contents");return result.stdout;}).join("\n");
}
const pass=t=>{checks.push(t);console.log("PASS: "+t);};
const has=t=>"document.body.innerText.includes("+JSON.stringify(t)+")";
const query=(sql,values=[])=>d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:"+JSON.stringify(sql)+",values:"+JSON.stringify(values)+"}).then(r=>r.values)");
const execute=sql=>d.evaluate("window.Capacitor.Plugins.CapacitorSQLite.execute({database:'recipio',statements:"+JSON.stringify(sql)+"})");
const permissionList=()=>[...d.adb("shell","dumpsys","package","app.recipio.local").matchAll(/android\.permission\.[A-Z_]+/g)].map(m=>m[0]).filter((v,i,a)=>a.indexOf(v)===i).sort();
const keyStatus=()=>d.evaluate("window.Capacitor.Plugins.LocalAiSecret.hasAiKey().then(r=>r.configured)");
const cacheDirs=()=>d.adb("shell","run-as","app.recipio.local","ls","cache/ai-import").split(/\r?\n/).filter(n=>/^[a-f0-9-]{36}$/.test(n));
const oldTables = [
  "recipes",
  "recipe_ingredients",
  "recipe_steps",
  "recipe_preparations",
  "recipe_key_tips",
  "recipe_changes",
];
async function rows(cooking = true) {
  const tables = cooking ? [...oldTables, "cooking_records"] : oldTables;
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (t) => [
        t,
        await query(
          `SELECT * FROM ${t} ORDER BY ${t === "recipes" || t === "recipe_changes" || t === "cooking_records" ? "id" : "recipe_id,position"}`,
        ),
      ]),
    ),
  );
}
function mediaBytes(path) {
  assert(
    /^images\/(?:[a-fA-F0-9-]+|generation-[a-fA-F0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(
      path,
    ),
  );
  return d.raw(
    "exec-out",
    "run-as",
    "app.recipio.local",
    "cat",
    `files/${path}`,
  );
}
function portable(r) {
  const image = (p) => (p === null ? null : sha(mediaBytes(p)));
  const detail = (x) => {
    const { coverPath, steps, ...rest } = x;
    return {
      ...rest,
      coverAssetId: image(coverPath),
      steps: steps.map(({ imagePath, ...s }) => ({
        ...s,
        imageAssetId: image(imagePath),
      })),
    };
  };
  const data = {
    recipes: r.recipes.map((x) => ({
      id: x.id,
      title: x.title,
      createdAt: x.created_at,
      updatedAt: x.updated_at,
      totalMinutes: x.total_minutes,
      servings: x.servings,
      caloriesPerServing: x.calories_per_serving,
      coverAssetId: image(x.cover_path),
      notes: x.notes,
    })),
    ingredients: r.recipe_ingredients.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      name: x.name,
      amount: x.amount,
    })),
    steps: r.recipe_steps.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      imageAssetId: image(x.image_path),
    })),
    preparations: r.recipe_preparations.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      minutes: x.minutes,
      timingText: x.timing_text,
    })),
    keyTips: r.recipe_key_tips.map((x) => ({
      recipeId: x.recipe_id,
      position: x.position,
      instruction: x.instruction,
      stepNumber: x.step_number,
    })),
    changes: r.recipe_changes.map((x) => ({
      id: x.id,
      recipeId: x.recipe_id,
      changedAt: x.changed_at,
      before: detail(JSON.parse(x.before_json)),
      after: detail(JSON.parse(x.after_json)),
    })),
    settings: {},
  };
  if (r.cooking_records)
    data.cookingRecords = r.cooking_records.map((x) => ({
      id: x.id,
      recipeId: x.recipe_id,
      cookedAt: x.cooked_at,
      finishedPhotoAssetId: image(x.finished_photo_path),
      evaluation: x.evaluation,
      note: x.note,
    }));
  return data;
}
function canonical(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) =>
      Array.isArray(v) && ["recipes", "changes", "cookingRecords"].includes(k)
        ? [...v].sort((a, b) => a.id.localeCompare(b.id))
        : v,
    ),
  );
}
async function inspect(path) {
  const zip = await JSZip.loadAsync(readFileSync(path)),
    manifest = JSON.parse(await zip.file("manifest.json").async("string")),
    bytes = await zip.file("data.json").async("nodebuffer"),
    data = JSON.parse(bytes);
  assert.equal(bytes.length, manifest.dataFile.size);
  assert.equal(sha(bytes), manifest.dataFile.sha256);
  for (const field of Object.keys(data).filter((k) => k !== "settings"))
    assert.equal(data[field].length, manifest.counts[field]);
  assert.equal(manifest.media.length, manifest.counts.media);
  for (const asset of manifest.media) {
    const b = await zip.file(asset.path).async("nodebuffer");
    assert.equal(b.length, asset.size);
    assert.equal(sha(b), asset.sha256);
  }
  return {
    manifest,
    data,
    path,
    size: readFileSync(path).length,
    sha256: sha(readFileSync(path)),
  };
}
async function click(label) {
  await d.wait(
    `(()=>{const root=document.querySelector('[role=dialog]')||document;const b=[...root.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)});if(!b)return false;b.scrollIntoView({block:'center'});b.click();return true;})()`,
  );
  await delay(100);
}
function xml() {
  d.adb("shell", "uiautomator", "dump", "/sdcard/recipio-ai-picker.xml");
  return d.adb("shell", "cat", "/sdcard/recipio-ai-picker.xml");
}
function tapXml(predicate) {
  const n = (xml().match(/<node\b[^>]*>/g) ?? []).find(predicate);
  if (!n) return false;
  const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(b);
  d.adb(
    "shell",
    "input",
    "tap",
    String((+b[1] + +b[3]) / 2),
    String((+b[2] + +b[4]) / 2),
  );
  return true;
}
async function tap(predicate, label) {
  for (let i = 0; i < 10; i++) {
    if (tapXml(predicate)) {
      await delay(400);
      return;
    }
    await delay(200);
  }
  throw new Error(`System control missing: ${label}\n${xml()}`);
}
async function waitIme(shown){
 for(let i=0;i<20;i++){if(d.adb("shell","dumpsys","input_method").includes("mIsInputViewShown="+shown))return;await delay(200);}
 throw new Error("Actual Android keyboard visibility did not settle to "+shown);
}
async function downloads() {
  let state = xml();
  const root = (n) =>
    n.includes('text="Downloads"') &&
    n.includes('resource-id="android:id/title"');
  if (
    state.includes(
      'resource-id="com.google.android.documentsui:id/breadcrumb_text"',
    ) &&
    state.includes('text="Downloads"') &&
    !(state.match(/<node\b[^>]*>/g) ?? []).some(root)
  )
    return;
  if (!(state.match(/<node\b[^>]*>/g) ?? []).some(root))
    await tap((n) => n.includes('content-desc="Show roots"'), "Show roots");
  await tap(root, "Downloads");
}
async function selectFile(name) {
  await downloads();
  const match = (n) =>
    n.includes(`text="${name}"`) || n.includes(`content-desc="${name},`);
  for (let i = 0; i < 20; i++) {
    if (tapXml(match)) {
      await delay(500);
      return;
    }
    const n = (xml().match(/<node\b[^>]*>/g) ?? []).find((n) =>
      n.includes('resource-id="com.google.android.documentsui:id/dir_list"'),
    );
    assert(n);
    const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert(b);
    const x = String((+b[1] + +b[3]) / 2);
    d.adb(
      "shell",
      "input",
      "swipe",
      x,
      String(+b[2] + (+b[4] - +b[2]) * 0.8),
      x,
      String(+b[2] + (+b[4] - +b[2]) * 0.25),
      "250",
    );
    await delay(200);
  }
  throw new Error(`Generated file not found: ${name}`);
}
async function settings() {
  await click("设置");
  await d.wait(has("数据与备份"));
}
const documents = () =>
  d
    .adb("shell", "ls", "/sdcard/Download")
    .split(/\r?\n/)
    .filter((n) => n.endsWith(".recipio"));
async function exportUI(label) {
  const before = documents();
  await click("导出完整备份");
  await delay(600);
  await downloads();
  await tap(
    (n) => n.includes('text="SAVE"') || n.includes('text="Save"'),
    "Save",
  );
  await d.wait(has("完整备份已保存并回读校验"));
  const added = documents().filter((n) => !before.includes(n));
  assert.equal(added.length, 1);
  const path = resolve(out, `${label}-${Date.now()}.recipio`);
  d.adb("pull", `/sdcard/Download/${added[0]}`, path);
  const checked = await inspect(path);
  pass(
    `system export ${label}, counts/sizes/data and every image SHA verified`,
  );
  return { name: added[0], ...checked };
}
async function restoreChoice(name, valid = true) {
  await click("导入并恢复");
  await delay(600);
  await selectFile(name);
  await d.wait(
    valid
      ? has("备份已校验，图片已暂存")
      : "!!document.querySelector('[role=alert]')",
  );
}
async function replace(count) {
  await click("恢复并替换当前数据");
  await click(`确认替换 ${count} 道菜谱`);
  await d.wait(has("恢复成功，所有数据已提交"));
}
async function open(title) {
  await click(`打开 ${title}`);
  await d.wait(has("完整步骤"));
}
async function minimumComplete() {
  await click("完成这道菜");
  await d.wait(has("已记录做过这道菜"));
}
async function save() {
  await click("快速保存菜谱");
  await d.wait(has("编辑菜谱"));
}

async function approvedGolden(){const checked=await inspect(resolve("artifacts/cooking-experience/cooking-v2-1791107599943.recipio"));assert.equal(checked.sha256,"efe5d4d014ac81031c985213dff3e778926e10e2817f96d54bde15f763013ded");return checked;}
async function generated(){const actual=await rows(),golden=await approvedGolden();const approved=new Map(golden.data.recipes.map(r=>[r.id,r.title]));assert(actual.recipes.every(r=>approved.get(r.id)===r.title||r.id==="recipe-fixed"||r.title.startsWith("APK3 ")||r.title.startsWith("APK4 ")),"Refuse unproven personal data");assert.deepEqual(await query("PRAGMA foreign_key_check"),[]);return actual;}
async function aiInput(){await click("新增菜谱");await click("AI 整理");await d.wait(has("AI 整理菜谱"));}
async function abandon(){await click("返回");await click("放弃本轮整理");await d.wait(has("今天想做什么"));}
async function fixtureFiles(){
  const result=d.adb("shell","am","instrument","-w","-r","-e","class","app.recipio.local.AiSafFixturesInstrumentedTest","app.recipio.local.test/androidx.test.runner.AndroidJUnitRunner");
  assert(result.includes("OK (1 test)"),"Generated fixture instrumentation failed");
  const roots=d.adb("shell","run-as","app.recipio.local","ls","cache").split(/\r?\n/).filter(n=>/^recipio-ai-fixture-[a-f0-9-]{36}$/.test(n));assert(roots.length);
  const root=roots.at(-1);for(const name of ["generated.jpg","generated.png","generated.webp","corrupt.png","oversize.png"]){const path=resolve(out,name);const read=spawnSync(adbPath,["-s",serial,"exec-out","run-as","app.recipio.local","cat","cache/"+root+"/"+name],{timeout:30000,maxBuffer:20*1024*1024});assert.equal(read.status,0,"Generated fixture copy failed; never print binary bytes");writeFileSync(path,read.stdout);d.adb("push",path,"/sdcard/Download/recipio-ai-"+name);}
}
let failure;const beforeNetwork={airplane:d.adb("shell","settings","get","global","airplane_mode_on"),wifi:d.adb("shell","settings","get","global","wifi_on"),data:d.adb("shell","settings","get","global","mobile_data")};
const font=d.adb("shell","settings","get","system","font_scale");
const hardwareIme=d.adb("shell","settings","get","secure","show_ime_with_hard_keyboard");
const baselineFile=resolve(out,"baseline-v11.json");
try{
 await d.coldStart();await generated();
 if(mode==="baseline"){
  assert(!existsSync(baselineFile),"Frozen baseline cannot be overwritten");assert(d.adb("shell","dumpsys","package","app.recipio.local").includes("versionCode=11"));
  let current=await rows();
  const checked=await approvedGolden();if(current.recipes.length===0){d.adb("push",checked.path,"/sdcard/Download/recipio-ai-v11-golden.recipio");await settings();await restoreChoice("recipio-ai-v11-golden.recipio");await replace(0);current=await generated();}
  assert.deepEqual(canonical(portable(current)),canonical(checked.data),"Original external Golden must match exactly before freezing v11");
  assert(current.cooking_records.length>0&&current.recipe_changes.length>0,"Nonempty seven-entity baseline required");assert.equal((await query("PRAGMA user_version"))[0].user_version,4);
  writeFileSync(baselineFile,JSON.stringify({rows:current,portable:portable(current),metadata:await query("SELECT * FROM backup_restore_state"),permissions:permissionList(),apkSha256:sha(readFileSync(apk))},null,2),{flag:"wx"});pass("v11 seven entities, fields/IDs/timestamps/order/media SHA and restore facts frozen from proven generated backup");
 }else if(mode==="upgrade"){
  const before=JSON.parse(readFileSync(baselineFile,"utf8"));d.close();d.adb("install","-r",resolve(apk));await d.coldStart();assert(d.adb("shell","dumpsys","package","app.recipio.local").includes("versionCode=12"));assert.equal((await query("PRAGMA user_version"))[0].user_version,4);
  assert.deepEqual(await rows(),before.rows);assert.deepEqual(portable(await rows()),before.portable);assert.deepEqual(await query("SELECT * FROM backup_restore_state"),before.metadata);assert.deepEqual(permissionList().filter(p=>!before.permissions.includes(p)),["android.permission.INTERNET"]);pass("actual v11→v12 install-r preserves SQLite4/seven tables/media SHA/restore facts; only new permission INTERNET");
 }else if(mode==="secrets"){
  assert.equal(await keyStatus(),false,"Never replace a pre-existing credential");
  const generatedKey="sk-"+randomUUID();await settings();await click("设置 AI 密钥");await delay(500);
  await tap(n=>n.includes('class="android.widget.EditText"'),"secure native password input");
  d.adb("shell","input","text",generatedKey);await tap(n=>n.includes('resource-id="android:id/button1"'),"native Save");
  await d.wait(has("已配置"));assert.equal(await keyStatus(),true);
  const cipher=d.raw("exec-out","run-as","app.recipio.local","cat","no_backup/ai-secret/key-v1.json");assert(!cipher.includes(Buffer.from(generatedKey)));
  const cipherHash=sha(cipher);writeFileSync(resolve(out,"generated-credential.json"),JSON.stringify({cipherSha256:cipherHash,generatedOnly:true},null,2),{flag:"wx"});
  const logs=boundedLogs();assert(!logs.includes(generatedKey),"Generated credential leaked to device logs");assert(!logs.includes("APK4 GENERATED INPUT"),"Generated intake source leaked to device logs");
  await click("更换 AI 密钥");await delay(400);await tap(n=>n.includes('resource-id="android:id/button2"'),"native Cancel");assert.equal(sha(d.raw("exec-out","run-as","app.recipio.local","cat","no_backup/ai-secret/key-v1.json")),cipherHash);
  await d.coldStart();assert.equal(await keyStatus(),true);
  pass("actual native secure dialog configures generated-only credential; ciphertext not plaintext; replace-cancel/restart verified, retained solely for same-device restore test, zero Provider calls");
 }else if(mode==="picker"){
  await fixtureFiles();await d.coldStart();await aiInput();await d.fill("菜谱文字","APK4 GENERATED INPUT");
  for(const name of ["generated.jpg","generated.png","generated.webp"]){await click("添加截图");await delay(400);await selectFile("recipio-ai-"+name);await d.wait("document.querySelectorAll('img[alt^=\"截图 \"').length>="+(["generated.jpg","generated.png","generated.webp"].indexOf(name)+1));}
  assert(await d.evaluate("[...document.querySelectorAll('img[alt^=\"截图 \"')].every(i=>i.naturalWidth>0)"));pass("real SAF JPEG/PNG/WebP selects and private thumbnails render");
  await click("添加截图");await delay(400);d.adb("shell","input","keyevent","4");await d.wait(has("AI 整理菜谱"));assert.equal(await d.evaluate("document.querySelector('textarea').value"),"APK4 GENERATED INPUT");
  const before=await d.evaluate("[...document.querySelectorAll('img[alt^=\"截图 \"')].map(i=>i.src)");await click("前移截图 3");const moved=await d.evaluate("[...document.querySelectorAll('img[alt^=\"截图 \"')].map(i=>i.src)");assert.equal(moved[1],before[2]);await click("移除截图 2");await d.wait("document.querySelectorAll('img[alt^=\"截图 \"').length===2");
  for(let i=2;i<6;i++){await click("添加截图");await delay(400);await selectFile("recipio-ai-generated.png");await d.wait("document.querySelectorAll('img[alt^=\"截图 \"').length==="+(i+1));}assert(await d.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='添加截图').disabled"));pass("cancel preserves text/selected images; reorder/remove and six-image hard cap verified");
  await abandon();assert.deepEqual(cacheDirs(),[]);await aiInput();for(const name of ["corrupt.png","oversize.png"]){await click("添加截图");await delay(400);await selectFile("recipio-ai-"+name);await d.wait("!!document.querySelector('[role=alert]')");assert.equal(await d.evaluate("document.querySelectorAll('img[alt^=\"截图 \"').length"),0);}await abandon();assert.deepEqual(cacheDirs(),[]);pass("corrupt/oversize reject before send; abandonment removes only temporary namespace");
 }else if(mode==="temp"){
  await fixtureFiles();await d.coldStart();await aiInput();await click("添加截图");await delay(400);await selectFile("recipio-ai-generated.png");await d.wait("document.querySelector('img[alt=\"截图 1\"]')?.naturalWidth>0");assert(cacheDirs().length>0);
  await d.coldStart();await aiInput();await d.wait("document.querySelector('textarea')?.value===''");
  const leftovers=cacheDirs();assert.equal(leftovers.length,1);await abandon();assert.deepEqual(cacheDirs(),[]);pass("force-stop loses only in-memory source and next entry cleans registered abandoned cache, not permanent images");
 }else if(mode==="flows"||mode==="offline"){
  if(mode==="offline"){d.adb("shell","cmd","connectivity","airplane-mode","enable");d.adb("shell","svc","wifi","disable");d.adb("shell","svc","data","disable");await d.coldStart();}
  const title="APK4 验收鸭 "+Date.now();await click("新增菜谱");await click("手动录入");await d.fill("菜名",title);await click("添加步骤");await d.fill("步骤 1","洗净鸭肉");await click("添加步骤");await d.fill("步骤 2","小火焖煮");await save();
  const cookedBefore=(await query("SELECT * FROM cooking_records")).length;
  await click("放大步骤 1");await d.wait(has("单步查看"));d.adb("shell","input","keyevent","4");await d.wait("!document.querySelector('[role=dialog]')");await click("开始引导烹饪");await click("下一步");d.adb("shell","input","keyevent","4");await d.wait("!document.querySelector('[role=dialog]')");assert.equal((await query("SELECT * FROM cooking_records")).length,cookedBefore);
  await click("编辑菜谱");await d.fill("个人备注","中文\n离线 🍚");await save();await minimumComplete();await click("完成并返回");await click("查看做菜记录");await d.wait(has("做过"));await d.coldStart();await open(title);await d.wait(has("离线 🍚"));await click("查看修改记录");await d.wait(has("离线 🍚"));await d.coldStart();await d.fill("搜索菜名或食材",title);await d.wait(has(title));assert.equal((await query("PRAGMA integrity_check"))[0].integrity_check,"ok");
  pass("local manual create/edit/search/explicit cooking/history/change-history and cold-restart persist with no required AI");
  if(mode==="offline"){await d.coldStart();await aiInput();await d.fill("菜谱文字","APK4 offline source");await d.wait(has("前往设置 AI 密钥"));await abandon();pass("airplane-mode AI missing-key fallback leaves core available; real authenticated network smoke Not Run");assert.deepEqual(d.events.filter(e=>e.method==="Network.requestWillBeSent"&&!/^(https:\/\/localhost|data:|blob:)/.test(e.params.request.url)),[]);}
 }else if(mode==="backup"){
  const before=portable(await generated());await settings();const backup=await exportUI("ai-intake-generated");assert.equal(backup.manifest.formatVersion,2);assert.equal(backup.manifest.databaseSchemaVersion,4);assert.deepEqual(canonical(backup.data),canonical(before));assert(!JSON.stringify(backup.data).match(/rawJson|fieldChecks|ai-import|apiKey/));const keyBefore=await keyStatus();await restoreChoice(backup.name);await click("取消恢复");assert.deepEqual(portable(await rows()),before);await restoreChoice(backup.name);await replace((await rows()).recipes.length);assert.deepEqual(canonical(portable(await rows())),canonical(before));assert.equal(await keyStatus(),keyBefore);writeFileSync(resolve(out,"backup-metadata.json"),JSON.stringify({path:backup.path,bytes:backup.size,sha256:backup.sha256},null,2));pass("same-device replace/cancel and Backup2 readback preserve all seven tables/images; no key/intake/temp included");
  const current=await rows(),zip=await JSZip.loadAsync(readFileSync(backup.path)),badManifest=JSON.parse(await zip.file("manifest.json").async("string"));badManifest.dataFile.sha256="f".repeat(64);zip.file("manifest.json",JSON.stringify(badManifest));const bad=resolve(out,"corrupt-"+Date.now()+".recipio");writeFileSync(bad,await zip.generateAsync({type:"nodebuffer"}),{flag:"wx"});d.adb("push",bad,"/sdcard/Download/recipio-ai-corrupt.recipio");await restoreChoice("recipio-ai-corrupt.recipio",false);assert.deepEqual(await rows(),current);pass("corrupt archive rejects before changing current seven tables or media");
  await restoreChoice(backup.name);await execute("CREATE TRIGGER apk4_restore_failure BEFORE INSERT ON cooking_records BEGIN SELECT RAISE(ABORT,'generated restore fault'); END;");try{await click("恢复并替换当前数据");await click(`确认替换 ${current.recipes.length} 道菜谱`);await d.wait("!!document.querySelector('[role=alert]')");assert.deepEqual(await rows(),current);assert.deepEqual(canonical(portable(await rows())),canonical(before));}finally{await execute("DROP TRIGGER apk4_restore_failure;");}pass("real SQLite insert fault rolls back all seven tables and retains image bytes");
  const old=await inspect(resolve("artifacts/backup-restore/golden.recipio"));assert.equal(old.sha256,"6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313");d.adb("push",old.path,"/sdcard/Download/recipio-ai-v1-golden.recipio");await restoreChoice("recipio-ai-v1-golden.recipio");await replace((await rows()).recipes.length);const {cookingRecords,...legacy}=portable(await rows());assert.deepEqual(cookingRecords,[]);assert.deepEqual(canonical(legacy),canonical(old.data));assert.equal((await query("SELECT data_sha256 FROM backup_restore_state WHERE id=1"))[0].data_sha256,old.manifest.dataFile.sha256);assert.equal(await keyStatus(),keyBefore);pass("unchanged strict v1 restores old fields/history/images with empty cooking and original commit hash");
  await restoreChoice(backup.name);await replace((await rows()).recipes.length);assert.deepEqual(canonical(portable(await generated())),canonical(before));await execute("DELETE FROM recipes;");assert(Object.values(await rows()).every(r=>r.length===0));await d.coldStart();await settings();await restoreChoice(backup.name);await replace(0);assert.deepEqual(canonical(portable(await rows())),canonical(before));assert.equal(await keyStatus(),keyBefore);pass("verified external v2 → clear proven generated rows → real Replace restores exact IDs/times/order/all image hashes");
  assert.equal(keyBefore,true,"Generated credential must cover real same-device Replace");const credential=JSON.parse(readFileSync(resolve(out,"generated-credential.json"),"utf8"));assert.equal(credential.generatedOnly,true);assert.equal(sha(d.raw("exec-out","run-as","app.recipio.local","cat","no_backup/ai-secret/key-v1.json")),credential.cipherSha256,"Never delete a different credential");await click("删除 AI 密钥");await click("确认删除");await d.wait(has("未配置"));await restoreChoice(backup.name);await replace((await rows()).recipes.length);assert.equal(await keyStatus(),false);assert.deepEqual(canonical(portable(await rows())),canonical(before));pass("same-device Replace preserves exact generated credential ciphertext; explicitly deleting it then restoring cannot recreate key");
 }else if(mode==="narrow"){
  try{
   d.adb("shell","settings","put","system","font_scale","1.5");d.adb("shell","settings","put","secure","show_ime_with_hard_keyboard","1");await d.coldStart();
   await d.command("Emulation.setDeviceMetricsOverride",{width:320,height:740,deviceScaleFactor:1,mobile:true});
   await aiInput();await d.fill("菜谱文字","APK4 大字体\n中文 🍚");
   assert(await d.evaluate("document.documentElement.scrollWidth<=320"));
   const controls=await d.evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,height:r.height,width:r.width};})");
   assert(controls.every(r=>r.height>=44),JSON.stringify(controls));
   const area=await d.evaluate("(()=>{const el=document.querySelector('textarea');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+Math.min(30,r.height/2)};})()");
   // The installed Android WebView receives a real renderer touch; IME visibility is still checked natively.
   await d.command("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[area]});await d.command("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
   await d.wait("document.activeElement?.tagName==='TEXTAREA'");
   await waitIme(true);
   assert(await d.evaluate("document.documentElement.scrollWidth<=320"));
   d.adb("shell","input","keyevent","4");await waitIme(false);
   assert(await d.evaluate("!document.querySelector('[role=dialog]')"),"First Back closes only keyboard, not intake");
   writeFileSync(resolve(out,"narrow-input-generated.png"),d.raw("exec-out","screencap","-p"));
   d.adb("shell","input","keyevent","4");await d.wait(has("放弃本轮整理"));await click("继续整理");
   assert.equal(await d.evaluate("document.querySelector('textarea').value"),"APK4 大字体\n中文 🍚");await abandon();
   pass("320px / systemfont1.5 input has no horizontal overflow, 44px controls; actual IME and Back preserve unsaved source");
  }finally{await d.command("Emulation.clearDeviceMetricsOverride");}
 }else if(mode==="reinstall"){
  const before=portable(await generated()),facts=await query("SELECT * FROM backup_restore_state"),key=await keyStatus();d.close();d.adb("install","-r",resolve(apk));await d.coldStart();assert.deepEqual(portable(await rows()),before);assert.deepEqual(await query("SELECT * FROM backup_restore_state"),facts);assert.equal(await keyStatus(),key);pass("same-final-APK install-r retains all entities, image hashes, restore metadata and device credential state");
 }
}catch(e){failure=e;console.error(e.message);}
finally{
 if(mode==="offline"){d.adb("shell","cmd","connectivity","airplane-mode",beforeNetwork.airplane==="1"?"enable":"disable");d.adb("shell","svc","wifi",beforeNetwork.wifi==="1"?"enable":"disable");d.adb("shell","svc","data",beforeNetwork.data==="1"?"enable":"disable");}
 d.adb("shell","settings","put","system","font_scale",font);
 if(mode==="narrow"){if(hardwareIme==="null")d.adb("shell","settings","delete","secure","show_ime_with_hard_keyboard");else d.adb("shell","settings","put","secure","show_ime_with_hard_keyboard",hardwareIme);}
 writeFileSync(resolve(out,mode+"-result-"+Date.now()+".json"),JSON.stringify({mode,serial,avd:"Recipio_Backup_36",api:d.adb("shell","getprop","ro.build.version.sdk"),abi:d.adb("shell","getprop","ro.product.cpu.abi"),generatedOnly:true,apk:{path:resolve(apk),bytes:readFileSync(apk).length,sha256:sha(readFileSync(apk))},passed:checks,failure:failure?.message??null,realProviderPosts:0,notRun:["physical phone","user-account preflight","real AI text/single/multiple image smoke"]},null,2));d.close();
}
if(failure)process.exitCode=1;
