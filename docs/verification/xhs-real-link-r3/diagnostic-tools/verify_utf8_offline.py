from pathlib import Path
import subprocess,json,hashlib,uuid
q=Path(__file__).resolve().parent;c=json.loads((q/'classpath.json').read_text())
sources=c['compiledProductionFiles']+[str(q/'R3NativeProbe.java'),str(q/'CharsetBaseline.java')]
compile_result=subprocess.run([r'E:\CODEX\Tools\recipio-official-signing-jdk21\bin\javac.exe','-J-Xmx128m','-encoding','UTF-8','-cp',c['classpath'],'-d',str(q/'classes'),*sources],capture_output=True,timeout=60)
(q/'probe-utf8-compile.txt').write_bytes(compile_result.stdout+b'\n'+compile_result.stderr)
assert compile_result.returncode==0,'Compilation failed; inspect local safe compiler log'
def execute(main,*args,charset='GBK'):
    return subprocess.run([c['java'],'-Xmx128m','-Dstdout.encoding='+charset,'-cp',c['classpath'],main,*args],capture_output=True,timeout=15)
baseline=execute('app.recipio.local.CharsetBaseline')
assert baseline.returncode==0
expected='合成中文🍚菜谱，椰子🥥2个。'
try:
    recovered=json.loads(baseline.stdout)['text'];baseline_failure=recovered!=expected;failure='LOSSY_ROUNDTRIP' if baseline_failure else 'NONE'
except UnicodeDecodeError:baseline_failure=True;failure='UTF8_DECODE_ERROR'
assert baseline_failure,'Baseline did not reproduce the native charset failure'
red={'kind':'OFFLINE_SYNTHETIC_EMULATED_WINDOWS_GBK','legacyStdout':'FAILED_AS_EXPECTED','failureCategory':failure,'networkExecuted':False,'rawPayloadPersisted':False}
(q/'probe-utf8-red.json').write_text(json.dumps(red,indent=2)+'\n',encoding='utf8')
checks=[]
for charset in ['GBK','UTF-8']:
    run_id='selftest-'+uuid.uuid4().hex
    result=execute(c['mainClass'],'--selftest-output',run_id,charset=charset)
    assert result.returncode==0
    envelope=json.loads(result.stdout)
    assert envelope['errorCode'] is None
    assert envelope['trace']['selftestMode'] is True and envelope['trace']['networkExecuted'] is False
    assert envelope['trace']['httpRequestsAdmitted']==0 and envelope['trace']['safeTraceSidecarWritten'] is True
    html=envelope['privatePage']['html'];assert '合成中文🍚菜谱' in html and '鸡肉500克，椰子🥥2个。' in html and '加水煮20分钟' in html
    sidecar=q/('r3-safe-'+run_id+'.json');raw=sidecar.read_bytes();safe=json.loads(raw)
    assert safe.keys()=={'trace','errorCode'}
    for secret in ['privatePage','synthetic-r3-note','合成中文','椰子','https://']:
        assert secret not in raw.decode('utf8'),secret
    checks.append({'stdoutEncodingProperty':charset,'utf8Decode':'PASS','chineseEmojiRoundtrip':'PASS','networkExecuted':False,'safeSidecarOnly':'PASS','sidecarFile':sidecar.name,'sidecarSha256':hashlib.sha256(raw).hexdigest()})
    # Reusing a controlled run ID must not overwrite safe evidence or emit private content.
    duplicate=execute(c['mainClass'],'--selftest-output',run_id,charset=charset)
    duplicated=json.loads(duplicate.stdout)
    assert duplicated['privatePage'] is None and duplicated['errorCode']=='diagnostic_sidecar_error'
    assert sidecar.read_bytes()==raw
    checks[-1]['existingSidecarRefusal']='PASS'
report={'kind':'DIAGNOSTIC_TOOL_ONLY_OFFLINE','legacyRed':red,'checks':checks,'compile':'PASS','realAiCalls':0,'realHttpRequests':0,'realXhsRequests':0,'productionSourceModified':False,'realLinkPass':False}
(q/'probe-utf8-offline-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({'compile':'PASS','legacyCharsetRegression':failure,'utf8RoundtripCharsets':['GBK','UTF-8'],'safeSidecarsAndNoOverwrite':'PASS','httpRequests':0,'realLinkPass':False},indent=2))
