// @vitest-environment node
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname,extname} from "node:path";
import {expect,it} from "vitest";
const read=(path:string)=>readFileSync(resolve(path),"utf8");
it("Android configuration is packaged local content with inherited private backup exclusions",()=>{
  const config=read("capacitor.config.ts"),manifest=read("android/app/src/main/AndroidManifest.xml");
  expect(config).not.toMatch(/server\s*:\s*\{|server\.url|allowMixedContent:\s*true/);expect(config).toContain('loggingBehavior: "none"');
  expect(manifest).toContain('android:allowBackup="false"');expect(manifest).toContain("android.permission.INTERNET");expect(manifest).not.toMatch(/READ_MEDIA|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|CAMERA|RECORD_AUDIO/);
  for(const path of ["android/app/src/main/res/xml/backup_rules.xml","android/app/src/main/res/xml/data_extraction_rules.xml"])expect(read(path)).toContain('path="."');
});
it("AI bridge cannot transport a plaintext key; only native code can read it",()=>{
  const bridge=read("src/native/ai/native-bridge.ts"),plugin=read("android/app/src/main/java/app/recipio/local/LocalAiSecretPlugin.java"),store=read("android/app/src/main/java/app/recipio/local/AiSecretStore.java");
  expect(bridge).not.toMatch(/getAiKey|readForRequest|localStorage|indexedDB/);expect(plugin).not.toMatch(/put\("(?:key|secret|apiKey)"|@PluginMethod[^\n]*readForRequest/);
  expect(plugin).toContain("FLAG_SECURE");expect(store).toContain("AndroidKeyStore");expect(store).toContain("getNoBackupFilesDir");
});
it("local app dependency graph cannot import old Next/Supabase/server code",()=>{
  const seen=new Set<string>();function visit(path:string){if(seen.has(path))return;seen.add(path);const source=readFileSync(path,"utf8");
    for(const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){const name=match[1];expect(name).not.toMatch(/^next(?:\/|$)|^@supabase|^server-only$/);
      if(!name.startsWith(".")&&!name.startsWith("@/"))continue;const base=name.startsWith("@/")?resolve("src",name.slice(2)):resolve(dirname(path),name),next=[base,...[".ts",".tsx",".js",".mjs"].map(e=>base+e),resolve(base,"index.ts"),resolve(base,"index.tsx")].find(p=>existsSync(p)&&[".ts",".tsx",".js",".mjs"].includes(extname(p)));if(next)visit(next);
    }
  }visit(resolve("src/native/main.tsx"));expect(seen.size).toBeGreaterThan(30);
});
