// @vitest-environment node
import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
const read=(path:string)=>readFileSync(path,"utf8");
it("Share adds no permission/schema/source store and reader is private disposable process",()=>{
  const manifest=read("android/app/src/main/AndroidManifest.xml"),target=read("android/app/src/main/java/app/recipio/local/LocalShareTargetPlugin.java"),reader=read("android/app/src/main/java/app/recipio/local/ShareMediaReadService.java");
  expect([...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(m=>m[1])).toEqual(["android.permission.INTERNET"]);
  expect(manifest).toContain('android:exported="false" android:process=":sharemedia"');expect(manifest).not.toMatch(/video\/|audio\/|application\/|BROWSABLE|android.intent.action.VIEW/);
  expect(target).not.toMatch(/coerceToText|takePersistableUriPermission|getStringExtra\(Intent.EXTRA_HTML_TEXT|SharedPreferences|SQLite/);
  expect(reader).toContain("AiImageCodec.process");expect(reader).toContain("linkToDeath");expect(reader).toContain("guardian.schedule");
  for(const path of ["src/native/share-target/controller.ts","android/app/src/main/java/app/recipio/local/ShareTargetInbox.java","android/app/src/main/java/app/recipio/local/ShareMediaInbox.java"]){
    expect(read(path)).not.toMatch(/localStorage|IndexedDB|SharedPreferences|SQLiteDatabase|console\.log|Log\.[vdiew]\(/);
  }
});
