// Diagnostic only. Stdout is a private local child pipe, not a public evidence/log stream.
import { resolveDoh } from './doh-resolver.mjs';
import { isIP } from 'node:net';
try {
  if(process.argv.length!==3)throw Error();
  const records=await resolveDoh(process.argv[2]);
  if(!records.length||records.length>64||records.some(r=>isIP(r.address)!==r.family))throw Error();
  // Compact numeric literals only; both A and AAAA must have completed successfully.
  process.stdout.write(JSON.stringify({addresses:records.map(r=>r.address)}));
}catch{
  process.stdout.write(JSON.stringify({error:'DNS_DOH_UNAVAILABLE'}));
  process.exitCode=1;
}
