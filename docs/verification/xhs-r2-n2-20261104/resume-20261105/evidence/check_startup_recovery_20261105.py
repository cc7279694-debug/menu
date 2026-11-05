from pathlib import Path
import subprocess,json,time,datetime
r=Path(__file__).resolve().parent;a=r'E:\CODEX\Tools\recipio-official-signing-sdk36\platform-tools\adb.exe'
def run(*args,timeout=30):return subprocess.run([a,'-s','emulator-5690',*args],capture_output=True,timeout=timeout)
assert run('emu','avd','name').stdout.decode().splitlines()[0]=='Recipio_XHS_R2_N2_API36'
focus=run('shell','dumpsys','window').stdout.decode(errors='replace')
current=[x for x in focus.splitlines() if 'mCurrentFocus=' in x]
assert len(current)==1 and 'Application Not Responding: com.android.systemui' in current[0],current
baseline=run('logcat','-b','events','-d','-v','threadtime').stdout.decode(errors='replace')
before=[x for x in baseline.splitlines() if 'am_anr' in x or 'am_crash' in x]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
# Exact Wait button bounds were read from the owned emulator's actual system dialog.
result=run('shell','input','tap','540','1091');assert result.returncode==0
time.sleep(20)
post=run('shell','dumpsys','window').stdout
(r/'startup-recovery-focus-20261105.txt').write_bytes(post)
events=run('logcat','-b','events','-d','-v','threadtime').stdout
(r/'startup-recovery-events-20261105.txt').write_bytes(events)
after=[x for x in events.decode(errors='replace').splitlines() if 'am_anr' in x or 'am_crash' in x]
new=[x for x in after if x not in before]
lines=[x for x in post.decode(errors='replace').splitlines() if 'mCurrentFocus=' in x]
healthy=not new and len(lines)==1 and 'Application Not Responding' not in lines[0]
(r/'startup-recovery-20261105.png').write_bytes(run('exec-out','screencap','-p').stdout)
report={'startedAt':started,'avd':'Recipio_XHS_R2_N2_API36','controlledWaitAttempts':1,'forcedClose':False,'reboots':0,'appsInstalled':False,'priorSystemEvents':len(before),'newAnrOrCrashEvents':len(new),'focusedWindow':lines,'recoveredAtObservation':healthy,'newEvents':new}
(r/'startup-recovery-20261105.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2));raise SystemExit(0 if healthy else 1)
