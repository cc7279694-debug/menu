#!/usr/bin/env bash
# G5 cloud-only synthetic fixtures and existing real WebView/IME tests.
# Fresh isolated cloud identity only: never deliver this APK for installation.
# Never run against a local device, a phone or a pre-existing installation.
set -euo pipefail

fail() { printf 'G5 fixture guard: %s\n' "$1" >&2; exit 1; }
[[ "${GITHUB_ACTIONS:-}" == true && "${RUNNER_ENVIRONMENT:-}" == github-hosted && "${RUNNER_OS:-}" == Linux ]] \
  || fail 'requires GitHub-hosted Linux; local and self-hosted devices are forbidden'
[[ -z "${ADB_SERVER_SOCKET:-}" && -z "${ANDROID_ADB_SERVER_PORT:-}" ]] \
  || fail 'external adb server overrides are forbidden'

EVIDENCE=g5-device-evidence
[[ ! -L "$EVIDENCE" && ( ! -e "$EVIDENCE" || -d "$EVIDENCE" ) ]] || fail 'unsafe evidence directory'
mkdir -p "$EVIDENCE"
for name in status.txt instrumentation.txt; do
  [[ ! -L "$EVIDENCE/$name" && ( ! -e "$EVIDENCE/$name" || -f "$EVIDENCE/$name" ) ]] || fail 'unsafe evidence file'
done
printf 'NOT_RUN\n' > "$EVIDENCE/status.txt"
trap 'code=$?; if (( code != 0 )); then printf "FAIL\nG5 synthetic cloud fixtures did not complete.\n" > "$EVIDENCE/status.txt"; fi' EXIT

[[ -d cloud-fixtures && ! -L cloud-fixtures ]] || fail 'missing or unsafe fixture directory'
shopt -s nullglob dotglob
entries=(cloud-fixtures/*)
[[ ${#entries[@]} == 3 ]] || fail 'fixture inventory must contain exactly three files'
for entry in "${entries[@]}"; do
  case "$entry" in
    cloud-fixtures/app-fixture.apk|cloud-fixtures/test-fixture.apk|cloud-fixtures/SHA256SUMS.txt) ;;
    *) fail 'unexpected fixture inventory entry' ;;
  esac
  [[ -f "$entry" && -s "$entry" && ! -L "$entry" ]] || fail 'fixture entries must be nonempty regular files, not symlinks'
done
mapfile -t checksums < cloud-fixtures/SHA256SUMS.txt
app_hash_rule='^[0-9a-f]{64}  app-fixture[.]apk$'
test_hash_rule='^[0-9a-f]{64}  test-fixture[.]apk$'
[[ ${#checksums[@]} == 2 && ${checksums[0]} =~ $app_hash_rule && ${checksums[1]} =~ $test_hash_rule ]] \
  || fail 'invalid checksum entries or paths'
(cd cloud-fixtures && sha256sum --strict --check --status SHA256SUMS.txt) || fail 'fixture checksum mismatch'

[[ -n "${ANDROID_HOME:-}" ]] || fail 'ANDROID_HOME is required'
ADB="$ANDROID_HOME/platform-tools/adb"
AAPT="$ANDROID_HOME/build-tools/36.0.0/aapt"
[[ -x "$ADB" && -x "$AAPT" ]] || fail 'SDK36 adb/aapt tools are unavailable'
# Deliberately use the unchanged production URI namespace in this empty VM.
# The separate cloudpreview suffix is not accepted by the frozen AI image guard.
APP=app.recipio.local
TEST_APP=app.recipio.local.test
RUNNER=androidx.test.runner.AndroidJUnitRunner
app_badging=$("$AAPT" dump badging cloud-fixtures/app-fixture.apk) || fail 'cannot read app metadata'
test_badging=$("$AAPT" dump badging cloud-fixtures/test-fixture.apk) || fail 'cannot read test metadata'
[[ "${app_badging%%$'\n'*}" == "package: name='$APP' "* ]] || fail 'wrong fixture app package'
[[ "${test_badging%%$'\n'*}" == "package: name='$TEST_APP' "* ]] || fail 'wrong fixture test package'
test_manifest=$("$AAPT" dump xmltree cloud-fixtures/test-fixture.apk AndroidManifest.xml) || fail 'cannot read instrumentation manifest'
# Scope attributes to the one instrumentation element, not an unrelated name/target.
printf '%s\n' "$test_manifest" | awk -v runner="$RUNNER" -v target="$APP" '
  /^[ ]*E: instrumentation[ (]/ { count++; active=1; depth=index($0,"E:"); next }
  active && /^[ ]*E:/ { if (index($0,"E:") <= depth) active=0 }
  active && index($0,"A:") == depth+2 && /A: android:name\(/ {
    names++; split($0,parts,"\""); if (parts[2] == runner) correct_name++
  }
  active && index($0,"A:") == depth+2 && /A: android:targetPackage\(/ {
    targets++; split($0,parts,"\""); if (parts[2] == target) correct_target++
  }
  END { if (count != 1 || names != 1 || targets != 1 || correct_name != 1 || correct_target != 1) exit 1 }
' || fail 'wrong instrumentation runner or target'

devices=$("$ADB" devices) || fail 'cannot inventory devices'
mapfile -t rows < <(printf '%s\n' "$devices" | tr -d '\r' | awk 'NF && !/^List of devices attached/')
[[ ${#rows[@]} == 1 && ${rows[0]} =~ ^emulator-5554[[:space:]]+device$ ]] || fail 'expected only the owned emulator-5554 device'
avd=$("$ADB" -s emulator-5554 emu avd name | tr -d '\r') || fail 'cannot establish emulator ownership'
[[ "$avd" == $'Recipio_G5_Fixture\nOK' ]] || fail 'unowned emulator AVD name'
api=$("$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r') || fail 'cannot read Android API'
[[ "$api" == 36 ]] || fail 'fixture emulator must use Android API36'
installed=$("$ADB" -s emulator-5554 shell pm list packages | tr -d '\r') || fail 'cannot check fresh fixture installation'
if printf '%s\n' "$installed" | grep -Fxq -e "package:$APP" -e "package:$TEST_APP"; then
  fail 'fixture packages already exist; will not overwrite or clear data'
fi

# Fresh, test-only installs; no reinstall, uninstall, clear, root or adb-server control.
for apk in cloud-fixtures/app-fixture.apk cloud-fixtures/test-fixture.apk; do
  output=$("$ADB" -s emulator-5554 install -t "$apk") || fail 'fresh fixture install failed'
  printf '%s\n' "$output" | tr -d '\r' | grep -Fxq Success || fail 'fixture install did not report success'
done
# The IME class injects Fake HTTP before entering intake; it must never contact AI.
instrumentation_ok=1
"$ADB" -s emulator-5554 shell am instrument -w -r \
  -e g5SyntheticPickerDiagnostics G5_SYNTHETIC_CLOUD_FIXTURE \
  -e class app.recipio.local.LocalBackupPluginTest,app.recipio.local.LocalCookingStorageTest,app.recipio.local.AiImeBackInstrumentedTest,app.recipio.local.G5DailyCookingInstrumentedTest \
  "$TEST_APP/$RUNNER" > "$EVIDENCE/instrumentation.txt" 2>&1 || instrumentation_ok=0
# Only this test-generated diagnostic, from this verified fresh owned AVD.
# Never list/read recipe media, keys, databases or other private app files.
if grep -Fq 'G5_IME_PICK_DIAGNOSTIC=' "$EVIDENCE/instrumentation.txt"; then
  diagnostic_info=$("$ADB" -s emulator-5554 shell run-as "$APP" stat -c %F:%s cache/g5-picker-diagnostic.png 2>/dev/null | tr -d '\r') || diagnostic_info='UNAVAILABLE'
  diagnostic_size=0
  if [[ "$diagnostic_info" =~ ^regular\ file:([0-9]+)$ ]]; then diagnostic_size=${BASH_REMATCH[1]}; fi
  if [[ "$diagnostic_size" =~ ^[0-9]+$ ]] && (( diagnostic_size > 0 && diagnostic_size <= 4194304 )); then
    diagnostic_file="$EVIDENCE/generated-picker-diagnostic.png"
    if "$ADB" -s emulator-5554 exec-out run-as "$APP" cat cache/g5-picker-diagnostic.png > "$diagnostic_file" 2>/dev/null \
      && [[ "$(stat -c %s "$diagnostic_file")" == "$diagnostic_size" ]] \
      && [[ "$(od -An -tx1 -N8 "$diagnostic_file" | tr -d ' \n')" == 89504e470d0a1a0a ]]; then
      printf '%s\n' 'GENERATED_CLOUD_PICKER_DIAGNOSTIC_CAPTURED' > "$EVIDENCE/picker-diagnostic-status.txt"
    else
      rm -f -- "$diagnostic_file"
      printf '%s\n' 'DIAGNOSTIC_UNAVAILABLE' > "$EVIDENCE/picker-diagnostic-status.txt"
    fi
  else
    printf '%s\n' 'DIAGNOSTIC_UNAVAILABLE' > "$EVIDENCE/picker-diagnostic-status.txt"
  fi
fi
[[ "$instrumentation_ok" == 1 ]] || fail 'instrumentation command failed'
if grep -Eiq 'FAILURES!!!|INSTRUMENTATION_FAILED|INSTRUMENTATION_ABORTED|INSTRUMENTATION_RESULT: shortMsg=|Process crashed|INSTRUMENTATION_STATUS_CODE: -[1-4]' "$EVIDENCE/instrumentation.txt"; then
  fail 'instrumentation reported a failure, skip or crash'
fi
tr -d '\r' < "$EVIDENCE/instrumentation.txt" | grep -Fxq 'OK (21 tests)' || fail 'expected exactly twenty-one passing tests'
printf '%s\n' 'PASS 21' \
  'Synthetic API36 Android native fixtures plus real WebView/IME/Back with Fake HTTP.' \
  'Fresh synthetic cloud installation, not the user original app or an upgrade.' \
  'NOT evidence of a physical phone, TalkBack, real AI, formal APK or long-term-signature upgrade.' \
  > "$EVIDENCE/status.txt"
printf 'G5 synthetic native and WebView/IME fixtures: PASS (21 tests).\n'
