from pathlib import Path
import subprocess,os,json,datetime
root=Path(__file__).resolve().parent
avds=root/'avd'; user=root/'android-user'
assert not avds.exists(),'Do not overwrite an existing AVD directory'
avds.mkdir();user.mkdir(exist_ok=False)
sdk=Path(r'C:\Users\CDD\AppData\Local\MirraAndroid\sdk')
env=os.environ.copy();env.update(ANDROID_AVD_HOME=str(avds),ANDROID_USER_HOME=str(user),ANDROID_HOME=str(sdk),ANDROID_SDK_ROOT=str(sdk),JAVA_HOME=r'E:\CODEX\Tools\recipio-official-signing-jdk21')
name='Recipio_XHS_R2_N2_API36'
result=subprocess.run([str(sdk/'cmdline-tools/latest/bin/avdmanager.bat'),'create','avd','-n',name,'-k','system-images;android-36;google_apis;x86_64','-d','pixel_2'],input=b'no\n',env=env,capture_output=True,timeout=120)
(root/'avd-create.txt').write_bytes(result.stdout+b'\n'+result.stderr)
assert result.returncode==0, result.stderr.decode(errors='replace')
config=avds/(name+'.avd')/'config.ini'
text=config.read_text();updates={'hw.ramSize':'2560','hw.cpu.ncore':'2','hw.gpu.enabled':'yes','hw.gpu.mode':'swiftshader_indirect','disk.dataPartition.size':'2G'}
lines=[line for line in text.splitlines() if line.split('=',1)[0].strip() not in updates]
config.write_text('\n'.join(lines+[k+'='+v for k,v in updates.items()])+'\n')
print('Created owned AVD:',name,'in',avds)
