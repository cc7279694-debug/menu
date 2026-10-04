// Frozen APK-2 evidence only. Never includes APKs, databases or private pictures.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("artifacts/backup-restore");
const zip = resolve(root, "review-packet-backup-restore.zip");
assert(!existsSync(zip), "Do not replace an existing review packet; retain it before another delivery");
const destination = resolve(root, "review-packet");
mkdirSync(destination, { recursive: true });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(git("branch", "--show-current"), "feat/recipio-backup-restore");
const sources = {
  "checkpoint.md": "docs/checkpoints/2026-10-04-backup-restore.md",
  "verification.md": "docs/verification/backup-restore-android.md",
  "backup-format-v1.md": "docs/backup-format-v1.md",
  "android-verification.md": "artifacts/backup-restore/android-verification.md",
  "test-results.txt": "artifacts/backup-restore/test-results.txt",
  "sample-backup-metadata.txt": "artifacts/backup-restore/sample-backup-metadata.txt",
};
for (const [name, path] of Object.entries(sources)) {
  assert(existsSync(path), `Missing evidence: ${path}`);
  copyFileSync(path, resolve(destination, name));
}
const files = [...Object.keys(sources), "diff.patch"];
const baseline = "2973893a6edba2dbc0cb76b3cc7aea51f674000a";
writeFileSync(resolve(destination, "diff.patch"), git("diff", "--binary", baseline, "HEAD") + "\n");
const acceptanceStatus = readFileSync(sources["checkpoint.md"], "utf8").match(/BACKUP_RESTORE_(?:COMPLETE|PENDING_DEVICE_TEST|BLOCKED)/)?.[0];
assert(acceptanceStatus, "Checkpoint must contain a verified, honest status");
const manifest = {
  acceptanceStatus,
  baselineCommit: baseline,
  headCommit: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  generatedAt: new Date().toISOString(),
  scope: "APK-2 Backup Format v1 and safe Replace only; generated-data acceptance",
  excluded: ["APK", "SQLite databases", "media bytes", "personal recipe data", "credentials", "raw device logs", "signing keys"],
  files: files.map(name => {
    const bytes = readFileSync(resolve(destination, name));
    assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{24,}|\bsb_secret_[A-Za-z0-9]{20,}/.test(bytes.toString()), `Possible secret: ${name}`);
    return { name, bytes: bytes.length, sha256: hash(bytes) };
  }),
};
writeFileSync(resolve(destination, "manifest.json"), JSON.stringify(manifest, null, 2));
files.push("manifest.json");
const quote = text => "'" + text.replaceAll("'", "''") + "'";
const paths = files.map(name => quote(resolve(destination, name))).join(",");
// Exact whitelist, CreateNew semantics (no -Force), then byte hashes from the closed ZIP.
const command = `
$ErrorActionPreference='Stop'
Compress-Archive -LiteralPath @(${paths}) -DestinationPath ${quote(zip)}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[System.IO.Compression.ZipFile]::OpenRead(${quote(zip)})
try {
  $expected=@(${files.map(quote).join(",")})
  if($archive.Entries.Count -ne $expected.Count) { throw 'Unexpected entry count' }
  $manifest=Get-Content -LiteralPath ${quote(resolve(destination, "manifest.json"))} -Raw | ConvertFrom-Json
  foreach($entry in $archive.Entries) {
    if($expected -notcontains $entry.FullName) { throw 'Non-whitelisted entry' }
    $stream=$entry.Open(); $memory=[System.IO.MemoryStream]::new()
    try { $stream.CopyTo($memory); $bytes=$memory.ToArray() } finally { $stream.Dispose(); $memory.Dispose() }
    $sha=[System.Security.Cryptography.SHA256]::Create()
    try { $digest=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    if($entry.FullName -eq 'manifest.json') {
      if($digest -ne '${hash(readFileSync(resolve(destination, "manifest.json")))}') { throw 'Manifest readback mismatch' }
    } else {
      $record=$manifest.files | Where-Object { $_.name -eq $entry.FullName }
      if($record.bytes -ne $bytes.Length -or $record.sha256 -ne $digest) { throw 'Entry readback mismatch' }
    }
  }
} finally { $archive.Dispose() }
`;
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(JSON.stringify({ path: zip, bytes: readFileSync(zip).length, sha256: hash(readFileSync(zip)), headCommit: manifest.headCommit, entries: files }, null, 2));
