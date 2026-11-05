from pathlib import Path
import subprocess,time,json
root=Path(__file__).resolve().parent
adb=r'E:\CODEX\Tools\recipio-official-signing-sdk36\platform-tools\adb.exe'
started=time.monotonic();deadline=started+210;ready=False
while time.monotonic()<deadline:
    try:
        p=subprocess.run([adb,'-s','emulator-5690','shell','getprop','sys.boot_completed'],capture_output=True,timeout=10)
        if p.returncode==0 and p.stdout.strip()==b'1':ready=True;break
    except subprocess.TimeoutExpired:pass
    time.sleep(3)
result={'bootCompleted':ready,'elapsedSeconds':round(time.monotonic()-started,1),'serial':'emulator-5690','clientDate':'2026-11-05'}
(root/'boot-20261105.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));raise SystemExit(0 if ready else 1)
