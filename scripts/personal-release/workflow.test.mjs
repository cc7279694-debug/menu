import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const workflow = await readFile(new URL("../../.github/workflows/recipio-personal-unsigned.yml", import.meta.url), "utf8");
test("unsigned workflow has exactly the three isolated nonsecret jobs", () => {
  assert.match(workflow, /^  web-checks:/m);
  assert.match(workflow, /^  browser:/m);
  assert.match(workflow, /^  build-unsigned:/m);
  assert.doesNotMatch(workflow, /^  sign[-\w]*:/m);
  assert.doesNotMatch(workflow, /\bsecrets[.[]|^\s+environment:/m);
});
test("all three product checkouts bind the accepted main, not the tool branch", () => {
  assert.equal((workflow.match(/ref: 19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe/g) ?? []).length, 3);
  assert.equal((workflow.match(/^\s+path: product\s*$/gm) ?? []).length, 3);
  assert.match(workflow, /SOURCE_SHA: 19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe/);
});
test("only unsigned Release26 and27 are compiled with aligned Web version metadata", () => {
  assert.match(workflow, /for CODE in 26 27/);
  assert.match(workflow, /VITE_RECIPIO_VERSION.*VERSION/);
  assert.match(workflow, /:app:assembleRelease/);
  assert.match(workflow, /:app:testReleaseUnitTest/);
  assert.match(workflow, /:app:lintRelease/);
  assert.doesNotMatch(workflow, /:app:assembleDebug|recipioSignedNext|apksigner sign|gh secret/);
});
test("actual artifact analysis and manifest creation are mandatory before upload", () => {
  assert.match(workflow, /inspect-unsigned\.mjs/);
  assert.match(workflow, /--manifest/);
  assert.match(workflow, /node scripts\/verify-ui-v2-isolation\.mjs/);
  assert.match(workflow, /recipio-r1p-UNSIGNED-OWNER-SIGNING-REQUIRED-/);
});
test("browser and targeted UX use the existing real-page checks without real AI", () => {
  assert.match(workflow, /scripts\/verify-g6-browser\.mjs/);
  assert.match(workflow, /scripts\/verify-g7-browser\.mjs/);
  assert.match(workflow, /src\/native\/intake-review/);
  assert.match(workflow, /playwright@1\.62\.1/);
});
test("actions are pinned and publishing remains a feature-branch artifact only", () => {
  assert.match(workflow, /branches: \[release\/recipio-personal-signing\]/);
  assert.match(workflow, /contents: read/);
  for (const action of workflow.matchAll(/uses: ([^\s]+)/g)) assert.match(action[1], /@[0-9a-f]{40}$/);
  assert.doesNotMatch(workflow, /workflow_dispatch:|release create|pages: write|contents: write|id-token: write/);
});
