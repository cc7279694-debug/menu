from pathlib import Path
import hashlib, json, re, struct, subprocess, zipfile

repo = Path(r'E:\CODEX\VIBE CODING\recipe-step-app-xhs-r3')
qa = Path(r'E:\CODEX\Tools\recipio-v29-r3-a1-20261105')
tools = Path(r'E:\CODEX\Tools\recipio-official-signing-sdk36\build-tools\36.0.0')
apk = repo / 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
version = '0.11.2-personal.1'
assert apk.is_file()

def aapt(*args):
    result = subprocess.run([str(tools/'aapt2.exe'), 'dump', *args], capture_output=True,
                            text=True, encoding='utf-8', errors='replace', check=True)
    return result.stdout

badging = aapt('badging', str(apk))
manifest = aapt('xmltree', '--file', 'AndroidManifest.xml', str(apk))
(qa/'apk-badging.txt').write_text(badging, encoding='utf-8')
(qa/'apk-manifest.txt').write_text(manifest, encoding='utf-8')
assert "package: name='app.recipio.local' versionCode='29' versionName='0.11.2-personal.1'" in badging
assert 'application-debuggable' not in badging
for line in manifest.splitlines():
    if 'android:debuggable' in line or 'android:testOnly' in line:
        assert not re.search(r'0xffffffff|\btrue\b', line), line
assert 'android:allowBackup' in manifest
backup_line = next(line for line in manifest.splitlines() if 'android:allowBackup' in line)
assert '0x0' in backup_line and '0xffffffff' not in backup_line
permissions = lambda text: sorted(line for line in text.splitlines() if line.startswith('uses-permission'))
assert permissions(badging) == permissions(aapt('badging', r'E:\CODEX\RECIPIO-Signing\recipio-personal-release-v28\recipio-personal-v28.apk'))

content = apk.read_bytes()
end = content.rfind(b'PK\x05\x06', max(0, len(content)-65557))
assert end >= 0
directory = struct.unpack_from('<I', content, end+16)[0]
assert content[directory-16:directory] != b'APK Sig Block 42'
with zipfile.ZipFile(apk) as archive:
    names = archive.namelist()
    assert archive.testzip() is None
    assert not any(re.search(r'^META-INF/(?:MANIFEST\.MF|.*\.(?:SF|RSA|DSA|EC))$', name, re.I) for name in names)
    assert not any(re.search(r'(?:^|/)(?:showcase|fixtures|testdata|androidTest)(?:/|$)|\.test\.[cm]?[jt]sx?$|ui-v2-showcase|cola-wings|cola-step|tomato-egg-soup|broccoli', name) for name in names)
    assert not any(name.lower().endswith(('.jks', '.keystore', '.p12', '.pfx', '.pem', '.key')) for name in names)
    assert not any(re.search(r'^assets/(?:databases?|backups?)/|\.(?:recipio|sqlite|sqlite3|db)$', name, re.I) for name in names)
    dist = repo/'dist-native'
    files = [path for path in dist.rglob('*') if path.is_file()]
    for path in files:
        assert archive.read('assets/public/'+path.relative_to(dist).as_posix()) == path.read_bytes()
    texts = '\n'.join(archive.read(name).decode('utf-8') for name in names
                      if name.startswith('assets/public/') and name.endswith(('.js', '.html')))
    assert version in texts and '0.11.1-personal.1' not in texts
    assert not any(marker in texts for marker in ['__xhsFixture', 'renderXhsFixture', '/@vite/client', '/@fs/', 'xhslink.cn/o/synthetic'])
    # Token boundary avoids mistaking Tailwind's "mask-*" class names for keys.
    assert not re.search(r'(?<![A-Za-z0-9_-])sk-(?:ws-)?[A-Za-z0-9._-]{20,}', texts)
    assert 'noteData' in texts and 'noteDetailMap' in texts
    assert 'AiLongImageCodec' not in texts and 'pickLongImage' not in texts
    config = json.loads(archive.read('assets/capacitor.config.json'))
    assert config['appId']=='app.recipio.local' and not config.get('server',{}).get('url')

verify = (qa/'unsigned-apksigner.txt').read_text(encoding='utf-8-sig')
assert 'DOES NOT VERIFY' in verify and 'Missing META-INF/MANIFEST.MF' in verify
sha = hashlib.sha256(content).hexdigest()
target = qa/'recipio-v29-r3-a1-unsigned.apk'
assert not target.exists()
with target.open('xb') as stream: stream.write(content)
result = {'source':'747f80a38761882a19522e4c8f61a5f09a90068d',
    'artifact':str(target), 'bytes':len(content), 'sha256':sha,
    'package':'app.recipio.local', 'versionCode':29, 'versionName':version,
    'debuggable':False, 'testOnly':False, 'allowBackup':False,
    'signature':'ABSENT_EXPLICITLY_VERIFIED', 'signingCertificate':None,
    'alignment':'PASS_OFFICIAL_ZIPALIGN', 'webFilesMatched':len(files),
    'permissionsEqualToV28':True, 'testAssetsAbsent':True,
    'keyAndDatabaseArchiveFilesAbsent':True, 'versionInPackagedBundle':True,
    'runtimeInstallation':'NOT_RUN', 'upgradeDataRetention':'NOT_RUN',
    'installableDeliverable':False}
(qa/'unsigned-apk-metadata.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
