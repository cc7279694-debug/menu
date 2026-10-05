// Exercise the actual packet builder in a disposable generated repository, not the user's checkout.
import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';

const builder=resolve('scripts/build-ai-intake-review-packet.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(work){
 const base=realpathSync(tmpdir()),root=mkdtempSync(join(base,'recipio-packet-test-'));
 const run=(cmd,args)=>spawnSync(cmd,cmd==='git'?['-c','commit.gpgsign=false','-c','core.hooksPath='+join(root,'disabled-generated-hooks'),...args]:args,{cwd:root,encoding:'utf8',timeout:60000});
 const put=(path,text)=>{const absolute=join(root,path);mkdirSync(dirname(absolute),{recursive:true});writeFileSync(absolute,text);};
 const git=(...args)=>{const r=run('git',args);expect(r.status,r.stderr).toBe(0);};
 git('init','--initial-branch=feat/recipio-ai-intake');
 for(const path of ['docs/checkpoints/2026-10-04-ai-intake.md','docs/verification/ai-intake-android.md','docs/ai-intake-contract.md'])put(path,'APK_4_PENDING_DEVICE_TEST\nGenerated test evidence, no real credentials.\n');
 for(const name of ['android-verification.md','security-notes.md','provider-smoke.md','test-results.txt','apk-metadata.txt'])put('artifacts/ai-intake/'+name,'Generated evidence; Provider POST=0; device Not Run.\n');
 git('add','.');git('-c','user.name=Generated Test','-c','user.email=test@example.invalid','commit','-m','test: generated packet baseline');git('tag','c8606e3');
 put('docs/verification/ai-intake-android.md','APK_4_PENDING_DEVICE_TEST\nGenerated final evidence.\n');git('add','.');git('-c','user.name=Generated Test','-c','user.email=test@example.invalid','commit','-m','test: generated packet delivery');
 return Promise.resolve().then(()=>work({root,run,put})).finally(()=>{if(dirname(root)!==base||!basename(root).startsWith('recipio-packet-test-'))throw new Error('Unsafe fixture cleanup');rmSync(root,{recursive:true});});
}
it('builds ten whitelisted readback-hashed entries including unrun Provider evidence and never overwrites a packet',()=>fixture(async({root,run})=>{
 const result=run(process.execPath,[builder]);expect(result.status,result.stderr).toBe(0);
 const file=join(root,'artifacts/ai-intake/review-packet-apk-4-ai-intake.zip'),bytes=readFileSync(file),archive=await JSZip.loadAsync(bytes);
 expect(Object.keys(archive.files).sort()).toEqual(['manifest.json','diff.patch','checkpoint.md','verification.md','android-verification.md','ai-contract.md','security-notes.md','provider-smoke.md','test-results.txt','apk-metadata.txt'].sort());
 const manifest=JSON.parse(await archive.file('manifest.json').async('string'));expect(manifest.acceptanceStatus).toBe('APK_4_PENDING_DEVICE_TEST');
 for(const entry of manifest.files){const content=await archive.file(entry.name).async('nodebuffer');expect(content.length).toBe(entry.bytes);expect(sha(content)).toBe(entry.sha256);}
 expect(await archive.file('provider-smoke.md').async('string')).toContain('Provider POST=0');
 expect(run(process.execPath,[builder]).status).not.toBe(0);expect(sha(readFileSync(file))).toBe(sha(bytes));
}),60000);
it('refuses an incomplete packet when Provider evidence is missing',()=>fixture(async({root,run})=>{
 const evidence=join(root,'artifacts/ai-intake/provider-smoke.md');rmSync(evidence);
 // Simulate an artifact not tracked in a normal delivery repository; preserve clean Git semantics.
 expect(run('git',['add','-u']).status).toBe(0);expect(run('git',['-c','user.name=Generated Test','-c','user.email=test@example.invalid','commit','-m','test: missing evidence']).status).toBe(0);
 const result=run(process.execPath,[builder]);expect(result.status).not.toBe(0);expect(result.stderr).toContain('Missing evidence: artifacts/ai-intake/provider-smoke.md');expect(existsSync(join(root,'artifacts/ai-intake/review-packet-apk-4-ai-intake.zip'))).toBe(false);
}),60000);
