// Frozen generated-only evidence whitelist; no credentials, databases, media or APK bytes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve("artifacts/share-target"), destination = resolve(root, "review-packet"), zip = resolve(root, "review-packet-apk-5b-share-target.zip");
assert(!existsSync(zip), "Existing Packet is immutable; never overwrite");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function git(...args) { const result = spawnSync("git", args, { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
assert.equal(git("branch", "--show-current"), "feat/recipio-share-target");
assert.equal(git("status", "--porcelain"), "", "Packet must be pinned to a clean committed implementation");
const baseline = "f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af", head = git("rev-parse", "HEAD");
assert.equal(git("rev-parse", "origin/main"), baseline);
assert.equal(git("rev-parse", "main"), baseline);
assert.equal(git("rev-parse", "v0.6.0-link-import^{}"), baseline);
mkdirSync(root, { recursive: true });
const apk = resolve("artifacts/recipio-share-target-v14-delivery-debug.apk"), apkBytes = readFileSync(apk);
const output = JSON.parse(readFileSync("android/app/build/outputs/apk/debug/output-metadata.json", "utf8"));
assert.equal(output.applicationId, "app.recipio.local");
assert.equal(output.elements[0].versionCode, 14); assert.equal(output.elements[0].versionName, "0.7.0-share-target");
assert.equal(hash(apkBytes), hash(readFileSync("android/app/build/outputs/apk/debug/app-debug.apk")), "Delivered APK must equal tested build");
writeFileSync(resolve(root, "apk-metadata.txt"), `path=${apk}\nbytes=${apkBytes.length}\nSHA-256=${hash(apkBytes)}\npackageId=app.recipio.local\nversionCode=14\nversionName=0.7.0-share-target\nsigning=Debug (not Play Store release)\n`);
writeFileSync(resolve(root, "release-lineage.txt"), `oldMain=d01589e3540d80eb48592a75cf391c79c4533631\nacceptedApk5A=${baseline}\nmain=${git("rev-parse", "main")}\noriginMain=${git("rev-parse", "origin/main")}\nannotatedTag=v0.6.0-link-import\ntagTarget=${git("rev-parse", "v0.6.0-link-import^{}")}\nfeatureBranch=feat/recipio-share-target\nfeatureHead=${head}\nmethod=ordinary fast-forward + ordinary push; no force/squash/rebase\nAPK5B is feature-only; no merge/deploy/APK5C\n`);
const sources = {
  "checkpoint.md": "docs/checkpoints/2026-10-05-share-target.md",
  "verification.md": "docs/verification/share-target.md",
  "android-verification.md": "docs/verification/share-target-android.md",
  "share-target-contract.md": "docs/share-target-contract.md",
  "security-notes.md": "artifacts/share-target/security-notes.md",
  "test-results.txt": "artifacts/share-target/test-results.txt",
  "apk-metadata.txt": "artifacts/share-target/apk-metadata.txt",
  "release-lineage.txt": "artifacts/share-target/release-lineage.txt",
};
mkdirSync(destination, { recursive: true });
for (const [name, source] of Object.entries(sources)) { assert(existsSync(source), "Missing evidence: " + source); copyFileSync(source, resolve(destination, name)); }
writeFileSync(resolve(destination, "diff.patch"), git("diff", baseline, "HEAD", "--", ".") + "\n");
const names = [...Object.keys(sources), "diff.patch"];
const status = readFileSync(sources["checkpoint.md"], "utf8").match(/APK_5B_(?:COMPLETE|PENDING_DEVICE_TEST|BLOCKED)/)?.[0];
assert(status, "Evidence-backed checkpoint status required");
const manifest = {
  branch: git("branch", "--show-current"), baselineCommit: baseline, headCommit: head,
  acceptanceStatus: status, generatedAt: new Date().toISOString(), versionCode: 14, versionName: "0.7.0-share-target",
  scope: "APK-5A accepted ff main promotion and APK-5B URL-only native Share entry; no real AI or APK-5C",
  excluded: ["credentials", "private URLs", "raw intents", "private images", "SQLite", "personal backups", "APK bytes", "raw logcat"],
  files: names.map(name => {
    const bytes = readFileSync(resolve(destination, name));
    assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:ws-|sp-)?[A-Za-z0-9_.-]{24,}|\bsb_secret_[A-Za-z0-9]{20,}/.test(bytes.toString()), "Possible secret: " + name);
    return { name, bytes: bytes.length, sha256: hash(bytes) };
  }),
};
writeFileSync(resolve(destination, "manifest.json"), JSON.stringify(manifest, null, 2)); names.push("manifest.json");
const q = value => "'" + value.replaceAll("'", "''") + "'";
const command = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$file=[IO.File]::Open(${q(zip)},[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try {
 $archive=[IO.Compression.ZipArchive]::new($file,[IO.Compression.ZipArchiveMode]::Create,$true)
 try {foreach($name in @(${names.map(q).join(",")})) {
  $entry=$archive.CreateEntry($name);$stream=$entry.Open()
  try {$bytes=[IO.File]::ReadAllBytes((Join-Path ${q(destination)} $name));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
 }}finally{$archive.Dispose()}
 $file.Flush($true)
}finally{$file.Dispose()}
$closed=[IO.Compression.ZipFile]::OpenRead(${q(zip)})
try {
 $manifest=Get-Content -LiteralPath ${q(resolve(destination, "manifest.json"))} -Raw|ConvertFrom-Json
 $allowed=@(${names.map(q).join(",")})
 if($closed.Entries.Count -ne $allowed.Count){throw 'Entry count mismatch'}
 foreach($entry in $closed.Entries) {
  if($allowed -notcontains $entry.FullName){throw 'Non-whitelisted entry'}
  $stream=$entry.Open();$buffer=[IO.MemoryStream]::new()
  try {$stream.CopyTo($buffer);$bytes=$buffer.ToArray()}finally{$stream.Dispose();$buffer.Dispose()}
  $sha=[Security.Cryptography.SHA256]::Create()
  try {$digest=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
  if($entry.FullName -eq 'manifest.json'){if($digest -ne '${hash(readFileSync(resolve(destination, "manifest.json")))}'){throw 'Manifest readback mismatch'}}
  else {$record=$manifest.files|Where-Object {$_.name -eq $entry.FullName};if($record.bytes -ne $bytes.Length -or $record.sha256 -ne $digest){throw 'Evidence readback mismatch'}}
 }
}finally{$closed.Dispose()}
`;
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8", timeout: 60000 });
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(JSON.stringify({ path: zip, bytes: readFileSync(zip).length, sha256: hash(readFileSync(zip)), headCommit: head, entries: names }, null, 2));
