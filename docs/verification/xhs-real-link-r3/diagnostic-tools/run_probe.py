from pathlib import Path
import subprocess,json,sys,datetime
q=Path(__file__).resolve().parent
repo=Path(r'E:\CODEX\VIBE CODING\recipe-step-app-xhs-r3')
label=sys.argv[1];assert label.replace('-','').isalnum()
out=q/(label+'.json');assert not out.exists(),'Keep prior outcomes'
ledger=json.loads((q/'request-budget.private.json').read_text())
assert ledger['remainingHttpRequests']>=3,'No authorized HTTP budget remains; no network work started'
cp=json.loads((q/'classpath.json').read_text(encoding='utf8'))
java=Path(r'E:\CODEX\Tools\recipio-official-signing-jdk21\bin\java.exe')
configPath=q/'sample.private.json'
config=json.loads(configPath.read_text(encoding='utf8'))
config['runId']=label
assert not (q/('r3-safe-'+label+'.json')).exists(),'Keep prior safe traces'
configPath.write_text(json.dumps(config,ensure_ascii=False),encoding='utf8')
# Child stdout may contain a private page. Keep it exclusively in this process's
# memory and the analyzer pipe, never a shell pipeline/CI log/file/tool result.
# Reserve the entire bounded chain first, even if post-processing fails.
ledger['remainingHttpRequests']-=3
(q/'request-budget.private.json').write_text(json.dumps(ledger,indent=2)+'\n')
network=subprocess.run([str(java),'-Xmx192m','-cp',cp['classpath'],cp['mainClass'],str(configPath)],capture_output=True,timeout=35)
if network.returncode!=0:
    print(json.dumps({'probeFailed':True,'phase':'native_probe','exitCode':network.returncode}));raise SystemExit(1)
try:
    envelope=json.loads(network.stdout.decode('utf8',errors='strict'))
except (UnicodeDecodeError,json.JSONDecodeError):
    print(json.dumps({'probeFailed':True,'phase':'output_protocol','safeSidecarAvailable':(q/('r3-safe-'+label+'.json')).exists()}));raise SystemExit(1)
analysis=subprocess.run(['node','--no-warnings',str(q/'analyze_real.mjs'),str(repo)],input=network.stdout,capture_output=True,timeout=30)
if analysis.returncode!=0:
    print(json.dumps({'probeFailed':True,'phase':'safe_analysis','exitCode':analysis.returncode}));raise SystemExit(1)
report=json.loads(analysis.stdout)
report['observedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
report['sample']='Sample A';report['privatePageSaved']=False
private=envelope.get('privatePage')
if '--keep-private' in sys.argv and private:
    cached=q/'received-page.private.json';assert not cached.exists(),'Do not overwrite a private diagnostic sample'
    cached.write_text(json.dumps(private,ensure_ascii=False),encoding='utf8')
    report['privatePageSaved']=True
    report['privatePagePurpose']='LOCAL_TEMP_OFFLINE_ROOT_CAUSE_ONLY'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=2))
