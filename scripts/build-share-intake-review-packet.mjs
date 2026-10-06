// Generated-only whitelist. Never include backups/databases/media, credentials or raw intents/logcat.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve("artifacts/share-intake"),destination=resolve(root,"review-packet"),zip=resolve(root,"review-packet-apk-5ca-share-intake.zip");
assert(!existsSync(zip),"Existing Packet is immutable; never overwrite");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
function git(...args){const r=spawnSync("git",args,{encoding:"utf8"});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
const baseline="7205a3c56fa39d95268146a2e5fa3efd72d3418c",head=git("rev-parse","HEAD");
function assertPinned(){
  assert.equal(git("rev-parse","HEAD"),head,"HEAD changed during Packet generation");
  assert.equal(git("branch","--show-current"),"feat/recipio-share-intake");assert.equal(git("status","--porcelain"),"","Packet must pin a clean committed implementation");
  assert.equal(git("rev-parse","main"),baseline);assert.equal(git("rev-parse","origin/main"),baseline);assert.equal(git("rev-parse","v0.7.0-share-target^{}"),baseline);
}
assertPinned();
const apk=resolve("artifacts/recipio-share-intake-v15-debug.apk"),apkBytes=readFileSync(apk),output=JSON.parse(readFileSync("android/app/build/outputs/apk/debug/output-metadata.json","utf8"));
assert.equal(output.applicationId,"app.recipio.local");assert.equal(output.elements[0].versionCode,15);assert.equal(output.elements[0].versionName,"0.8.0-share-intake");
assert.equal(hash(apkBytes),hash(readFileSync("android/app/build/outputs/apk/debug/app-debug.apk")),"Delivered APK must equal final build");
mkdirSync(destination,{recursive:true});
writeFileSync(resolve(root,"apk-metadata.txt"),`path=${apk}\nbytes=${apkBytes.length}\nSHA-256=${hash(apkBytes)}\npackageId=app.recipio.local\nversionCode=15\nversionName=0.8.0-share-intake\nsigning=Debug, not store release\n`);
writeFileSync(resolve(root,"release-lineage.txt"),`baseline=${baseline}\nmain=${git("rev-parse","main")}\noriginMain=${git("rev-parse","origin/main")}\nannotatedTag=v0.7.0-share-target\ntagTarget=${git("rev-parse","v0.7.0-share-target^{}")}\nfeatureBranch=feat/recipio-share-intake\nfeatureHead=${head}\nNo main merge/force/deploy/video; paid AI0\n`);
const sources={
  "checkpoint.md":"docs/checkpoints/2026-10-06-share-intake.md",
  "verification.md":"docs/verification/share-intake.md",
  "android-verification.md":"docs/verification/share-intake-android.md",
  "share-intake-contract.md":"docs/share-intake-contract.md",
  "temp-media-security.md":"docs/share-intake-temp-media-security.md",
  "test-results.txt":"artifacts/share-intake/test-results.txt",
  "apk-metadata.txt":"artifacts/share-intake/apk-metadata.txt",
  "release-lineage.txt":"artifacts/share-intake/release-lineage.txt",
};
for(const [name,source]of Object.entries(sources)){assert(existsSync(source),"Missing evidence: "+source);writeFileSync(resolve(destination,name),source.startsWith("docs/")?git("show",head+":"+source)+"\n":readFileSync(source));}
// Code/test diffs may contain generated negative-test URI literals. Redact only their URI scheme
// prefix in this review-only copy: no source file is changed and this is not an applyable patch.
const diff=git("diff",baseline,head,"--",".").replaceAll("content://","[GENERATED_CONTENT_URI_PREFIX]");
writeFileSync(resolve(destination,"diff.patch"),diff+"\n");
const names=[...Object.keys(sources),"diff.patch"],status=readFileSync(resolve(destination,"checkpoint.md"),"utf8").match(/APK_5CA_(?:COMPLETE|PENDING_DEVICE_TEST|BLOCKED)/)?.[0];
assert(status,"Evidence-backed checkpoint status required");
const manifest={branch:git("branch","--show-current"),baselineCommit:baseline,headCommit:head,acceptanceStatus:status,generatedAt:new Date().toISOString(),versionCode:15,versionName:"0.8.0-share-intake",scope:"Text/static-image Share -> existing optional AI Intake; no automatic network or source persistence",diffNotice:"Review-only diff replaces generated content URI prefixes; use repository for exact applyable patch",excluded:["API Key","private text/URL/image","content URI","raw Intent","Cookie","Provider response","database","personal backup","APK bytes","raw logcat"],files:names.map(name=>{
  const bytes=readFileSync(resolve(destination,name));assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:ws-|sp-)?[A-Za-z0-9_.-]{24,}|\bsb_secret_[A-Za-z0-9]{20,}|content:\/\//.test(bytes.toString()),"Forbidden Packet content: "+name);
  return{name,bytes:bytes.length,sha256:hash(bytes)};
})};
writeFileSync(resolve(destination,"manifest.json"),JSON.stringify(manifest,null,2));names.push("manifest.json");
const q=value=>"'"+value.replaceAll("'","''")+"'";
assertPinned();
const command=`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$file=[IO.File]::Open(${q(zip)},[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try{$archive=[IO.Compression.ZipArchive]::new($file,[IO.Compression.ZipArchiveMode]::Create,$true)
 try{foreach($name in @(${names.map(q).join(",")})){$entry=$archive.CreateEntry($name);$stream=$entry.Open();try{$bytes=[IO.File]::ReadAllBytes((Join-Path ${q(destination)} $name));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}}}finally{$archive.Dispose()};$file.Flush($true)
}finally{$file.Dispose()}
$closed=[IO.Compression.ZipFile]::OpenRead(${q(zip)})
try{$manifest=Get-Content -LiteralPath ${q(resolve(destination,"manifest.json"))} -Raw|ConvertFrom-Json;$allowed=@(${names.map(q).join(",")});if($closed.Entries.Count -ne $allowed.Count){throw 'Entry count mismatch'}
 foreach($entry in $closed.Entries){if($allowed -notcontains $entry.FullName){throw 'Non-whitelisted entry'};$stream=$entry.Open();$buffer=[IO.MemoryStream]::new();try{$stream.CopyTo($buffer);$bytes=$buffer.ToArray()}finally{$stream.Dispose();$buffer.Dispose()};$sha=[Security.Cryptography.SHA256]::Create();try{$digest=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
 if($entry.FullName -eq 'manifest.json'){if($digest -ne '${hash(readFileSync(resolve(destination,"manifest.json")))}'){throw 'Manifest readback mismatch'}}else{$record=$manifest.files|Where-Object {$_.name -eq $entry.FullName};if($record.bytes -ne $bytes.Length -or $record.sha256 -ne $digest){throw 'Evidence readback mismatch'}}}
}finally{$closed.Dispose()}`;
const result=spawnSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",command],{encoding:"utf8",timeout:60000});assert.equal(result.status,0,result.stderr||result.stdout);
assertPinned();
console.log(JSON.stringify({path:zip,bytes:readFileSync(zip).length,sha256:hash(readFileSync(zip)),headCommit:head,entries:names},null,2));
