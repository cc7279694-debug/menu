import assert from "node:assert/strict";
import test from "node:test";
import { auditUnsignedApk, makeReleaseManifest } from "./unsigned-contract.mjs";

const SOURCE = "19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe";
function observation(versionCode = 26) {
  const versionName = `0.11.0-personal.${versionCode - 25}`;
  return {
    sourceSha: SOURCE,
    versionCode,
    versionName,
    file: `unsigned/recipio-personal-v${versionCode}-unsigned.apk`,
    bytes: 17000000,
    sha256: "a".repeat(64),
    badging: `package: name='app.recipio.local' versionCode='${versionCode}' versionName='${versionName}' platformBuildVersionName='16'\nsdkVersion:'24'\n`,
    manifestTree: "E: manifest\n  E: application\n    A: android:allowBackup(0x01010280)=(type 0x12)0x0\n    E: activity\n",
    entries: ["AndroidManifest.xml", "classes.dex", "assets/public/index.html", "assets/public/assets/app-abc.js", "assets/capacitor.config.json"],
    dexPackages: "C d 1 1 1 app.recipio.local.MainActivity\nC d 1 1 1 app.recipio.local.LocalBackupPlugin\nC d 1 1 1 com.getcapacitor.BridgeActivity\n",
    signatureExitCode: 1,
    signatureOutput: "DOES NOT VERIFY\nERROR: Missing META-INF/MANIFEST.MF\n",
  };
}
function rejected(patch, code) {
  assert.throws(() => auditUnsignedApk({ ...observation(), ...patch }), { code });
}

test("literal approved main and release26 identity passes without a signature", () => {
  const output = auditUnsignedApk(observation());
  assert.deepEqual(output, {
    versionCode: 26, versionName: "0.11.0-personal.1", file: "unsigned/recipio-personal-v26-unsigned.apk",
    sha256: "a".repeat(64), bytes: 17000000, unsigned: true, debuggable: false, testOnly: false,
    packageName: "app.recipio.local", productionEntries: 5,
  });
});
test("a different product source cannot claim the approved main", () => rejected({ sourceSha: "e8c2f948544d8650919456bd2421b7a04ea218b4" }, "SOURCE_MISMATCH"));
test("cloudpreview cannot pass as the original release identity", () => rejected({ badging: observation().badging.replace("app.recipio.local'", "app.recipio.local.cloudpreview'") }, "APK_IDENTITY"));
test("wrong or downgraded code and wrong name are refused", () => {
  rejected({ badging: observation().badging.replace("versionCode='26'", "versionCode='25'") }, "APK_IDENTITY");
  rejected({ versionCode: 28 }, "VERSION_NOT_APPROVED");
  rejected({ versionName: "0.10.0-g7-qa" }, "VERSION_NOT_APPROVED");
});
test("debuggable and testOnly true cannot enter a personal Release", () => {
  rejected({ manifestTree: observation().manifestTree + " A: android:debuggable(0x0101000f)=(type 0x12)0xffffffff\n" }, "DEBUG_OR_TEST_ONLY");
  rejected({ manifestTree: observation().manifestTree + " A: android:testOnly(0x01010272)=(type 0x12)0x1\n" }, "DEBUG_OR_TEST_ONLY");
});
test("explicit false debug and testOnly flags are allowed", () => {
  const output = auditUnsignedApk({ ...observation(), manifestTree: observation().manifestTree + " A: android:debuggable(0x0101000f)=(type 0x12)0x0\n A: android:testOnly(0x01010272)=false\n" });
  assert.equal(output.debuggable, false);
});
test("backup exclusions must remain explicit and instrumentation cannot ship", () => {
  rejected({ manifestTree: "E: manifest\n E: application\n" }, "BACKUP_POLICY");
  rejected({ manifestTree: observation().manifestTree + " E: instrumentation\n" }, "INSTRUMENTATION_IN_APP");
});
test("a signed APK or broken signing tool is not an unsigned proof", () => {
  rejected({ signatureExitCode: 0, signatureOutput: "Verifies" }, "NOT_UNSIGNED");
  rejected({ signatureExitCode: 1, signatureOutput: "Error: java unavailable" }, "NOT_UNSIGNED");
  rejected({ entries: [...observation().entries, "META-INF/CERT.RSA"] }, "SIGNATURE_ENTRY");
});
test("showcase fixtures and native test definitions are refused", () => {
  rejected({ entries: [...observation().entries, "assets/public/assets/cola-wings.webp"] }, "TEST_OR_SHOWCASE_ENTRY");
  rejected({ dexPackages: observation().dexPackages + "C d 1 1 1 app.recipio.local.G7IntakeReviewInstrumentedTest\n" }, "TEST_DEX_CLASS");
  rejected({ dexPackages: observation().dexPackages + "C d 1 1 1 okhttp3.mockwebserver.MockWebServer\n" }, "TEST_DEX_CLASS");
});
test("production FakeDrag is not falsely rejected as an injected provider", () => {
  const output = auditUnsignedApk({ ...observation(), dexPackages: observation().dexPackages + "C d 1 1 1 androidx.viewpager2.widget.FakeDrag\n" });
  assert.equal(output.packageName, "app.recipio.local");
});
test("ZIP traversal duplicates missing UI and empty class reports fail closed", () => {
  rejected({ entries: [...observation().entries, "../outside"] }, "UNSAFE_ENTRY");
  rejected({ entries: [...observation().entries, "classes.dex"] }, "UNSAFE_ENTRY");
  rejected({ entries: ["AndroidManifest.xml", "classes.dex"] }, "PRODUCTION_PAYLOAD_MISSING");
  rejected({ dexPackages: "" }, "PRODUCTION_DEX_MISSING");
});
test("actual optimized Release res/9N.9.png and res/9n.9.png remain distinct APK ZIP resources", () => {
  const entries = [...observation().entries, "res/9N.9.png", "res/9n.9.png"];
  const output = auditUnsignedApk({ ...observation(), entries });
  assert.equal(output.productionEntries, 7);
  assert.throws(() => auditUnsignedApk({ ...observation(), entries: [...entries, "res/9N.9.png"] }), error => {
    assert.equal(error.code, "UNSAFE_ENTRY");
    assert.equal(error.detail.reason, "EXACT_DUPLICATE");
    assert.equal(error.detail.entry, "res/9N.9.png");
    return true;
  });
});
test("unsigned file names cannot escape the transfer bundle", () => rejected({ file: "../signed-candidate.apk" }, "ARTIFACT_PATH"));
test("unsafe-entry diagnostics identify exact duplicate category without dumping observations", () => {
  assert.throws(() => auditUnsignedApk({ ...observation(), entries: [...observation().entries, "classes.dex"] }), error => {
    assert.equal(error.code, "UNSAFE_ENTRY");
    assert.equal(error.detail.reason, "EXACT_DUPLICATE");
    assert.equal(error.detail.entry, "classes.dex");
    assert.equal(error.detail.index, 5);
    assert(!("observation" in error.detail));
    return true;
  });
});
test("unsafe-entry names remain bounded and control characters cannot forge diagnostic lines", () => {
  assert.throws(() => auditUnsignedApk({ ...observation(), entries: [...observation().entries, "assets/" + "x".repeat(600) + "\n"] }), error => {
    assert.equal(error.code, "UNSAFE_ENTRY");
    assert.equal(error.detail.reason, "ENTRY_LENGTH");
    assert(error.detail.entry.length <= 160);
    assert(!/[\r\n]/.test(error.message));
    assert(error.message.length < 512);
    return true;
  });
});
test("literal manifest binds both approved versions and expected old public identity", () => {
  const manifest = makeReleaseManifest([auditUnsignedApk(observation(27)), auditUnsignedApk(observation(26))]);
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.sourceSha, SOURCE);
  assert.equal(manifest.route, "A");
  assert.equal(manifest.packageName, "app.recipio.local");
  assert.equal(manifest.certificateSha256, "29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9");
  assert.equal(manifest.certificateRole, "EXPECTED_OWNER_IDENTITY_NOT_AN_APK_SIGNATURE");
  assert.deepEqual(manifest.apks.map(apk => apk.versionCode), [26, 27]);
  assert.equal(manifest.installable, false);
});
test("manifest rejects missing duplicate and unapproved versions", () => {
  const entry = auditUnsignedApk(observation());
  assert.throws(() => makeReleaseManifest([entry]), { code: "VERSION_SET" });
  assert.throws(() => makeReleaseManifest([entry, entry]), { code: "VERSION_SET" });
  assert.throws(() => makeReleaseManifest([entry, { ...entry, versionCode: 28 }]), { code: "VERSION_SET" });
});
