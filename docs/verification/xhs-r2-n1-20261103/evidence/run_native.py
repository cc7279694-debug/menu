from pathlib import Path
import subprocess, sys, json, datetime

ROOT = Path(__file__).resolve().parent
ADB = r'E:\CODEX\Tools\recipio-official-signing-sdk36\platform-tools\adb.exe'
SERIAL = 'emulator-5686'

def adb(*args, timeout=45):
    return subprocess.run([ADB, '-s', SERIAL, *args], capture_output=True, timeout=timeout)

assert adb('emu','avd','name').stdout.decode().splitlines()[0] == 'Recipio_XHS_R2_N1_API36'
assert adb('shell','getprop','ro.build.version.sdk').stdout.decode().strip() == '36'
test, label = sys.argv[1:]
output = ROOT / (label + '.txt')
assert not output.exists(), 'Keep previous test output intact'
cmd = [ADB, '-s', SERIAL, 'shell', 'am', 'instrument', '-w', '-r', '-e', 'class', test,
       '-e', 'g5SyntheticPickerDiagnostics', 'G5_SYNTHETIC_CLOUD_FIXTURE',
       'app.recipio.local.test/androidx.test.runner.AndroidJUnitRunner']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
try:
    result = subprocess.run(cmd, capture_output=True, timeout=360)
    raw = result.stdout + b'\n' + result.stderr
    output.write_bytes(raw)
    text = raw.decode('utf-8', errors='replace')
    passed = result.returncode == 0 and 'OK (' in text and 'FAILURES!!!' not in text and 'INSTRUMENTATION_FAILED' not in text
    (ROOT / (label + '.json')).write_text(json.dumps({'startedAt': started, 'test': test,
        'serial': SERIAL, 'exitCode': result.returncode, 'passed': passed,
        'provider': 'FAKE_HTTP_ONLY', 'realAiCalls': 0, 'output': output.name}, indent=2), encoding='utf-8')
    print(text[-12000:])
    sys.exit(0 if passed else 1)
except subprocess.TimeoutExpired as error:
    output.write_bytes((error.stdout or b'') + b'\nTIMEOUT\n' + (error.stderr or b''))
    raise
