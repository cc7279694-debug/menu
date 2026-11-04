from pathlib import Path
import subprocess,sys,json,datetime,re
root=Path(__file__).resolve().parent
adb=r'E:\CODEX\Tools\recipio-official-signing-sdk36\platform-tools\adb.exe'
serial='emulator-5690'
def call(*args):return subprocess.check_output([adb,'-s',serial,*args],timeout=45).decode().strip()
assert call('emu','avd','name').splitlines()[0]=='Recipio_XHS_R2_N2_API36'
assert call('shell','getprop','ro.build.version.sdk')=='36'
test,label=sys.argv[1:];out=root/(label+'.txt');assert not out.exists()
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
result=subprocess.run([adb,'-s',serial,'shell','am','instrument','-w','-r','-e','class',test,'-e','g5SyntheticPickerDiagnostics','G5_SYNTHETIC_CLOUD_FIXTURE','app.recipio.local.test/androidx.test.runner.AndroidJUnitRunner'],capture_output=True,timeout=420)
raw=result.stdout+b'\n'+result.stderr;out.write_bytes(raw);text=raw.decode(errors='replace')
ok=result.returncode==0 and re.search(r'OK \(\d+ tests?\)',text) is not None and all(x not in text for x in ['FAILURES!!!','INSTRUMENTATION_FAILED','Process crashed'])
(root/(label+'.json')).write_text(json.dumps({'startedAt':started,'class':test,'serial':serial,'exitCode':result.returncode,'passed':ok,'provider':'FAKE_HTTP_ONLY','realAiCalls':0,'output':out.name},indent=2)+'\n')
print(text[-14000:]);sys.exit(0 if ok else 1)
