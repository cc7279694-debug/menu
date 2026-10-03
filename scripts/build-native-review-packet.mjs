// Evidence-only archive: no APK, databases, media originals, logs or credentials.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const baseline = "ba4fc89";
const destination = resolve("artifacts/android-daily/review-packet");
mkdirSync(destination, { recursive: true });
function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const sources = {
  "checkpoint.md": "docs/checkpoints/2026-10-03-daily-library-android.md",
  "verification.md": "docs/verification/daily-library-android.md",
  "android-verification.md": "artifacts/android-daily/android-verification.md",
  "apk-metadata.txt": "artifacts/android-daily/apk-metadata.txt",
  "test-results.txt": "artifacts/android-daily/test-results.txt",
};
for (const [name, path] of Object.entries(sources)) {
  assert(existsSync(path), `Missing evidence: ${path}`);
  copyFileSync(path, resolve(destination, name));
}
const files = Object.keys(sources);
writeFileSync(resolve(destination, "diff.patch"), git("diff", "--binary", baseline, "HEAD") + "\n");
files.push("diff.patch");
const modes = ["inspect", "fresh", "create", "flows", "sort", "media", "back", "upgrade"];
const evidence = modes.map(mode => {
  const path = resolve("artifacts/android-daily", `${mode}-verification.json`);
  if (!existsSync(path)) return { mode, status: "Not Run" };
  const { serial, success, failure, checks, completedAt } = JSON.parse(readFileSync(path, "utf8"));
  return { mode, serial, success: success ?? null, failure, checks, completedAt };
});
writeFileSync(resolve(destination, "native-checks.json"), JSON.stringify(evidence, null, 2));
files.push("native-checks.json");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const manifest = {
  baselineCommit: git("rev-parse", baseline),
  headCommit: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  goal: "APK-1 Android Native Acceptance Gate; no new features or backup development",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: "Android emulator native SQLite/private files; desktop IndexedDB is not Android evidence. See reports for incomplete checks and physical-device limitations.",
  excluded: ["APK binaries", "SQLite databases", "private media files", "environment files", "tokens", "signing keys", "node_modules", "raw device logs", "raw WebView events"],
  files: files.map(name => {
    const bytes = readFileSync(resolve(destination, name));
    assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{24,}/.test(bytes.toString()), `Possible secret in ${name}`);
    return { name, bytes: bytes.length, sha256: hash(bytes) };
  }),
};
writeFileSync(resolve(destination, "manifest.json"), JSON.stringify(manifest, null, 2));
files.push("manifest.json");
// Pass exact whitelisted paths; never zip the entire artifacts directory.
const psQuote = text => "'" + text.replaceAll("'", "''") + "'";
const zip = resolve("artifacts/android-daily/review-packet.zip");
const command = `$files=@(${files.map(name => psQuote(resolve(destination, name))).join(",")}); Compress-Archive -LiteralPath $files -DestinationPath ${psQuote(zip)} -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive=[System.IO.Compression.ZipFile]::OpenRead(${psQuote(zip)}); try { if($archive.Entries.Count -ne ${files.length}) { throw 'Unexpected archive contents' }; $archive.Entries | ForEach-Object { $_.FullName } } finally { $archive.Dispose() }`;
const packed = spawnSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" });
assert.equal(packed.status, 0, packed.stderr);
console.log(packed.stdout.trim());
console.log(JSON.stringify({ path: zip, bytes: readFileSync(zip).length, sha256: hash(readFileSync(zip)), headCommit: manifest.headCommit }, null, 2));
