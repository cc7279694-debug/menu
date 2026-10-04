// @vitest-environment node
import {afterEach,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {testDatabase} from "../backup/sqlite-test-driver.mjs";
import {SQLiteBackupRepository} from "../backup/repository";
import {DataOperationCoordinator} from "../backup/coordinator";
import {goldenSource,goldenAssets,manifestFor,time} from "../backup/test-fixtures";
import {toPortableData,fromPortableData} from "../backup/references";
import {validateBackupData} from "../backup/compatibility";
import {RecipeNameStore} from "../recipe-store";
import {emptyDetails} from "../recipe-model";
import {AiRecipeSaver} from "./save";
const databases=[];
afterEach(()=>databases.splice(0).forEach(db=>db.close()));
function setup(){const {db,driver}=testDatabase();databases.push(db);const gate=new DataOperationCoordinator();return {db,store:new RecipeNameStore(driver,()=>new Date(time),gate),repo:new SQLiteBackupRepository(driver,gate,()=>new Date(time))};}
it("AI confirmed create remains an ordinary seven-table Backup2 recipe with no intake material",async()=>{
  const {repo,store,db}=setup();await repo.replace(goldenSource(),{operationId:"generated",generationId:"generated",dataSha256:"a".repeat(64),committedAt:time});
  const saver=new AiRecipeSaver(store,{discardSession:async()=>{}}),input={...emptyDetails("AI 确认鸭 🍗"),notes:"中文\n手动修改",ingredients:[{name:"盐",amount:"适量"}],steps:[{instruction:"洗净",imagePath:null}]};
  await saver.save({input,operationId:randomUUID(),creationId:randomUUID(),confirmed:true,assertCurrent:()=>{},draft:{recipe:input,review:{fieldChecks:[],requiresConfirmation:false},warnings:[]}});
  const snapshot=await repo.snapshot(),data=toPortableData(snapshot,goldenAssets()),checked=validateBackupData(data,manifestFor(data));
  expect(checked.manifest.formatVersion).toBe(2);expect(checked.manifest.databaseSchemaVersion).toBe(4);
  expect(data.recipes.find(r=>r.title===input.title)).toMatchObject({notes:input.notes,coverAssetId:null});
  expect(fromPortableData(data,Object.fromEntries(goldenAssets().map(a=>[a.assetId,a.sourcePath])))).toEqual(snapshot);
  expect(Object.keys(data).sort()).toEqual(["changes","cookingRecords","ingredients","keyTips","preparations","recipes","settings","steps"].sort());
  expect(JSON.stringify(data)).not.toMatch(/rawJson|fieldChecks|apiKey|operationId|ai-import|prompt|provider/i);
  expect(db.prepare("PRAGMA user_version").get().user_version).toBe(4);
});
it("unsaved intake metadata and temporary paths cannot enter a normal backup snapshot",async()=>{
  const {repo}=setup();const source=goldenSource();await repo.replace(source,{operationId:"generated",generationId:"generated",dataSha256:"b".repeat(64),committedAt:time});
  const pending={text:"GENERATED_PRIVATE_SOURCE",rawJson:"GENERATED_RAW_RESPONSE",previewUri:"file:///private/cache/ai-import/temporary.jpg",fieldChecks:[],key:"GENERATED_TEST_ONLY"};
  const data=toPortableData(await repo.snapshot(),goldenAssets());expect(fromPortableData(data,Object.fromEntries(goldenAssets().map(a=>[a.assetId,a.sourcePath])))).toEqual(source);
  for(const value of [pending.text,pending.rawJson,pending.previewUri,pending.key])expect(JSON.stringify(data)).not.toContain(value);
  const contaminated={...data,rawJson:pending.rawJson};expect(()=>validateBackupData(contaminated,manifestFor(data))).toThrow();
});
