"""One fixed V29 owner operation; existing V27/V28 identity only, no key creation."""
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile


class Stop(Exception):
    pass


SIGN_FAILURE_CODES = frozenset({
    'SIGN_STORE_PASSWORD_REJECTED', 'SIGN_KEY_PASSWORD_REJECTED',
    'SIGN_ALIAS_MISSING', 'SIGN_OPTIONS_REJECTED',
    'SIGN_KEYSTORE_FORMAT_OR_PROVIDER', 'SIGN_FILE_ACCESS_OR_IO',
    'SIGN_TOOL_TIMEOUT', 'SIGN_PROCESS_START_FAILED', 'SIGN_STDIN_CLOSED',
    'SIGN_TOOL_UNKNOWN',
})


def safe_sign_code(category):
    return category if isinstance(category, str) and category in SIGN_FAILURE_CODES else 'SIGN_TOOL_UNKNOWN'


class SignToolFailure(Stop):
    def __init__(self, category):
        super().__init__(safe_sign_code(category))


@dataclass(frozen=True)
class Inputs:
    unsigned: Path
    previous: Path
    key: Path
    output: Path
    staging: Path
    java: Path
    sdk: Path
    sha: str
    previous_sha: str
    cert: str


ROOT = Path(r'E:\CODEX\RECIPIO-Signing')
SOURCE = '747f80a38761882a19522e4c8f61a5f09a90068d'
FIXED = Inputs(
    Path(r'E:\CODEX\Tools\recipio-v29-r3-a1-20261105\recipio-v29-r3-a1-unsigned.apk'),
    ROOT / 'recipio-personal-release-v28/recipio-personal-v28.apk',
    ROOT / 'recipio-personal-identity-v1/personal-signing.p12',
    ROOT / 'recipio-personal-release-v29', ROOT / 'recipio-v29-r3-staging',
    Path(r'E:\CODEX\Tools\recipio-official-signing-jdk21\bin\java.exe'),
    Path(r'E:\CODEX\Tools\recipio-official-signing-sdk36\build-tools\36.0.0'),
    '95f52141cdcb228353fd98edb7611599132c16ab243100e30216ff6b96b5d995',
    '52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b',
    '5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def is_apksigner_sign(args):
    return len(args) >= 4 and args[1] == '-jar' and Path(args[2]).name.lower() == 'apksigner.jar' and args[3] == 'sign'


def sign_failure_category(stderr):
    # Only stable ASCII diagnostics; byte matching works with Windows console encodings.
    # Keep the original output in memory, never include it in an exception or receipt.
    text = stderr[:65536].lower() if isinstance(stderr, bytes) else b''
    if re.search(rb'java\.io\.ioexception:\s*keystore password was incorrect\b', text):
        return 'SIGN_STORE_PASSWORD_REJECTED'
    if any(marker in text for marker in (b'unsupported option:', b'unsupported password spec for ',
                                         b'unsupported password character encoding requested')):
        return 'SIGN_OPTIONS_REJECTED'
    if b'" does not contain a key' in text or b' does not contain key entries' in text:
        return 'SIGN_ALIAS_MISSING'
    if b'standard input closed' in text:
        return 'SIGN_STDIN_CLOSED'
    if any(marker in text for marker in (b'java.security.nosuchalgorithmexception', b'java.security.nosuchproviderexception',
                                         b'invalid keystore format', b'unsupported key algorithm',
                                         b'not an rsa, ec, or dsa private key')):
        return 'SIGN_KEYSTORE_FORMAT_OR_PROVIDER'
    # An outer "Wrong password?" prompt alone is ambiguous and does not qualify.
    if b'java.security.unrecoverablekeyexception' in text:
        return 'SIGN_KEY_PASSWORD_REJECTED'
    if any(marker in text for marker in (b'java.io.filenotfoundexception', b'java.nio.file.accessdeniedexception',
                                         b'java.nio.file.nosuchfileexception', b'java.io.ioexception')):
        return 'SIGN_FILE_ACCESS_OR_IO'
    return 'SIGN_TOOL_UNKNOWN'


def official(args, payload=None):
    # Passwords never enter arguments, exported environment, files or raw tool logs.
    signing = is_apksigner_sign(args)
    env = {key: os.environ[key] for key in ('SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH') if key in os.environ}
    failure = None
    try:
        result = subprocess.run(args, input=payload, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env, timeout=120, check=False,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    except subprocess.TimeoutExpired:
        failure = 'SIGN_TOOL_TIMEOUT'
    except OSError:
        failure = 'SIGN_PROCESS_START_FAILED'
    except Exception:
        failure = 'SIGN_TOOL_UNKNOWN'
    else:
        if not result.returncode:
            return '' if signing else result.stdout.decode('utf-8', errors='replace')
        failure = sign_failure_category(result.stderr) if signing else 'TOOL_FAILED'
        del result
    # Raise outside the handler so a raw child exception cannot remain as __context__.
    args = payload = env = None
    if signing:
        raise SignToolFailure(failure) from None
    raise Stop('TOOL_FAILED') from None


def tool(runner, args, code, payload=None):
    argv = [str(arg) for arg in args]
    failure = code
    try:
        return runner(argv, payload)
    except SignToolFailure as error:
        if code == 'SIGN_FAILED' and is_apksigner_sign(argv):
            failure = safe_sign_code(error.args[0] if len(error.args) == 1 else None)
    except Exception:
        pass
    args = argv = payload = None
    raise Stop(failure) from None


def reject_link(path):
    if path.is_symlink() or path.exists() and getattr(path.lstat(), 'st_file_attributes', 0) & 0x400:
        raise Stop('REPARSE_PATH_REFUSED')


def certificate_and_schemes(text, expected):
    values = re.findall(r'Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9:]+)', text)
    if len(values) != 1 or values[0].replace(':', '').lower() != expected:
        raise Stop('CERTIFICATE_MISMATCH')
    for scheme in ('v2', 'v3'):
        pattern = rf'^Verified using {scheme} scheme \(APK Signature Scheme {scheme}\):\s*true\s*$'
        if len(re.findall(pattern, text, re.M)) != 1:
            raise Stop('SIGNATURE_SCHEMES_MISMATCH')


def verify_signed(cfg, apk, runner, failure):
    text = tool(runner, [cfg.java, '-jar', cfg.sdk/'lib/apksigner.jar', 'verify',
                         '--verbose', '--print-certs', apk], failure)
    certificate_and_schemes(text, cfg.cert)


def identity(cfg, apk, runner):
    text = tool(runner, [cfg.sdk/'aapt2.exe', 'dump', 'badging', apk], 'APK_INSPECTION_FAILED')
    if "package: name='app.recipio.local' versionCode='29' versionName='0.11.2-personal.1'" not in text:
        raise Stop('APK_IDENTITY_MISMATCH')
    if 'application-debuggable' in text:
        raise Stop('APK_NOT_RELEASE')
    manifest = tool(runner, [cfg.sdk/'aapt2.exe', 'dump', 'xmltree', '--file',
                            'AndroidManifest.xml', apk], 'MANIFEST_INSPECTION_FAILED')
    for line in manifest.splitlines():
        for flag in ('debuggable', 'testOnly'):
            if f'android:{flag}' in line:
                # Official aapt2 API36 represents an explicit false boolean as 0x0.
                if not re.fullmatch(rf'\s*A: android:{flag}\(0x[\da-fA-F]+\)=\(type 0x12\)0x0\s*', line):
                    raise Stop('APK_NOT_RELEASE')


def preflight(cfg=FIXED, runner=official):
    if not re.fullmatch(r'[a-f0-9]{64}', cfg.sha):
        raise Stop('UNSIGNED_HASH_NOT_FROZEN')
    for path in (cfg.output.parent, cfg.key.parent, cfg.key, cfg.staging):
        reject_link(path)
    if cfg.output.exists():
        raise Stop('OUTPUT_EXISTS')
    if not cfg.key.is_file():
        raise Stop('EXISTING_KEY_NOT_FOUND')
    if digest(cfg.unsigned) != cfg.sha:
        raise Stop('UNSIGNED_HASH_MISMATCH')
    if digest(cfg.previous) != cfg.previous_sha:
        raise Stop('PREVIOUS_APK_HASH_MISMATCH')
    identity(cfg, cfg.unsigned, runner)
    tool(runner, [cfg.sdk/'zipalign.exe', '-c', '-P', '16', '4', cfg.unsigned], 'ALIGNMENT_FAILED')
    verify_signed(cfg, cfg.previous, runner, 'V28_SIGNATURE_INVALID')


def sign_existing(cfg, password, runner=official):
    if not password or any(char in password for char in '\r\n\0'):
        raise Stop('PASSWORD_TRANSPORT_INVALID')
    preflight(cfg, runner)
    key_stat = cfg.key.stat()  # Metadata only; Python never reads/copies key bytes.
    cfg.staging.mkdir(exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='attempt-', dir=cfg.staging))
    snapshot, candidate = stage/'input-unsigned.apk', stage/'signed-staged.apk'
    shutil.copyfile(cfg.unsigned, snapshot)
    if digest(snapshot) != cfg.sha:
        raise Stop('UNSIGNED_HASH_MISMATCH')
    tool(runner, [cfg.sdk/'zipalign.exe', '-c', '-P', '16', '4', snapshot], 'ALIGNMENT_FAILED')
    payload = (password+'\n'+password+'\n').encode('utf-8')
    tool(runner, [cfg.java, '-jar', cfg.sdk/'lib/apksigner.jar', 'sign', '--ks', cfg.key,
                  '--ks-key-alias', 'recipio-personal', '--ks-pass', 'stdin', '--key-pass', 'stdin',
                  '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
                  '--v4-signing-enabled', 'false', '--out', candidate, snapshot], 'SIGN_FAILED', payload)
    payload = None
    verify_signed(cfg, candidate, runner, 'SIGNED_VERIFY_FAILED')
    identity(cfg, candidate, runner)
    tool(runner, [cfg.sdk/'zipalign.exe', '-c', '-P', '16', '4', candidate], 'SIGNED_ALIGNMENT_FAILED')
    with zipfile.ZipFile(snapshot) as before, zipfile.ZipFile(candidate) as after:
        if len(before.namelist()) != len(set(before.namelist())) or len(after.namelist()) != len(set(after.namelist())):
            raise Stop('APK_PAYLOAD_CHANGED')
        if before.testzip() or after.testzip() or any(name not in after.namelist() or before.read(name) != after.read(name) for name in before.namelist()):
            raise Stop('APK_PAYLOAD_CHANGED')
        extra = set(after.namelist())-set(before.namelist())
        if any(not re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[\w-]+\.(?:SF|RSA|DSA|EC))', name, re.I) for name in extra):
            raise Stop('APK_PAYLOAD_CHANGED')
    current = cfg.key.stat()
    if (key_stat.st_size, key_stat.st_mtime_ns) != (current.st_size, current.st_mtime_ns):
        raise Stop('KEY_METADATA_CHANGED')
    result = {'status': 'SIGNED_CANDIDATE_VERIFIED', 'package': 'app.recipio.local',
              'versionCode': 29, 'versionName': '0.11.2-personal.1',
              'unsignedSha256': cfg.sha, 'previousApkSha256': cfg.previous_sha,
              'certificateSha256': cfg.cert, 'v2Verified': True, 'v3Verified': True,
              'sha256': digest(candidate), 'bytes': candidate.stat().st_size,
              'apk': str(cfg.output/'recipio-personal-v29.apk'),
              'signingIdentity': 'EXISTING_V27_V28_ONLY', 'payloadEntriesUnchanged': True,
              'runtimeUpgrade': 'NOT_RUN', 'source': SOURCE}
    cfg.output.mkdir()  # Exclusive new publication; never overwrite V28 or any attempt.
    with (cfg.output/'recipio-personal-v29.apk').open('xb') as stream:
        with candidate.open('rb') as original:
            shutil.copyfileobj(original, stream)
    if digest(cfg.output/'recipio-personal-v29.apk') != result['sha256']:
        raise Stop('FINAL_COPY_MISMATCH')
    with (cfg.output/'OWNER_RESULT.json').open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2)
    return result


def main():
    import tkinter as tk
    root = tk.Tk()
    root.title('RECIPIO V29 — 仅复用已有正式密钥')
    root.geometry('620x280')
    message = tk.StringVar(value='正在核对冻结 V29 APK 和 V28 公开证书…')
    tk.Label(root, textvariable=message, wraplength=580, justify='left').pack(padx=20, pady=16)
    root.update_idletasks()
    try:
        preflight()
    except Exception as error:
        message.set('已停止：'+(str(error) if isinstance(error, Stop) else 'PREFLIGHT_FAILED')+'。未要求密码、未签名。')
        tk.Button(root, text='关闭', command=root.destroy).pack()
        root.mainloop()
        return
    message.set('只输入已有正式密钥的原密码一次。\n星号表示已输入；不要设置新密码，不要把密码或窗口截图发到聊天。')
    entry = tk.Entry(root, show='*', width=48)
    entry.pack(padx=20, pady=8)
    entry.focus_set()

    def perform():
        password = entry.get()
        entry.delete(0, tk.END)
        entry.configure(state='disabled')
        button.configure(state='disabled')
        message.set('正在本机签名并核验；没有创建、复制或覆盖密钥。')
        root.update_idletasks()
        try:
            result = sign_existing(FIXED, password)
            message.set('签名成功，证书与 V28 一致。\n'+result['apk']+'\n请关闭窗口并回复 Codex：签名已完成。')
        except Exception as error:
            code = str(error) if isinstance(error, Stop) else 'OWNER_OPERATION_FAILED'
            message.set('已停止：'+code+'。不自动重试或覆盖文件；请仅反馈错误类别。')
        finally:
            password = None
        tk.Button(root, text='关闭', command=root.destroy).pack(pady=8)

    button = tk.Button(root, text='用已有密钥签名一次', command=perform)
    button.pack(pady=8)
    root.mainloop()


if __name__ == '__main__':
    main()
