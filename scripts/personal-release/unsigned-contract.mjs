export const PRODUCT_SOURCE = "19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe";
export const ORIGINAL_PACKAGE = "app.recipio.local";
export const EXPECTED_CERTIFICATE = "29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9";
const versions = new Map([[26, "0.11.0-personal.1"], [27, "0.11.0-personal.2"]]);

function requireGate(condition, code, detail) {
  if (!condition) throw Object.assign(new Error(detail ? `${code}: ${JSON.stringify(detail)}` : code), { code, ...(detail && { detail }) });
}

// Only bounded ZIP entry names/categories from a compiled public APK; no bytes,
// source body, host environment or private signing material enter diagnostics.
function entryDetail(name, index, reason, previous) {
  const bounded = value => typeof value === "string" ? JSON.stringify(value.slice(0, 128)).slice(1, -1).slice(0, 160) : "<non-string>";
  return { reason, index, entry: bounded(name), ...(previous !== undefined && { previous: bounded(previous) }) };
}

function falseAttributeValues(tree, name, required = false) {
  const matches = [...tree.matchAll(new RegExp(`A: android:${name}\\([^)]*\\)=(.*)`, "g"))];
  return (!required || matches.length > 0) && matches.every(match => /^(?:\(type\s+0x12\)0x0+|false)\s*$/.test(match[1]));
}

function approvedEntryIdentity(entry) {
  requireGate(versions.has(entry.versionCode) && versions.get(entry.versionCode) === entry.versionName, "VERSION_NOT_APPROVED");
  requireGate(entry.file === `unsigned/recipio-personal-v${entry.versionCode}-unsigned.apk`, "ARTIFACT_PATH");
  requireGate(typeof entry.sha256 === "string" && /^[0-9a-f]{64}$/.test(entry.sha256), "APK_HASH");
  requireGate(Number.isSafeInteger(entry.bytes) && entry.bytes > 1024 && entry.bytes <= 64 * 1024 * 1024, "APK_SIZE");
}

export function auditUnsignedApk(observation) {
  requireGate(observation?.sourceSha === PRODUCT_SOURCE, "SOURCE_MISMATCH");
  approvedEntryIdentity(observation);
  const packageLines = observation.badging?.split(/\r?\n/).filter(line => line.startsWith("package: ")) ?? [];
  const identity = packageLines.length === 1 && /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'(?: |$)/.exec(packageLines[0]);
  requireGate(identity && identity[1] === ORIGINAL_PACKAGE && Number(identity[2]) === observation.versionCode && identity[3] === observation.versionName, "APK_IDENTITY");
  const tree = observation.manifestTree;
  requireGate(typeof tree === "string" && /E: manifest\b/.test(tree) && /E: application\b/.test(tree), "MANIFEST_MISSING");
  requireGate(falseAttributeValues(tree, "debuggable") && falseAttributeValues(tree, "testOnly"), "DEBUG_OR_TEST_ONLY");
  requireGate(falseAttributeValues(tree, "allowBackup", true), "BACKUP_POLICY");
  requireGate(!/E: instrumentation\b/.test(tree), "INSTRUMENTATION_IN_APP");

  const entries = observation.entries;
  requireGate(Array.isArray(entries) && entries.length > 0 && entries.length <= 20000, "UNSAFE_ENTRY");
  const seen = new Map();
  for (const [index, name] of entries.entries()) {
    requireGate(typeof name === "string", "UNSAFE_ENTRY", entryDetail(name, index, "ENTRY_TYPE"));
    requireGate(name.length <= 512, "UNSAFE_ENTRY", entryDetail(name, index, "ENTRY_LENGTH"));
    requireGate(!name.startsWith("/"), "UNSAFE_ENTRY", entryDetail(name, index, "ABSOLUTE_ENTRY"));
    requireGate(!/[\\:\x00-\x1f]/.test(name), "UNSAFE_ENTRY", entryDetail(name, index, "ENTRY_CHARACTERS"));
    requireGate(!name.split("/").some((part, position, parts) => part === "." || part === ".." || (part === "" && position !== parts.length - 1)), "UNSAFE_ENTRY", entryDetail(name, index, "ENTRY_SEGMENTS"));
    const previous = seen.get(name.toLowerCase());
    requireGate(previous === undefined, "UNSAFE_ENTRY", entryDetail(name, index, previous === name ? "EXACT_DUPLICATE" : "CASE_FOLDED_COLLISION", previous));
    seen.set(name.toLowerCase(), name);
    requireGate(!/^META-INF\/(?:MANIFEST\.MF|[^/]+\.(?:RSA|DSA|EC|SF)|SIG-[^/]+)$/i.test(name), "SIGNATURE_ENTRY");
    requireGate(!/(?:^|\/)(?:showcase|ui-v2-showcase|fixtures|androidTest|demo-data)(?:\/|$)|(?:cola-wings|cola-step|tomato-egg-soup|broccoli)/i.test(name), "TEST_OR_SHOWCASE_ENTRY");
  }
  requireGate(entries.includes("AndroidManifest.xml") && entries.includes("classes.dex") && entries.includes("assets/public/index.html")
    && entries.some(name => /^assets\/public\/assets\/[^/]+\.js$/.test(name)), "PRODUCTION_PAYLOAD_MISSING");
  const definitions = observation.dexPackages;
  requireGate(typeof definitions === "string" && /\bapp[./]recipio[./]local[./]MainActivity(?:\s|$)/.test(definitions)
    && /\bapp[./]recipio[./]local[./]LocalBackupPlugin(?:\s|$)/.test(definitions), "PRODUCTION_DEX_MISSING");
  requireGate(!/\b(?:org[./]junit|androidx[./]test|org[./]mockito|okhttp3[./]mockwebserver)(?:[./]|\s|$)|\bapp[./]recipio[./]local[./](?:[A-Za-z0-9_$]*Test(?:\$[^\s]*)?|Fake[A-Za-z0-9_$]*)(?:\s|$)/.test(definitions), "TEST_DEX_CLASS");
  requireGate(Number.isInteger(observation.signatureExitCode) && observation.signatureExitCode !== 0
    && typeof observation.signatureOutput === "string" && /\bDOES NOT VERIFY\b/.test(observation.signatureOutput)
    && !/^Verifies\s*$/m.test(observation.signatureOutput), "NOT_UNSIGNED");
  return { versionCode: observation.versionCode, versionName: observation.versionName, file: observation.file,
    sha256: observation.sha256, bytes: observation.bytes, unsigned: true, debuggable: false, testOnly: false,
    packageName: ORIGINAL_PACKAGE, productionEntries: entries.length };
}

export function makeReleaseManifest(entries) {
  requireGate(Array.isArray(entries) && entries.length === 2 && new Set(entries.map(entry => entry.versionCode)).size === 2
    && entries.every(entry => versions.has(entry.versionCode)), "VERSION_SET");
  for (const entry of entries) {
    approvedEntryIdentity(entry);
    requireGate(entry.packageName === ORIGINAL_PACKAGE && entry.unsigned === true && entry.debuggable === false && entry.testOnly === false, "APK_NOT_AUDITED");
  }
  return {
    formatVersion: 1,
    sourceSha: PRODUCT_SOURCE,
    route: "A",
    packageName: ORIGINAL_PACKAGE,
    certificateSha256: EXPECTED_CERTIFICATE,
    certificateRole: "EXPECTED_OWNER_IDENTITY_NOT_AN_APK_SIGNATURE",
    installable: false,
    signing: "NOT_RUN_OWNER_PRIVATE_ACTION_REQUIRED",
    apks: entries.toSorted((a, b) => a.versionCode - b.versionCode).map(entry => ({ ...entry })),
  };
}
