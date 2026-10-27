// @vitest-environment node
// Executes the real guard script against fake SDK tools and non-APK bytes.
// Never invokes a real adb, emulator, signing tool, phone or CI API.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const roots = [];
const script = resolve("scripts/verify-r1-native-fixtures.sh");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "/bin/bash";
const posix = value => value.replace(/\\/g, "/").replace(/^([A-Z]):/i, (_, drive) => "/" + drive.toLowerCase());
const hash = value => createHash("sha256").update(value).digest("hex");
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "recipio-r1-guard-"));
  roots.push(root);
  const sdk = join(root, "sdk"), inputs = join(root, "cloud-fixtures");
  mkdirSync(join(sdk, "platform-tools"), { recursive: true });
  mkdirSync(join(sdk, "build-tools", "36.0.0"), { recursive: true });
  mkdirSync(inputs);
  const app = "STATIC APP FIXTURE; NOT AN APK\n", test = "STATIC TEST FIXTURE; NOT AN APK\n";
  writeFileSync(join(inputs, "app-fixture.apk"), app);
  writeFileSync(join(inputs, "test-fixture.apk"), test);
  const sums = hash(app) + "  app-fixture.apk\n" + hash(test) + "  test-fixture.apk\n";
  writeFileSync(join(inputs, "SHA256SUMS.txt"), sums);
  writeFileSync(join(sdk, "platform-tools", "adb"), `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$CALL_TRACE"
if [[ "$1" == devices ]]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  if [[ "\${STUB_EXTRA_DEVICE:-0}" == 1 ]]; then printf 'unowned-device\\tdevice\\n'; fi
  exit 0
fi
[[ "$1" == -s && "$2" == emulator-5554 ]] || exit 81
shift 2
if [[ "$*" == 'emu avd name' ]]; then printf '%s\\nOK\\n' "\${STUB_AVD:-Recipio_R1_Fixture}"
elif [[ "$*" == 'shell getprop ro.build.version.sdk' ]]; then printf '%s\\n' "\${STUB_API:-36}"
elif [[ "$*" == 'shell pm list packages' ]]; then
  if [[ "\${STUB_INSTALLED:-0}" == 1 ]]; then printf 'package:app.recipio.local.cloudpreview\\n'; fi
elif [[ "$1" == install && "$2" == -t && $# == 3 ]]; then printf 'Performing Streamed Install\\nSuccess\\n'
elif [[ "$*" == 'shell am instrument -w -r -e class app.recipio.local.LocalBackupPluginTest,app.recipio.local.LocalCookingStorageTest app.recipio.local.cloudpreview.test/androidx.test.runner.AndroidJUnitRunner' ]]; then
  if [[ "\${STUB_CRASH:-0}" == 1 ]]; then printf 'INSTRUMENTATION_RESULT: shortMsg=Process crashed.\\n'; fi
  printf 'INSTRUMENTATION_RESULT: stream=\\nOK (11 tests)\\nINSTRUMENTATION_CODE: -1\\n'
else echo 'Unexpected fake-adb command' >&2; exit 82; fi
`, { mode: 0o755 });
  writeFileSync(join(sdk, "build-tools", "36.0.0", "aapt"), `#!/usr/bin/env bash
set -eu
if [[ "$1 $2" == 'dump badging' ]]; then
  if [[ "$3" == cloud-fixtures/app-fixture.apk ]]; then PACKAGE=app.recipio.local.cloudpreview
  else PACKAGE=app.recipio.local.cloudpreview.test; fi
  printf "package: name='%s' versionCode='1' versionName='fixture' \\n" "$PACKAGE"
elif [[ "$1 $2" == 'dump xmltree' && "$4" == AndroidManifest.xml ]]; then
  printf 'E: manifest (line=1)\\n  E: instrumentation (line=2)\\n    A: android:name(0x01010003)="androidx.test.runner.AndroidJUnitRunner" (Raw: "androidx.test.runner.AndroidJUnitRunner")\\n    A: android:targetPackage(0x01010021)="%s" (Raw: "%s")\\n  E: application (line=5)\\n' "\${STUB_TARGET:-app.recipio.local.cloudpreview}" "\${STUB_TARGET:-app.recipio.local.cloudpreview}"
else exit 83; fi
`, { mode: 0o755 });
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
    HOME: posix(root), ANDROID_HOME: posix(sdk), GITHUB_ACTIONS: "true",
    RUNNER_ENVIRONMENT: "github-hosted", RUNNER_OS: "Linux", CALL_TRACE: posix(join(root, "adb-calls.txt")), ...overrides };
  return {
    root, inputs, sums,
    run() {
      const result = spawnSync(bash, ["--noprofile", "--norc", posix(script)], {
        cwd: root, env, encoding: "utf8", timeout: 15000,
      });
      return { ...result, calls: existsSync(join(root, "adb-calls.txt")) ? readFileSync(join(root, "adb-calls.txt"), "utf8") : "" };
    },
  };
}

it("rejects local, self-hosted and non-Linux execution before any adb request", () => {
  for (const overrides of [{ GITHUB_ACTIONS: "false" }, { RUNNER_ENVIRONMENT: "self-hosted" }, { RUNNER_OS: "Windows" }]) {
    const test = fixture(overrides), result = test.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("requires GitHub-hosted Linux");
    expect(result.calls).toBe("");
  }
});
it("rejects ambiguous ownership, wrong API, preinstalled target and wrong instrumentation target before installation", () => {
  for (const overrides of [{ STUB_EXTRA_DEVICE: "1" }, { STUB_AVD: "AnotherProject" }, { STUB_API: "35" },
    { STUB_INSTALLED: "1" }, { STUB_TARGET: "app.recipio.local" }]) {
    const test = fixture(overrides), result = test.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("R1 fixture guard:");
    expect(result.calls).not.toMatch(/install|am instrument/);
    expect(readFileSync(join(test.root, "r1-device-evidence", "status.txt"), "utf8")).toMatch(/^FAIL/);
  }
});
it("rejects altered bytes, extra artifact entries and unsafe or extra checksum paths before any adb request", () => {
  for (const mutate of [
    test => writeFileSync(join(test.inputs, "app-fixture.apk"), "changed"),
    test => writeFileSync(join(test.inputs, "unexpected.txt"), "unexpected"),
    test => mkdirSync(join(test.inputs, "nested")),
    test => writeFileSync(join(test.inputs, "SHA256SUMS.txt"), test.sums.replace("app-fixture.apk", "../app-fixture.apk")),
    test => writeFileSync(join(test.inputs, "SHA256SUMS.txt"), test.sums + "0".repeat(64) + "  extra.apk\n"),
  ]) {
    const test = fixture(); mutate(test); const result = test.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("R1 fixture guard:");
    expect(result.calls).toBe("");
  }
});
it("runs only the eleven fresh fixture tests and refuses a crash even if output also contains OK", () => {
  const healthy = fixture(), success = healthy.run();
  expect(success.status, success.stderr).toBe(0);
  expect(success.calls.match(/ install -t /g)).toHaveLength(2);
  expect(success.calls).not.toMatch(/kill-server|uninstall|pm clear|\broot\b| install -r /);
  expect(success.calls).toContain("-e class app.recipio.local.LocalBackupPluginTest,app.recipio.local.LocalCookingStorageTest");
  expect(readFileSync(join(healthy.root, "r1-device-evidence", "status.txt"), "utf8")).toMatch(/^PASS 11/);
  expect(readFileSync(join(healthy.root, "r1-device-evidence", "instrumentation.txt"), "utf8")).toContain("OK (11 tests)");
  const crashed = fixture({ STUB_CRASH: "1" }), failure = crashed.run();
  expect(failure.status).not.toBe(0);
  expect(readFileSync(join(crashed.root, "r1-device-evidence", "status.txt"), "utf8")).toMatch(/^FAIL/);
});
