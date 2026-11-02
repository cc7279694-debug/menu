"""One fixed V28 signing attempt; existing identity only. No key generation."""
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
    cert: str


ROOT = Path(r'E:\RECIPIO-Signing')
FIXED = Inputs(
    Path(r'E:\CODEX\Tools\recipio-v28-a1-20261102\recipio-v28-a1-unsigned.apk'),
    ROOT / 'recipio-personal-release-v27/recipio-personal-v27.apk',
    ROOT / 'recipio-personal-identity-v1/personal-signing.p12',
    ROOT / 'recipio-personal-release-v28', ROOT / 'recipio-v28-staging',
    Path(r'E:\CODEX\Tools\recipio-official-signing-jdk21\bin\java.exe'),
    Path(r'E:\CODEX\Tools\recipio-official-signing-sdk36\build-tools\36.0.0'),
    'e8969bd0d18af8c34fe8472d8bd96d162b51216a8fc1a15ef8f8c5c5d9837e6a',
    '5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d')
V27_SHA = 'b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def official(args, payload=None):
    # No password environment, shell, inherited Java debug options or raw tool logs.
    env = {key: os.environ[key] for key in ('SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH') if key in os.environ}
    result = subprocess.run(args, input=payload, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            env=env, timeout=120, check=False,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode:
        raise Stop('TOOL_FAILED')
    return result.stdout.decode('utf-8', errors='replace')


def tool(runner, args, code, payload=None):
    try:
        return runner([str(arg) for arg in args], payload)
    except Exception:
        raise Stop(code) from None


def certificate(text, expected):
    values = re.findall(r'Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9:]+)', text)
    if len(values) != 1 or values[0].replace(':', '').lower() != expected:
        raise Stop('CERTIFICATE_MISMATCH')


def identity(cfg, apk, runner):
    text = tool(runner, [cfg.sdk/'aapt2.exe', 'dump', 'badging', apk], 'APK_INSPECTION_FAILED')
    if "package: name='app.recipio.local' versionCode='28' versionName='0.11.1-personal.1'" not in text or 'application-debuggable' in text:
        raise Stop('APK_IDENTITY_MISMATCH')


def reject_link(path):
    if path.is_symlink() or path.exists() and getattr(path.lstat(), 'st_file_attributes', 0) & 0x400:
        raise Stop('REPARSE_PATH_REFUSED')


def preflight(cfg=FIXED, runner=official):
    for path in (ROOT, cfg.key.parent, cfg.key, cfg.output.parent, cfg.staging):
        reject_link(path)
    if cfg.output.exists():
        raise Stop('OUTPUT_EXISTS')
    if not cfg.key.is_file():
        raise Stop('EXISTING_KEY_NOT_FOUND')
    if digest(cfg.unsigned) != cfg.sha or digest(cfg.previous) != V27_SHA:
        raise Stop('FROZEN_INPUT_MISMATCH')
    identity(cfg, cfg.unsigned, runner)
    certificate(tool(runner, [cfg.java, '-jar', cfg.sdk/'lib/apksigner.jar', 'verify',
                             '--print-certs', cfg.previous], 'V27_SIGNATURE_INVALID'), cfg.cert)


def sign_existing(cfg, password, runner=official):
    if not password or any(char in password for char in '\r\n\0'):
        raise Stop('PASSWORD_TRANSPORT_INVALID')
    if cfg.output.exists():
        raise Stop('OUTPUT_EXISTS')
    if digest(cfg.unsigned) != cfg.sha:
        raise Stop('UNSIGNED_HASH_MISMATCH')
    reject_link(cfg.key)
    reject_link(cfg.staging)
    key_stat = cfg.key.stat()
    identity(cfg, cfg.unsigned, runner)
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
                  '--v4-signing-enabled', 'false', '--out', candidate, snapshot], 'SIGN_FAILED', payload)
    payload = None
    certificate(tool(runner, [cfg.java, '-jar', cfg.sdk/'lib/apksigner.jar', 'verify',
                             '--print-certs', candidate], 'SIGNED_VERIFY_FAILED'), cfg.cert)
    identity(cfg, candidate, runner)
    tool(runner, [cfg.sdk/'zipalign.exe', '-c', '-P', '16', '4', candidate], 'SIGNED_ALIGNMENT_FAILED')
    with zipfile.ZipFile(snapshot) as before, zipfile.ZipFile(candidate) as after:
        if before.testzip() or after.testzip() or any(name not in after.namelist() or before.read(name) != after.read(name) for name in before.namelist()):
            raise Stop('APK_PAYLOAD_CHANGED')
        extra = set(after.namelist())-set(before.namelist())
        if any(not re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[\w-]+\.(?:SF|RSA|DSA|EC))', name, re.I) for name in extra):
            raise Stop('APK_PAYLOAD_CHANGED')
    current = cfg.key.stat()
    if (key_stat.st_size, key_stat.st_mtime_ns) != (current.st_size, current.st_mtime_ns):
        raise Stop('KEY_METADATA_CHANGED')
    result = {'status':'SIGNED_CANDIDATE_VERIFIED', 'package':'app.recipio.local',
              'versionCode':28, 'versionName':'0.11.1-personal.1',
              'unsignedSha256':cfg.sha, 'certificateSha256':cfg.cert,
              'sha256':digest(candidate), 'bytes':candidate.stat().st_size,
              'apk':str(cfg.output/'recipio-personal-v28.apk'),
              'signingIdentity':'EXISTING_V27_ONLY', 'payloadEntriesUnchanged':True,
              'runtimeUpgrade':'NOT_RUN', 'source':'cf806554ac38346644613dd8b3bf700aeb48b14f'}
    cfg.output.mkdir()  # Exclusive final publication; conflict/error never overwrites.
    with (cfg.output/'recipio-personal-v28.apk').open('xb') as stream:
        with candidate.open('rb') as original:
            shutil.copyfileobj(original, stream)
    if digest(cfg.output/'recipio-personal-v28.apk') != result['sha256']:
        raise Stop('FINAL_COPY_MISMATCH')
    with (cfg.output/'OWNER_RESULT.json').open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2)
    return result


def main():
    import tkinter as tk
    root = tk.Tk()
    root.title('RECIPIO V28 — 复用已有密钥签名')
    root.geometry('600x260')
    message = tk.StringVar(value='正在核对冻结 APK 和 v27 公开证书…')
    tk.Label(root, textvariable=message, wraplength=560, justify='left').pack(padx=20, pady=16)
    root.update_idletasks()
    try:
        preflight()
    except Exception as error:
        message.set('已停止：'+(str(error) if isinstance(error, Stop) else 'PREFLIGHT_FAILED')+'。未要求密码、未签名。')
        tk.Button(root, text='关闭', command=root.destroy).pack()
        root.mainloop()
        return
    message.set('只输入 v27 已有密钥的原密码一次。\n输入框显示星号；不要设置新密码，不要把密码发到聊天。')
    entry = tk.Entry(root, show='*', width=48)
    entry.pack(padx=20, pady=8)
    entry.focus_set()

    def perform():
        password = entry.get()
        entry.delete(0, tk.END)
        entry.configure(state='disabled')
        button.configure(state='disabled')
        message.set('正在本机签名和核验，请稍候。没有创建或覆盖密钥。')
        root.update_idletasks()
        try:
            result = sign_existing(FIXED, password)
            message.set('签名成功，证书与 v27 一致。\n'+result['apk']+'\n请关闭窗口并回复 Codex：签名已完成。')
        except Exception as error:
            code = str(error) if isinstance(error, Stop) else 'OWNER_OPERATION_FAILED'
            message.set('已停止：'+code+'。未发布可用候选；保留失败文件，不自动重试。请仅反馈错误类别。')
        finally:
            password = None
        tk.Button(root, text='关闭', command=root.destroy).pack(pady=8)

    button = tk.Button(root, text='使用原密钥签名一次', command=perform)
    button.pack(pady=8)
    root.mainloop()


if __name__ == '__main__':
    main()
