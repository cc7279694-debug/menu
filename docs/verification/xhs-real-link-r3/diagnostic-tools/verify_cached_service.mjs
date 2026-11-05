import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
const repo=process.argv[2], cache=process.argv[3], destination=process.argv[4];
const require=createRequire(repo+'/package.json');
const {createServer}=await import(pathToFileURL(require.resolve('vite')));
const server=await createServer({root:repo,configFile:repo+'/vite.native.config.mts',logLevel:'silent',server:{middlewareMode:true}});
try {
 const {LinkImportService}=await server.ssrLoadModule('/src/native/link-import/service.ts');
 const privatePage=JSON.parse(fs.readFileSync(cache,'utf8'));
 let calls=0, safeRequest=null;
 const ai={snapshot:()=>({phase:'input'}),discard:async()=>{},startSession:async()=>{},organize:async(input)=>{
   calls++;
   const url=new URL(privatePage.finalUrl);
   safeRequest={textChars:Array.from(input.text).length,imageCount:input.imageIds.length,containsFinalUrl:input.text.includes(privatePage.finalUrl),containsShareParameterValues:[...url.searchParams.values()].filter(v=>v.length>8).some(v=>input.text.includes(v))};
 }};
 const service=new LinkImportService({store:{},port:{read:async()=>privatePage,cancel:async()=>{}},ai});
 await service.read(privatePage.finalUrl);
 const snapshot=service.snapshot();
 const report={kind:'REAL_CACHED_PAGE_EXACT_PRODUCTION_SERVICE_OFFLINE',cacheReadOnly:true,additionalHttpRequests:0,realAiCalls:0,provider:'FAKE_NO_NETWORK_NO_PERSISTENCE',sourceHash:crypto.createHash('sha256').update(fs.readFileSync(repo+'/src/native/link-import/xhs-page.ts')).digest('hex'),phaseAfterRead:snapshot.phase,qualityAfterRead:service.readQuality(),titleNonempty:!!snapshot.visible?.title,textCodePoints:Array.from(snapshot.visible?.text??'').length,structuredCandidateCount:snapshot.parsed?.candidates.length,automaticAiCalls:calls,explicitAiEntryEnabled:!['title_only','unreadable'].includes(service.readQuality())};
 await service.useAi();
 report.explicitFakeAiCalls=calls;report.phaseAfterExplicitFake=service.snapshot().phase;report.request=safeRequest;
 report.savedRecipes=0;report.databaseOpened=false;
 fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
} catch {process.stdout.write(JSON.stringify({verificationFailed:true,rawErrorSuppressed:true})+'\n');process.exitCode=1;}
finally{await server.close();}
