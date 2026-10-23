import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Fingerprint the actual dirty or committed showcase/QA inputs, not just HEAD. */
export async function uiV2EvidenceSource(root) {
  const scopes = ["src/native/ui-v2", "ui-v2-showcase", "vite.ui-v2.config.mts",
    "scripts/verify-ui-v2.mjs", "scripts/verify-ui-v2-themes.mjs", "scripts/ui-v2-evidence-source.mjs"];
  const run = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const files = [...new Set(run(["ls-files", "-co", "--exclude-standard", "-z", "--", ...scopes]).split("\0").filter(Boolean))].sort();
  const entries = await Promise.all(files.map(async (file) => ({
    path: file, sha256: createHash("sha256").update(await readFile(path.join(root, file))).digest("hex"),
  })));
  return {
    baseRevision: run(["rev-parse", "HEAD"]).trim(),
    dirtyAtRun: Boolean(run(["status", "--porcelain", "--", ...scopes]).trim()),
    fingerprint: createHash("sha256").update(JSON.stringify(entries)).digest("hex"),
    algorithm: "sha256 of sorted JSON path/raw-file-sha256 entries", entries,
  };
}
