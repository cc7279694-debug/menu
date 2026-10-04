// Frozen, explicit evidence whitelist. No APK, database, media bytes or personal exports.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
const root = resolve("artifacts/ai-intake"),
  zip = resolve(root, "review-packet-apk-4-ai-intake.zip"),
  destination = resolve(root, "review-packet");
assert(!existsSync(zip), "Existing packet is immutable; do not overwrite it");
mkdirSync(destination, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
function git(...args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
assert.equal(
  git("branch", "--show-current"),
  "feat/recipio-ai-intake",
);
assert.equal(
  git("status", "--porcelain"),
  "",
  "Packet must be pinned to a clean committed implementation",
);
const sources = {
  "checkpoint.md": "docs/checkpoints/2026-10-04-ai-intake.md",
  "verification.md": "docs/verification/ai-intake-android.md",
  "android-verification.md":
    "artifacts/ai-intake/android-verification.md",
  "security-notes.md": "artifacts/ai-intake/security-notes.md",
  "ai-contract.md": "docs/ai-intake-contract.md",
  "test-results.txt": "artifacts/ai-intake/test-results.txt",
  "apk-metadata.txt": "artifacts/ai-intake/apk-metadata.txt",
};
for (const [name, path] of Object.entries(sources)) {
  assert(existsSync(path), `Missing evidence: ${path}`);
  copyFileSync(path, resolve(destination, name));
}
const baseline = git("rev-parse", "c8606e3"),
  head = git("rev-parse", "HEAD");
writeFileSync(
  resolve(destination, "diff.patch"),
  git(
    "diff",
    baseline,
    "HEAD",
    "--",
    ".",
    ":(exclude)android/app/src/test/resources/golden-v1.recipio",
  ) + "\n",
);
const names = [...Object.keys(sources), "diff.patch"],
  status = readFileSync(sources["checkpoint.md"], "utf8").match(
    /APK_4_(?:COMPLETE|PENDING_DEVICE_TEST|BLOCKED)/,
  )?.[0];
assert(status, "Checkpoint needs an evidence-backed status");
const manifest = {
  acceptanceStatus: status,
  baselineCommit: baseline,
  acceptedApk3Base: "78f1877664db0b0015c132e970a4cfffe7ff03fc",
  headCommit: head,
  branch: git("branch", "--show-current"),
  generatedAt: new Date().toISOString(),
  scope:
    "APK-4 optional native AI intake; generated-data-only acceptance, real provider access separately reported",
  excluded: [
    "APK",
    "raw SQLite",
    "media bytes",
    "personal records",
    "exports",
    "credentials",
    "signing keys",
    "binary generated v1 Golden fixture in diff",
  ],
  files: names.map((name) => {
    const b = readFileSync(resolve(destination, name));
    assert(
      !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{24,}|\bsb_secret_[A-Za-z0-9]{20,}/.test(
        b.toString(),
      ),
      `Possible secret: ${name}`,
    );
    return { name, bytes: b.length, sha256: hash(b) };
  }),
};
writeFileSync(
  resolve(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
names.push("manifest.json");
const q = (s) => "'" + s.replaceAll("'", "''") + "'";
const command = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$file=[IO.File]::Open(${q(zip)},[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try {
  $archive=[IO.Compression.ZipArchive]::new($file,[IO.Compression.ZipArchiveMode]::Create,$true)
  try { foreach($name in @(${names.map(q).join(",")})) {
    $entry=$archive.CreateEntry($name);$target=$entry.Open()
    try { $bytes=[IO.File]::ReadAllBytes((Join-Path ${q(destination)} $name));$target.Write($bytes,0,$bytes.Length) } finally {$target.Dispose()}
  }} finally {$archive.Dispose()}
  $file.Flush($true)
} finally {$file.Dispose()}
$closed=[IO.Compression.ZipFile]::OpenRead(${q(zip)})
try {
  $manifest=Get-Content -LiteralPath ${q(resolve(destination, "manifest.json"))} -Raw | ConvertFrom-Json
  $allowed=@(${names.map(q).join(",")})
  if($closed.Entries.Count -ne $allowed.Count) {throw 'Entry count mismatch'}
  foreach($entry in $closed.Entries) {
    if($allowed -notcontains $entry.FullName){throw 'Non-whitelisted entry'}
    $stream=$entry.Open();$buffer=[IO.MemoryStream]::new()
    try {$stream.CopyTo($buffer);$bytes=$buffer.ToArray()}finally{$stream.Dispose();$buffer.Dispose()}
    $sha=[Security.Cryptography.SHA256]::Create()
    try {$digest=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
    if($entry.FullName -eq 'manifest.json') {if($digest -ne '${hash(readFileSync(resolve(destination, "manifest.json")))}'){throw 'Manifest readback mismatch'}}
    else {$record=$manifest.files | Where-Object {$_.name -eq $entry.FullName};if($record.bytes -ne $bytes.Length -or $record.sha256 -ne $digest){throw 'Evidence readback mismatch'}}
  }
} finally {$closed.Dispose()}
`;
const result = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
  { encoding: "utf8", timeout: 60000 },
);
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(
  JSON.stringify(
    {
      path: zip,
      bytes: readFileSync(zip).length,
      sha256: hash(readFileSync(zip)),
      headCommit: head,
      entries: names,
    },
    null,
    2,
  ),
);


