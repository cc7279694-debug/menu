// Public build metadata only. No secret, signing or device operation exists here.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditUnsignedApk, makeReleaseManifest, PRODUCT_SOURCE } from "./unsigned-contract.mjs";

function parameter(name) {
  const result = process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  assert(result, `Required --${name}`);
  return result;
}
function command(executable, args, acceptFailure = false) {
  const result = spawnSync(executable, args, { encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.signal || (result.status !== 0 && !acceptFailure)) throw new Error(`Inspection command failed: ${path.basename(executable)}`);
  return result;
}
async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

if (process.argv.includes("--manifest")) {
  const output = path.resolve(parameter("output"));
  const entries = await Promise.all([26, 27].map(async code => {
    const entry = JSON.parse(await readFile(path.join(output, `v${code}-metadata.json`), "utf8"));
    const apk = path.join(output, entry.file);
    assert.equal(entry.sha256, await digest(apk));
    assert.equal(entry.bytes, (await stat(apk)).size);
    return entry;
  }));
  const manifest = makeReleaseManifest(entries);
  await writeFile(path.join(output, "release-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  await writeFile(path.join(output, "SHA256SUMS.txt"), manifest.apks.map(entry => `${entry.sha256}  ${entry.file}\n`).join(""), { flag: "wx" });
  console.log(JSON.stringify({ sourceSha: manifest.sourceSha, route: manifest.route, unsignedVersions: manifest.apks.map(entry => entry.versionCode), installable: false }));
} else {
  const product = path.resolve(parameter("product"));
  const output = path.resolve(parameter("output"));
  const apk = path.resolve(parameter("apk"));
  const code = Number(parameter("version-code"));
  assert([26, 27].includes(code));
  assert.equal(command("git", ["-C", product, "rev-parse", "HEAD"]).stdout.trim(), PRODUCT_SOURCE);
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  const sdk = process.env.ANDROID_HOME;
  assert(sdk && path.isAbsolute(sdk));
  const tools = path.join(sdk, "build-tools", "36.0.0");
  const analyzer = parameter("apkanalyzer");
  const fileStat = await stat(apk);
  assert(fileStat.isFile() && fileStat.size > 1024 && fileStat.size <= 64 * 1024 * 1024);
  const zip = command("python3", ["-c", [
    "import json,sys,zipfile",
    "with zipfile.ZipFile(sys.argv[1]) as z:",
    " rows=z.infolist()",
    " assert len(rows)<=20000 and sum(r.file_size for r in rows)<=268435456",
    " print(json.dumps([r.filename for r in rows]))",
  ].join("\n"), apk]);
  const signature = command(path.join(tools, "apksigner"), ["verify", "--verbose", "--print-certs", apk], true);
  const observation = {
    sourceSha: PRODUCT_SOURCE, versionCode: code, versionName: `0.11.0-personal.${code - 25}`,
    file: `unsigned/recipio-personal-v${code}-unsigned.apk`, bytes: fileStat.size, sha256: await digest(apk),
    badging: command(path.join(tools, "aapt"), ["dump", "badging", apk]).stdout,
    manifestTree: command(path.join(tools, "aapt"), ["dump", "xmltree", apk, "AndroidManifest.xml"]).stdout,
    entries: JSON.parse(zip.stdout),
    dexPackages: command(analyzer, ["dex", "packages", "--defined-only", apk]).stdout,
    signatureExitCode: signature.status, signatureOutput: signature.stdout + signature.stderr,
  };
  const entry = auditUnsignedApk(observation);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, `v${code}-metadata.json`), JSON.stringify(entry, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(entry));
}
