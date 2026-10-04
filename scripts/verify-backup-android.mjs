// Generated-data-only acceptance. Explicit new AVD, never a phone or prior user environment.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { device, delay } from "./android-webview.mjs";
const [adbPath,serial,mode="full",apk] = process.argv.slice(2);
assert(["baseline","upgrade","full","full-resume","inspect","export-failure","coverage","coverage-resume","final-restore"].includes(mode));
const d=device(adbPath,serial),out=resolve("artifacts/backup-restore");mkdirSync(out,{recursive:true});
assert.equal(d.adb("emu","avd","name").split(/\r?\n/)[0].trim(),"Recipio_Backup_36","Only this task's generated-data AVD may be changed");
assert.equal(d.adb("shell","getprop","sys.boot_completed"),"1","Wait for the dedicated AVD to finish booting before acceptance");
const checks=[];const record=text=>{checks.push(text);console.log(`PASS: ${text}`);};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const has=text=>`document.body.innerText.includes(${JSON.stringify(text)})`;
const query=async(sql,values=[])=>d.evaluate(`window.Capacitor.Plugins.CapacitorSQLite.query({database:'recipio',statement:${JSON.stringify(sql)},values:${JSON.stringify(values)}}).then(r=>r.values)`);
const execute=sql=>d.evaluate(`window.Capacitor.Plugins.CapacitorSQLite.execute({database:'recipio',statements:${JSON.stringify(sql)},transaction:true})`);
const tables=["recipes","recipe_ingredients","recipe_steps","recipe_preparations","recipe_key_tips","recipe_changes"];
async function rows(){return Object.fromEntries(await Promise.all(tables.map(async t=>[t,await query(`SELECT * FROM ${t} ORDER BY ${t==="recipes"||t==="recipe_changes"?"id":"recipe_id,position"}`)])));}
function readMedia(path){assert(/^images\/(?:[a-fA-F0-9-]+|generation-[a-fA-F0-9-]+\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/.test(path));return d.raw("exec-out","run-as","app.recipio.local","cat",`files/${path}`);}
function portable(rows){
  const image=p=>p===null?null:hash(readMedia(p));
  const details=d=>{const {coverPath,steps,...rest}=d;return {...rest,coverAssetId:image(coverPath),steps:steps.map(({imagePath,...s})=>({...s,imageAssetId:image(imagePath)}))};};
  return {recipes:rows.recipes.filter(r=>r.deleted_at===null).map(r=>({id:r.id,title:r.title,createdAt:r.created_at,updatedAt:r.updated_at,totalMinutes:r.total_minutes,servings:r.servings,caloriesPerServing:r.calories_per_serving,coverAssetId:image(r.cover_path),notes:r.notes})),
    ingredients:rows.recipe_ingredients.map(r=>({recipeId:r.recipe_id,position:r.position,name:r.name,amount:r.amount})),steps:rows.recipe_steps.map(r=>({recipeId:r.recipe_id,position:r.position,instruction:r.instruction,imageAssetId:image(r.image_path)})),preparations:rows.recipe_preparations.map(r=>({recipeId:r.recipe_id,position:r.position,instruction:r.instruction,minutes:r.minutes,timingText:r.timing_text})),keyTips:rows.recipe_key_tips.map(r=>({recipeId:r.recipe_id,position:r.position,instruction:r.instruction,stepNumber:r.step_number})),changes:rows.recipe_changes.map(r=>({id:r.id,recipeId:r.recipe_id,changedAt:r.changed_at,before:details(JSON.parse(r.before_json)),after:details(JSON.parse(r.after_json))})),settings:{}};
}
function fixture(action,source,output,defect){const result=spawnSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",resolve("scripts/backup-fixtures.ps1"),"-Action",action,"-Source",source??"","-Output",output,"-Defect",defect??""],{timeout:60000,encoding:"utf8"});assert.equal(result.status,0,result.stderr||result.stdout);}
function xml(){d.adb("shell","uiautomator","dump","/sdcard/backup-picker.xml");return d.adb("shell","cat","/sdcard/backup-picker.xml");}
function tapXml(predicate){const nodes=xml().match(/<node\b[^>]*>/g)??[];const node=nodes.find(predicate);if(!node)return false;const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(b);d.adb("shell","input","tap",String((+b[1]+ +b[3])/2),String((+b[2]+ +b[4])/2));return true;}
async function tap(predicate,label){for(let i=0;i<12;i++){if(tapXml(predicate)){await delay(500);return;}await delay(250);}throw new Error(`System picker control missing: ${label}\n${xml()}`);}
async function downloads(){
  const root=n=>n.includes('text="Downloads"')&&n.includes('resource-id="android:id/title"');
  const inDownloads=state=>state.includes('resource-id="com.google.android.documentsui:id/breadcrumb_text"')&&state.includes('text="Downloads"')&&!((state.match(/<node\b[^>]*>/g)??[]).some(root));
  const state=xml();
  if(inDownloads(state))return;
  if(!(state.match(/<node\b[^>]*>/g)??[]).some(root))await tap(n=>n.includes('content-desc="Show roots"'),"Show roots");
  await tap(root,"Downloads root");
  for(let i=0;i<12;i++){if(inDownloads(xml()))return;await delay(250);}
  throw new Error("Downloads root did not finish opening");
}
function scrollFiles(up){
  const list=(xml().match(/<node\b[^>]*>/g)??[]).find(n=>n.includes('resource-id="com.google.android.documentsui:id/dir_list"'));
  assert(list,"System file list unavailable");const b=list.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(b);
  const x=Math.round((+b[1]+ +b[3])/2),low=Math.round(+b[2]+(+b[4]- +b[2])*0.28),high=Math.round(+b[2]+(+b[4]- +b[2])*0.78);
  d.adb("shell","input","swipe",String(x),String(up?low:high),String(x),String(up?high:low),"350");
}
async function selectFile(name){
  await downloads();const match=n=>n.includes(`text="${name}"`)||n.includes(`content-desc="${name},`);
  if(tapXml(match)){await delay(500);return;}
  for(let i=0;i<3;i++){scrollFiles(true);await delay(300);if(tapXml(match)){await delay(500);return;}}
  for(let i=0;i<16;i++){scrollFiles(false);await delay(300);if(tapXml(match)){await delay(500);return;}}
  throw new Error(`System file absent after bounded scrolling: ${name}`);
}
async function trustedFileInput(index,name,alt){
  const old=await d.evaluate(`document.querySelector('img[alt=${JSON.stringify(alt)}]')?.src||''`);
  const p=await d.evaluate(`(()=>{const e=document.querySelectorAll('input[type=file]')[${index}];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await d.command("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...p});await d.command("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...p});await delay(700);await selectFile(name);
  await d.wait(`(()=>{const image=document.querySelector('img[alt=${JSON.stringify(alt)}]');return image?.naturalWidth>0&&image.src!==${JSON.stringify(old)};})()`);
}
async function settings(){await d.click("设置");await d.wait(has("数据与备份"));}
const downloadsFiles=()=>d.adb("shell","ls","/sdcard/Download").split(/\r?\n/).filter(n=>n.endsWith(".recipio"));
async function exportUI(label){
  const before=downloadsFiles();await d.click("导出完整备份");await delay(700);await downloads();await tap(n=>n.includes('text="SAVE"')||n.includes('text="Save"'),"Save");
  await d.wait(has("完整备份已保存并回读校验"));const added=downloadsFiles().filter(n=>!before.includes(n));assert.equal(added.length,1);const name=added[0];const path=resolve(out,`${label}.recipio`);d.adb("pull",`/sdcard/Download/${name}`,path);const json=resolve(out,`${label}-inspection.json`);fixture("Inspect",path,json);const inspected=JSON.parse(readFileSync(json,"utf8"));assert.equal(inspected.manifest.counts.media,Object.keys(inspected.media).length);for(const m of inspected.manifest.media){assert.equal(inspected.media[m.path].size,m.size);assert.equal(inspected.media[m.path].sha256,m.sha256);}record(`system export ${label}: manifest/counts/size/SHA verified`);return {name,path,...inspected};
}
async function chooseRestore(name,expected="preview"){await d.click("导入并恢复");await delay(700);await selectFile(name);await d.wait(expected==="preview"?has("备份已校验，图片已暂存"):`!!document.querySelector('[role=alert]')`);}
async function replaceUI(count){await d.click("恢复并替换当前数据");await d.click(`确认替换 ${count} 道菜谱`);await d.wait(has("恢复成功，所有数据已提交"));}
async function saved(){await d.click("快速保存菜谱");await d.wait(has("编辑菜谱"));}
async function verifyRestoredDisplay(){
  await d.coldStart();await d.wait("document.querySelector('img[alt=\"可乐鸡翅 🍗 封面\"]')?.naturalWidth>0");await delay(500);await d.screenshot(resolve(out,"restored-final-home.png"));await d.click("打开 可乐鸡翅 🍗");await d.wait("(()=>{const images=[...document.querySelectorAll('img')].filter(i=>i.alt.includes('封面')||i.alt.includes('步骤'));return images.length>=2&&images.every(i=>i.naturalWidth>0);})()");await delay(500);await d.screenshot(resolve(out,"restored-final-detail.png"));assert.equal(Object.values((await query("PRAGMA integrity_check"))[0])[0],"ok");assert.deepEqual(await query("PRAGMA foreign_key_check"),[]);record("final APK flight-mode cold start: home/step images decoded; SQLite integrity and foreign keys valid");
}
let failure;
try {
  await d.coldStart();
  if(mode==="baseline"){
    const data=await rows();assert.equal((await query("PRAGMA user_version"))[0].user_version,2);assert(data.recipes.length&&data.recipes.every(r=>r.title==="可乐鸡翅"));writeFileSync(resolve(out,"v6-baseline.json"),JSON.stringify(data,null,2));record("actual V6 generated rows captured");
  } else if(mode==="upgrade") {
    const baseline=JSON.parse(readFileSync(resolve(out,"v6-baseline.json"),"utf8"));assert.equal((await query("PRAGMA user_version"))[0].user_version,3);assert.deepEqual(await rows(),baseline);record("install -r V6→V7 retains all six tables and timestamps; v3 migration");
  } else if(mode==="coverage"||mode==="coverage-resume") {
    assert(apk,"Higher-version APK required");const golden=JSON.parse(readFileSync(resolve(out,"golden-inspection.json"),"utf8"));assert.deepEqual(portable(await rows()),golden.data);
    const version=()=>Number(d.adb("shell","dumpsys","package","app.recipio.local").match(/versionCode=(\d+)/)[1]);
    if(mode==="coverage"){const beforeVersion=version();d.close();d.adb("install","-r",resolve(apk));await d.coldStart();assert(version()>beforeVersion,"Coverage install must really increase versionCode");assert.deepEqual(portable(await rows()),golden.data);record("higher versionCode coverage installation retains all rows and media SHA");}
    else {assert.equal(version(),10,"Resume only the final APK whose V9→V10 installation was already measured");record("resume final V10 and exact golden rows after recorded System UI interruption; no repeated install claim");}
    await settings();
    // Use the exact external golden file recorded by the initial export, not a guessed newer document.
    const recorded=JSON.parse(readFileSync(resolve(out,"external-files.json"),"utf8"));assert(downloadsFiles().includes(recorded.golden));await chooseRestore(recorded.golden);await replaceUI(golden.data.recipes.length);assert.deepEqual(portable(await rows()),golden.data);record("previous APK's Format v1 backup validates and restores after coverage installation");
    await verifyRestoredDisplay();
  } else if(mode==="final-restore") {
    const data=await rows();assert(Object.values(data).every(v=>v.length===0),"Only the empty test app after UTP uninstall may be restored here");const golden=JSON.parse(readFileSync(resolve(out,"golden-inspection.json"),"utf8"));const recorded=JSON.parse(readFileSync(resolve(out,"external-files.json"),"utf8"));await settings();await chooseRestore(recorded.golden);await replaceUI(0);assert.deepEqual(portable(await rows()),golden.data);record("post-instrumentation final APK reinstalled; external generated backup restores every row/media SHA");await verifyRestoredDisplay();
  } else if(mode==="export-failure") {
    const original=await rows();assert(original.recipes.length===1&&original.recipes[0].title==="可乐鸡翅"&&original.recipes[0].cover_path===null,"Only generated image-free fixture is allowed");
    const missing="images/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png";
    await execute(`UPDATE recipes SET cover_path='${missing}' WHERE id='${original.recipes[0].id}';`);
    try {
      await settings();const before=downloadsFiles();await d.click("导出完整备份");await delay(700);await downloads();await tap(n=>n.includes('text="SAVE"')||n.includes('text="Save"'),"Save");await d.wait(`!!document.querySelector('[role=alert]')`);
      const leaked=downloadsFiles().filter(n=>!before.includes(n));assert.deepEqual(leaked,[],"Failed export must remove its newly created external document");record("failure before archive writing cleans fresh external document");
    } finally {await execute(`UPDATE recipes SET cover_path=NULL WHERE id='${original.recipes[0].id}';`);assert.deepEqual(await rows(),original);}
  } else if(mode==="inspect") {console.log(await d.evaluate("document.body.innerText"));record("installed native surface inspected");}
  else {
    assert.equal((await query("PRAGMA user_version"))[0].user_version,3);
    const before=await rows();assert(before.recipes.every(r=>r.title==="可乐鸡翅"||r.title==="可乐鸡翅 🍗"||r.title.startsWith("验收")),"Unknown personal rows: do not run destructive tests");
    let original,golden;
    if(mode==="full-resume"){
      golden={...JSON.parse(readFileSync(resolve(out,"golden-inspection.json"),"utf8")),...JSON.parse(readFileSync(resolve(out,"external-files.json"),"utf8"))};golden.name=golden.golden;golden.path=resolve(out,"golden.recipio");original=golden.data;assert.deepEqual(portable(before),original,"Resume only the exact generated golden rows");await execute("DROP TRIGGER IF EXISTS backup_failure;");await settings();record("resume preserves the previously independently verified golden export");
    } else {
    fixture("Images",null,resolve(out,"images"));for(const color of ["red","green","blue"])d.adb("push",resolve(out,"images",`backup-${color}.png`),`/sdcard/Download/backup-${color}.png`);
    await d.click(`打开 ${before.recipes[0].title}`);await d.click("编辑菜谱");await d.fill("菜名","可乐鸡翅 🍗");await d.fill("个人备注","中文\n下次少放盐 🍚");await trustedFileInput(0,"backup-red.png","菜谱封面");await saved();
    await d.click("编辑菜谱");await trustedFileInput(0,"backup-green.png","菜谱封面");await trustedFileInput(2,"backup-blue.png","步骤 2 参考图");await saved();
    await d.click("新增菜谱").catch(async()=>{await d.click("首页");await d.click("新增菜谱");});await d.fill("菜名","验收仅菜名 🍲");await saved();
    await settings();original=portable(await rows());golden=await exportUI("golden");writeFileSync(resolve(out,"external-files.json"),JSON.stringify({golden:golden.name}));assert.deepEqual(golden.data,original);assert(golden.manifest.counts.media>=3);record("all IDs/times/order/Chinese/newline/Emoji and historical old media survive export");
    }
    await chooseRestore(golden.name);await d.click("取消恢复");assert.deepEqual(portable(await rows()),original);record("preview cancellation changes no rows or image bytes");
    await chooseRestore(golden.name);await replaceUI(2);assert.deepEqual(portable(await rows()),original);record("full Replace transaction; search/media accessible");
    for(const defect of ["hash","version","count","missing-media","traversal","references"]){const file=resolve(out,`bad-${defect}.recipio`);if(!existsSync(file))fixture("Mutate",golden.path,file,defect);d.adb("push",file,`/sdcard/Download/bad-${defect}.recipio`);await chooseRestore(`bad-${defect}.recipio`,"error");assert.deepEqual(portable(await rows()),original);record(`${defect} damaged archive refused without data/media modification`);}
    await execute("CREATE TRIGGER backup_failure BEFORE INSERT ON recipes BEGIN SELECT RAISE(ABORT,'generated restore failure'); END;");await chooseRestore(golden.name);await d.click("恢复并替换当前数据");await d.click("确认替换 2 道菜谱");await d.wait(`!!document.querySelector('[role=alert]')`);assert.deepEqual(portable(await rows()),original);await execute("DROP TRIGGER backup_failure;");record("actual Android SQLite insert failure rolls back old rows/images");
    await chooseRestore(golden.name);await d.coldStart();assert.deepEqual(portable(await rows()),original);record("process stopped after staging: old data kept; startup removes unfinished staging");
    await settings();await chooseRestore(golden.name);await replaceUI(2);d.adb("shell","cmd","connectivity","airplane-mode","enable");await d.coldStart();assert.deepEqual(portable(await rows()),original);await d.click("我的菜谱");await d.fill("搜索菜名或食材","可乐");await d.wait(has("可乐鸡翅 🍗"));await d.click("打开 可乐鸡翅 🍗");await d.wait("(()=>{const images=[...document.querySelectorAll('img')].filter(i=>i.alt.includes('封面')||i.alt.includes('步骤'));return images.length>=2&&images.every(i=>i.naturalWidth>0);})()");record("flight mode cold start preserves restored rows, search and visible cover/step images");
    const commit=(await query("SELECT * FROM backup_restore_state WHERE id=1"))[0];
    for(const [name,data] of [["operation.json",{token:commit.operation_id,mode:"restore"}],["generation.json",{generationId:commit.generation_id,dataSha256:commit.data_sha256}],["staged.json",{operationId:commit.operation_id,generationId:commit.generation_id,dataSha256:commit.data_sha256,phase:"staged"}]])await d.evaluate(`window.Capacitor.Plugins.Filesystem.writeFile(${JSON.stringify({path:`backup-work/${commit.operation_id}/${name}`,data:JSON.stringify(data),directory:"DATA",encoding:"utf8",recursive:true})})`);
    await d.coldStart();assert.deepEqual(portable(await rows()),original);record("stale pre-commit journal after actual SQL commit cannot remove referenced generation");
    // This is the only pm clear target: explicitly named dedicated AVD, generated rows checked above.
    d.close();d.adb("shell","pm","clear","app.recipio.local");await d.coldStart();assert.equal((await rows()).recipes.length,0);await settings();const empty=await exportUI("empty");assert.equal(empty.manifest.counts.recipes,0);assert.equal(empty.manifest.counts.media,0);
    await chooseRestore(golden.name);await d.click("取消恢复");assert.equal((await rows()).recipes.length,0);await chooseRestore(golden.name);await replaceUI(0);assert.deepEqual(portable(await rows()),original);record("clear generated app only → cancel unchanged → full external backup restore");
    await chooseRestore(empty.name);await replaceUI(2);assert.equal((await rows()).recipes.length,0);assert.equal((await query("SELECT * FROM backup_restore_state")).length,1);record("empty backup commits explicit restore metadata");
    await chooseRestore(golden.name);await replaceUI(0);await d.coldStart();assert.deepEqual(portable(await rows()),original);await d.screenshot(resolve(out,"restored-mobile.png"));
    console.log(JSON.stringify({apk,backup:golden.path,size:readFileSync(golden.path).length,sha256:hash(readFileSync(golden.path))},null,2));
  }
}catch(error){failure=String(error.stack??error);throw error;}
finally {writeFileSync(resolve(out,`android-${mode}-result.json`),JSON.stringify({serial,avd:"Recipio_Backup_36",checks,failure,at:new Date().toISOString()},null,2));d.close();}
