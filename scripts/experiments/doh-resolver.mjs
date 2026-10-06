// Stage 0 only. No production import, system configuration change or sample persistence.
import https from "node:https";
import { isIP } from "node:net";

const MAX_BYTES = 65535, DNS_TIMEOUT = 10000;
// Published by https://alidns.com/; this fixed bootstrap avoids system Fake-IP.
const BOOTSTRAP = Object.freeze([Object.freeze({address:"223.5.5.5",family:4}),Object.freeze({address:"223.6.6.6",family:4})]);
const failure = () => Object.assign(new Error("dns_unavailable"),{category:"dns_unavailable"});
function normalizedHost(host) {
  if (typeof host !== "string") throw failure();
  const value = host.toLowerCase().replace(/\.$/,"");
  if (!value || value.length > 253 || value.split(".").some(label => !/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(label))) throw failure();
  return value;
}
export function dnsWireQuery(host, type) {
  if (![1,28].includes(type)) throw failure();
  const labels = normalizedHost(host).split(".").flatMap(label => [Buffer.from([label.length]),Buffer.from(label,"ascii")]);
  const header = Buffer.from("000001000001000000000000","hex");
  const end = Buffer.alloc(5); end.writeUInt16BE(type,1); end.writeUInt16BE(1,3);
  return Buffer.concat([header,...labels,end]);
}
function readName(bytes, start) {
  let offset = start, end, total = 0; const labels = [], visited = new Set();
  for (let hops = 0; hops < 128; hops++) {
    if (offset >= bytes.length || visited.has(offset)) throw failure(); visited.add(offset);
    const size = bytes[offset];
    if ((size & 0xc0) === 0xc0) {
      if (offset + 1 >= bytes.length) throw failure();
      const target = ((size & 0x3f) << 8) | bytes[offset + 1];
      if (target >= offset) throw failure(); // Compression must refer back, not loop/forward.
      end ??= offset + 2; offset = target; continue;
    }
    if (size & 0xc0 || offset + size + 1 > bytes.length) throw failure();
    if (size === 0) return {name:labels.join(".").toLowerCase(),end:end ?? offset + 1};
    const rawLabel = bytes.subarray(offset + 1,offset + 1 + size);
    if (rawLabel.some(value => value > 127)) throw failure();
    const label = rawLabel.toString("ascii");
    if (!/^[a-zA-Z0-9_-]+$/.test(label) || (total += size + 1) > 254) throw failure();
    labels.push(label); offset += size + 1;
  }
  throw failure();
}
export function parseDnsWire(bytes, host, type) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > MAX_BYTES || ![1,28].includes(type)) throw failure();
  const flags = bytes.readUInt16BE(2), answers = bytes.readUInt16BE(6), authority = bytes.readUInt16BE(8), additional = bytes.readUInt16BE(10);
  if (bytes.readUInt16BE(0) !== 0 || !(flags & 0x8000) || flags & 0x7800 || flags & 0x0200 || flags & 15 || bytes.readUInt16BE(4) !== 1 || answers + authority + additional > 256) throw failure();
  const question = readName(bytes,12); let offset = question.end;
  if (offset + 4 > bytes.length || question.name !== normalizedHost(host) || bytes.readUInt16BE(offset) !== type || bytes.readUInt16BE(offset + 2) !== 1) throw failure(); offset += 4;
  const records = [], aliases = [];
  for (let index = 0; index < answers + authority + additional; index++) {
    const owner = readName(bytes,offset); offset = owner.end;
    if (offset + 10 > bytes.length) throw failure();
    const recordType = bytes.readUInt16BE(offset), recordClass = bytes.readUInt16BE(offset + 2), length = bytes.readUInt16BE(offset + 8), start = offset + 10;
    offset = start + length; if (offset > bytes.length) throw failure();
    // Only Answer-section IN CNAMEs and the requested address type can resolve
    // this question. Reject other address material, never silently ignore it.
    if ([1,5,28].includes(recordType) && (index >= answers || recordClass !== 1 || recordType !== 5 && recordType !== type)) throw failure();
    if (recordClass !== 1) continue;
    if (recordType === 5) { const alias = readName(bytes,start); if (alias.end !== offset) throw failure(); aliases.push({owner:owner.name,target:alias.name}); }
    if (recordType === 1 || recordType === 28) {
      if (length !== (recordType === 1 ? 4:16)) throw failure();
      const address = recordType === 1 ? [...bytes.subarray(start,offset)].join(".") : Array.from({length:8},(_,i) => bytes.readUInt16BE(start + i * 2).toString(16)).join(":");
      records.push({owner:owner.name,address,family:recordType === 1 ? 4:6});
    }
  }
  if (offset !== bytes.length) throw failure();
  const targets = new Map();
  for (const alias of aliases) {
    if (targets.has(alias.owner) && targets.get(alias.owner) !== alias.target) throw failure();
    targets.set(alias.owner,alias.target);
  }
  let terminal = normalizedHost(host); const boundNames = new Set([terminal]);
  while (targets.has(terminal)) {
    terminal = targets.get(terminal);
    if (boundNames.has(terminal)) throw failure();
    boundNames.add(terminal);
  }
  // A unique acyclic chain binds all aliases and only its terminal addresses.
  if (aliases.some(alias => !boundNames.has(alias.owner)) || records.some(record => record.owner !== terminal)) throw failure();
  return records.map(({address,family}) => ({address,family}));
}
function bootstrapLookup(host, options, callback) {
  if (host !== "dns.alidns.com") return callback(Object.assign(failure(),{message:"unbound_host"}));
  if ((typeof options === "number" ? options : options.family) === 6) return callback(failure());
  if (options.all) callback(null,BOOTSTRAP); else callback(null,BOOTSTRAP[0].address,4);
}
export async function dohRequest(host, type, {request = https.request,signal = AbortSignal.timeout(DNS_TIMEOUT)} = {}) {
  const body = dnsWireQuery(host,type);
  return new Promise((resolve,reject) => {
    const req = request(new URL("https://dns.alidns.com/dns-query"),{
      method:"POST",agent:false,lookup:bootstrapLookup,servername:"dns.alidns.com",rejectUnauthorized:true,signal,
      headers:{Accept:"application/dns-message","Content-Type":"application/dns-message","Content-Length":body.length,"Accept-Encoding":"identity","User-Agent":"RECIPIO/0.8 Stage0 DNS Probe"},
    },async response => {
      try {
        if (response.statusCode !== 200 || String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/dns-message" || response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") throw failure();
        const chunks = []; let count = 0;
        for await (const chunk of response) { count += chunk.length; if (count > MAX_BYTES) throw failure(); chunks.push(chunk); }
        resolve(Buffer.concat(chunks));
      } catch { response.destroy(); reject(failure()); }
    });
    req.setTimeout(6000,() => req.destroy(failure()));
    req.on("error",() => reject(failure())); req.end(body);
  });
}
export async function resolveDoh(host, {exchange = dohRequest} = {}) {
  try {
    const signal = AbortSignal.timeout(DNS_TIMEOUT);
    const answers = await Promise.all([1,28].map(async type => parseDnsWire(await exchange(host,type,{signal}),host,type)));
    const unique = new Map();
    for (const record of answers.flat()) {
      if (isIP(record.address) !== record.family) throw failure();
      unique.set(record.address,record);
    }
    // Public/nonpublic validation of every answer is performed by publicAddresses,
    // before any HTTP/TLS connection is constructed. No A-only failure fallback.
    return [...unique.values()];
  } catch { throw failure(); }
}
