import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root=process.argv[2];
const {extractXhsPublicPage}=await import(pathToFileURL(root+'/src/native/link-import/xhs-page.ts'));
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const result={...input.trace,execution:'PC_EXACT_PRODUCTION_FETCHER',networkError:input.errorCode??null};
if(input.privatePage){
 const {html,finalUrl}=input.privatePage;
 const page=extractXhsPublicPage(html,finalUrl);
 const title=(page?.title??'').replace(/\s+/gu,'');
 const bodyHasNonTitle=(page?.text??'').split('\n').some(line=>line.replace(/\s+/gu,'').trim()&&line.replace(/\s+/gu,'').trim()!==title);
 result.extraction=page?{diagnostic:page.diagnostic,statePresent:page.statePresent,targetResolved:page.targetResolved,access:page.access,media:page.media,wasTruncated:page.wasTruncated,titleNonempty:!!page.title,textCodePoints:Array.from(page.text).length,bodyHasNonTitle,aiSourceTextGate:page.targetResolved&&!page.access&&!page.wasTruncated&&bodyHasNonTitle}:null;
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/giu)].map(x=>x[1]);
 result.safePageShape={htmlBytes:Buffer.byteLength(html),scriptCount:scripts.length,initialStateMentions:scripts.filter(s=>s.includes('__INITIAL_STATE__')).length,anchoredInitialStateAssignments:scripts.filter(s=>/^(?:window\.)?__INITIAL_STATE__\s*=\s*/u.test(s.trim())).length,hasNextData:scripts.some(s=>s.includes('__NEXT_DATA__')),stateAssignmentPayloadBytes:scripts.filter(s=>/^(?:window\.)?__INITIAL_STATE__\s*=\s*/u.test(s.trim())).slice(0,4).map(s=>Buffer.byteLength(s))};
}
// Never print privatePage, URLs, identifiers, headers, titles, or source text.
process.stdout.write(JSON.stringify(result,null,2)+'\n');
