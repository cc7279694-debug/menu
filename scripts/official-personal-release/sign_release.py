from __future__ import annotations

import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

# These are public identifiers, not secrets. A changed input requires review.
ROOT = Path(r'E:\RECIPIO-Signing')
IDENTITY = ROOT / 'recipio-personal-identity-v1'
BACKUP = ROOT / 'recipio-personal-backup-v1'
DELIVERY = ROOT / 'recipio-personal-release-v27'
REPO = Path(__file__).resolve().parents[2]
UNSIGNED = REPO / 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
EXPECTED_APK_SHA = 'e07565397555df9cd95cdbc6c79a8b9c5075bc92ab4ca663b657232234b0df0e'
OLD_CERT = '29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9'
JDK = Path(r'E:\CODEX\Tools\recipio-official-signing-jdk21\bin')
SDK = Path(r'E:\CODEX\Tools\recipio-official-signing-sdk36\build-tools\36.0.0')
SEVEN_ZIP = Path(r'C:\Program Files\7-Zip\7z.exe')
POWERSHELL = Path(r'C:\Users\CDD\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe')
APKSIGNER = SDK / 'lib/apksigner.jar'
SECRET_ENV = 'RECIPIO_PERSONAL_SIGNING_PASSWORD'
ALIAS = 'recipio-personal'

class SigningError(Exception):
    pass

def read_masked_password(prompt, read_char=None, write=None):
    if read_char is None:
        import msvcrt
        read_char = msvcrt.getwch
    if write is None:
        def write(value):
            sys.stdout.write(value)
            sys.stdout.flush()
    write(prompt)
    characters = []
    while True:
        char = read_char()
        if char == '\x03':
            raise KeyboardInterrupt
        if char in ('\r', '\n'):
            write('\n')
            return ''.join(characters)
        if char in ('\x00', '\xe0'):
            read_char()  # Ignore Windows extended keys without displaying them.
        elif char == '\b':
            if characters:
                characters.pop()
                write('\b \b')
        elif char.isprintable():
            characters.append(char)
            write('*')

def ensure_new_targets(paths):
    if any(path.exists() for path in paths):
        raise SigningError('TARGET_CONFLICT')

def password_is_valid(value):
    return 12 <= len(value) <= 64 and all(33 <= ord(char) <= 126 for char in value)

def backup_matches(original, restored):
    return hmac.compare_digest(hashlib.sha256(original).digest(), hashlib.sha256(restored).digest())

def normalized_fingerprint(value):
    value = value.replace(':', '').strip().lower()
    if not re.fullmatch(r'[0-9a-f]{64}', value):
        raise SigningError('CERTIFICATE_FORMAT_INVALID')
    return value

def ensure_new_certificate(value, previous):
    if hmac.compare_digest(normalized_fingerprint(value), normalized_fingerprint(previous)):
        raise SigningError('CERTIFICATE_IS_NOT_NEW')

def keytool_generate_args(keytool, keystore):
    return [str(keytool), '-J-Dkeystore.pkcs12.keyProtectionAlgorithm=PBEWithHmacSHA256AndAES_256',
            '-J-Dkeystore.pkcs12.certProtectionAlgorithm=PBEWithHmacSHA256AndAES_256',
            '-J-Dkeystore.pkcs12.macAlgorithm=HmacPBESHA256', '-genkeypair', '-alias', ALIAS,
            '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA', '-validity', '10000',
            '-dname', 'CN=RECIPIO Personal, O=Personal, C=CN', '-storetype', 'PKCS12',
            '-keystore', str(keystore), '-storepass:env', SECRET_ENV, '-keypass:env', SECRET_ENV]

def run(args, code, *, env=None, stdin=None, cwd=None):
    try:
        result = subprocess.run(args, input=stdin, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env, cwd=cwd, check=False, timeout=600)
    except (OSError, subprocess.TimeoutExpired):
        raise SigningError(code) from None
    if result.returncode:
        raise SigningError(code)
    return result.stdout

def sha256_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()

def check_private_directory(path):
    # Use Windows ACLs as configured on the existing parent; do not modify them.
    command = r'''$ErrorActionPreference='Stop'; $acl=Get-Acl -LiteralPath $env:RECIPIO_ACL_CHECK_PATH; $me=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $allowed=@($me,'S-1-5-18','S-1-5-32-544'); $myGrant=$false; foreach($r in $acl.Access){if($r.AccessControlType -eq 'Allow'){ $sid=$r.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value; if($sid -notin $allowed){exit 3}; if($sid -eq $me -and ($r.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq [System.Security.AccessControl.FileSystemRights]::FullControl){$myGrant=$true}}}; if(-not $myGrant){exit 4}; 'OK' '''
    child_env = os.environ.copy()
    child_env['RECIPIO_ACL_CHECK_PATH'] = str(path)
    run([str(POWERSHELL), '-NoProfile', '-NonInteractive', '-Command', command], 'PRIVATE_DIRECTORY_PERMISSIONS', env=child_env)

def verify_apk_metadata(apk):
    badging = run([str(SDK / 'aapt.exe'), 'dump', 'badging', str(apk)], 'APK_INSPECTION_FAILED').decode('utf-8', errors='replace')
    if not re.search(r"package: name='app\.recipio\.local' versionCode='27' versionName='0\.11\.0-personal\.2'", badging):
        raise SigningError('APK_IDENTITY_MISMATCH')
    manifest = run([str(SDK / 'aapt.exe'), 'dump', 'xmltree', str(apk), 'AndroidManifest.xml'], 'APK_MANIFEST_INSPECTION_FAILED').decode('utf-8', errors='replace')
    if 'application-debuggable' in badging or 'application-testOnly' in badging or re.search(r'android:(?:debuggable|testOnly)', manifest):
        raise SigningError('APK_NOT_RELEASE')

def preflight():
    if sys.platform != 'win32':
        raise SigningError('WINDOWS_REQUIRED')
    for tool in (JDK / 'keytool.exe', JDK / 'java.exe', SDK / 'zipalign.exe', SDK / 'aapt.exe', APKSIGNER, SEVEN_ZIP, POWERSHELL, UNSIGNED):
        if not tool.is_file():
            raise SigningError('MISSING_REQUIRED_TOOL_OR_UNSIGNED_APK')
    if not ROOT.is_dir() or (ROOT.stat().st_file_attributes & 0x400):
        raise SigningError('PRIVATE_DIRECTORY_INVALID')
    check_private_directory(ROOT)
    ensure_new_targets((IDENTITY, BACKUP, DELIVERY))
    if sha256_file(UNSIGNED) != EXPECTED_APK_SHA:
        raise SigningError('UNSIGNED_APK_CHANGED')
    verify_apk_metadata(UNSIGNED)

def extract_fingerprint(text):
    match = re.search(r'(?im)(?:SHA256:|Signer #1 certificate SHA-256 digest:)\s*([a-f0-9:]{64,95})', text)
    if not match:
        raise SigningError('CERTIFICATE_NOT_FOUND')
    return normalized_fingerprint(match.group(1))

def create_release(password):
    ensure_new_targets((IDENTITY, BACKUP, DELIVERY))
    check_private_directory(ROOT)
    # All directories are exclusive and under the ACL-checked private root.
    for directory in (IDENTITY, BACKUP, DELIVERY):
        directory.mkdir()
        check_private_directory(directory)
    keystore = IDENTITY / 'personal-signing.p12'
    archive = BACKUP / 'recipio-key-backup.7z'
    snapshot = DELIVERY / 'verified-unsigned-input.apk'
    aligned = DELIVERY / 'aligned-unsigned.apk'
    staged = DELIVERY / 'signed-pending-verification.apk'
    final = DELIVERY / 'recipio-personal-v27.apk'
    child_env = os.environ.copy()
    child_env[SECRET_ENV] = password
    try:
        with UNSIGNED.open('rb') as source, snapshot.open('xb') as target:
            shutil.copyfileobj(source, target, length=1024 * 1024)
        if sha256_file(snapshot) != EXPECTED_APK_SHA:
            raise SigningError('UNSIGNED_APK_CHANGED')
        verify_apk_metadata(snapshot)
        run(keytool_generate_args(JDK / 'keytool.exe', keystore), 'KEY_GENERATION_FAILED', env=child_env)
        cert_output = run([str(JDK / 'keytool.exe'), '-list', '-v', '-alias', ALIAS, '-storetype', 'PKCS12',
                           '-keystore', str(keystore), '-storepass:env', SECRET_ENV], 'KEY_VERIFICATION_FAILED', env=child_env)
        cert = extract_fingerprint(cert_output.decode(errors='replace'))
        ensure_new_certificate(cert, OLD_CERT)
        run([str(SDK / 'zipalign.exe'), '-P', '16', '4', str(snapshot), str(aligned)], 'ZIPALIGN_FAILED')
        run([str(SDK / 'zipalign.exe'), '-c', '-P', '16', '4', str(aligned)], 'ALIGNMENT_VERIFICATION_FAILED')
        run([str(JDK / 'java.exe'), '-jar', str(APKSIGNER), 'sign', '--ks', str(keystore),
             '--ks-key-alias', ALIAS, '--ks-pass', 'env:' + SECRET_ENV, '--key-pass', 'env:' + SECRET_ENV,
             '--out', str(staged), str(aligned)], 'SIGNING_FAILED', env=child_env)
        verification = run([str(JDK / 'java.exe'), '-jar', str(APKSIGNER), 'verify', '--verbose', '--print-certs', str(staged)], 'SIGNATURE_VERIFICATION_FAILED')
        signed_cert = extract_fingerprint(verification.decode(errors='replace'))
        if not hmac.compare_digest(cert, signed_cert):
            raise SigningError('CERTIFICATE_MISMATCH')
        verify_apk_metadata(staged)
        run([str(SDK / 'zipalign.exe'), '-c', '-P', '16', '4', str(staged)], 'SIGNED_ALIGNMENT_VERIFICATION_FAILED')
        # 7-Zip receives the password only on stdin; file names are encrypted too.
        run([str(SEVEN_ZIP), 'a', '-t7z', '-mhe=on', '-p', str(archive), keystore.name],
            'BACKUP_CREATION_FAILED', stdin=(password + '\n').encode('ascii'), cwd=IDENTITY)
        archive_info = run([str(SEVEN_ZIP), 'l', '-slt', str(archive)], 'BACKUP_INSPECTION_FAILED', stdin=(password + '\n').encode('ascii'))
        if b'7zAES' not in archive_info or b'Encrypted = +' not in archive_info:
            raise SigningError('BACKUP_NOT_ENCRYPTED')
        restored = run([str(SEVEN_ZIP), 'x', '-so', str(archive)], 'BACKUP_RESTORE_FAILED', stdin=(password + '\n').encode('ascii'))
        if not backup_matches(keystore.read_bytes(), restored):
            raise SigningError('BACKUP_CONTENT_MISMATCH')
        os.rename(staged, final)  # The containing directory was created exclusively.
        result = {'status': 'PASS', 'package': 'app.recipio.local', 'versionCode': 27,
                  'versionName': '0.11.0-personal.2', 'apk': str(final),
                  'apkBytes': final.stat().st_size, 'apkSha256': sha256_file(final),
                  'certificateSha256': cert, 'encryptedBackupVerified': True,
                  'identityDir': str(IDENTITY), 'backupArchive': str(archive)}
        with (DELIVERY / 'OWNER_RESULT.json').open('x', encoding='utf-8') as output:
            json.dump(result, output, ensure_ascii=False, indent=2)
        return result
    finally:
        child_env.pop(SECRET_ENV, None)

def main():
    try:
        preflight()
        print('已检查工具与文件。请设置新的签名密码：12–64 位英文字符、数字或符号，不含空格。')
        print('密钥和加密备份使用同一密码。请勿使用曾经发到聊天中的密码。')
        password = read_masked_password('新密码：')
        confirm = read_masked_password('再次输入以确认：')
        if not password_is_valid(password) or not hmac.compare_digest(password, confirm):
            raise SigningError('PASSWORD_INVALID_OR_MISMATCH')
        del confirm
        print('正在创建密钥、签名及验证加密备份，请耐心等待……')
        result = create_release(password)
        del password
        print('签名和加密备份验证成功。请保存下面的公开信息，并告诉 Codex：已完成。')
        print('APK：' + result['apk'])
        print('加密备份：' + result['backupArchive'])
        print('请另外复制加密备份到安全的离线介质，并妥善保管密码。')
        return 0
    except (SigningError, OSError, KeyboardInterrupt) as error:
        category = str(error) if isinstance(error, SigningError) else 'INTERRUPTED_OR_FILE_ERROR'
        print('未完成：' + category)
        print('如果已经创建文件，请不要重试或删除；告诉 Codex 上面的错误类别。')
        return 1

if __name__ == '__main__':
    sys.exit(main())
