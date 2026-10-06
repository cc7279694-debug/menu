import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { dnsWireQuery, parseDnsWire, resolveDoh, dohRequest } from "./doh-resolver.mjs";
import { publicAddresses, safeTarget } from "./douyin-probe.mjs";

const qA = "076578616d706c65036f72670000010001";
const qAAAA = "076578616d706c65036f726700001c0001";
const aReply = Buffer.from(`000081800001000100000000${qA}c00c000100010000003c000408080808`, "hex");
const aaaaReply = Buffer.from(`000081800001000100000000${qAAAA}c00c001c00010000003c001026064700470000000000000000001111`, "hex");
const emptyAAAA = Buffer.from(`000081800001000000000000${qAAAA}`, "hex");

// Catches wrong query type, unrelated/malformed answers, ignoring AAAA failure/private
// answers, system-DNS reuse, weak TLS, unbounded DoH responses and redirect following.
test("RFC8484 query encodes only the requested A or AAAA question", () => {
  assert.equal(dnsWireQuery("example.org", 1).toString("hex"), `000001000001000000000000${qA}`);
  assert.equal(dnsWireQuery("example.org", 28).toString("hex"), `000001000001000000000000${qAAAA}`);
  assert.throws(() => dnsWireQuery("example.org", 16));
  assert.throws(() => dnsWireQuery("example.org\n", 1));
});
test("wire parser reads compressed A and AAAA answers", () => {
  assert.deepEqual(parseDnsWire(aReply,"example.org",1), [{address:"8.8.8.8",family:4}]);
  assert.deepEqual(parseDnsWire(aaaaReply,"example.org",28), [{address:"2606:4700:4700:0:0:0:0:1111",family:6}]);
  assert.deepEqual(parseDnsWire(emptyAAAA,"example.org",28), []);
});
test("wire parser rejects truncation, wrong question, malformed pointers and DNS errors", () => {
  assert.throws(() => parseDnsWire(aReply.subarray(0,-1),"example.org",1));
  assert.throws(() => parseDnsWire(aReply,"other.example.org",1));
  assert.throws(() => parseDnsWire(aReply,"example.org",28));
  const selfPointer = Buffer.from(aReply); selfPointer.writeUInt16BE(0xc000 + 29,29);
  assert.throws(() => parseDnsWire(selfPointer,"example.org",1));
  const refused = Buffer.from(aReply); refused.writeUInt16BE(0x8185,2);
  assert.throws(() => parseDnsWire(refused,"example.org",1));
});
test("wire parser rejects high-bit labels instead of masking them into ASCII", () => {
  const reply = Buffer.from("00008180000100010000000007e5f8e1edf0ece5036f72670000010001c00c000100010000003c000408080808","hex");
  assert.throws(() => parseDnsWire(reply,"example.org",1), /dns_unavailable/);
});
test("only Answer-section records of the requested address type qualify", () => {
  const additionalOnly = Buffer.from("000081800001000000000002076578616d706c65036f72670000010001c00c000500010000003c000b056f74686572036f726700056f74686572036f726700000100010000003c000408080404","hex");
  const wrongType = Buffer.from("000081800001000100000000076578616d706c65036f72670000010001c00c001c00010000003c001026064700470000000000000000001111","hex");
  assert.throws(() => parseDnsWire(additionalOnly,"example.org",1), /dns_unavailable/);
  assert.throws(() => parseDnsWire(wrongType,"example.org",1), /dns_unavailable/);
});
test("valid Answer CNAME chains still resolve and preserve all target addresses", () => {
  const cname = Buffer.from("000081800001000200000000076578616d706c65036f72670000010001c00c000500010000003c000b056f74686572036f726700056f74686572036f726700000100010000003c000408080404","hex");
  assert.deepEqual(parseDnsWire(cname,"example.org",1),[{address:"8.8.4.4",family:4}]);
});
test("wire parser rejects circular and conflicting Answer CNAME chains", () => {
  const cyclic = Buffer.from("000081800001000300000000076578616d706c65036f72670000010001c00c000500010000000000070161036f7267000161036f72670000050001000000000002c00c0161036f7267000001000100000000000408080808","hex");
  const conflicting = Buffer.from(`000081800001000200000000${qA}c00c000500010000000000070161036f726700c00c000500010000000000070162036f726700`,"hex");
  assert.throws(() => parseDnsWire(cyclic,"example.org",1), /dns_unavailable/);
  assert.throws(() => parseDnsWire(conflicting,"example.org",1), /dns_unavailable/);
});
test("resolver waits for both A and AAAA instead of trusting the first public answer", async () => {
  const types = [];
  const addresses = await resolveDoh("example.org", {exchange:async (_host,type) => { types.push(type); return type === 1 ? aReply : aaaaReply; }});
  assert.deepEqual(types.sort((a,b) => a-b), [1,28]);
  assert.equal(addresses.length,2);
});
test("a failed AAAA lookup cannot silently fall back to an A-only connection", async () => {
  await assert.rejects(() => resolveDoh("example.org",{exchange:async (_host,type) => { if (type === 28) throw new Error("private raw error must not escape"); return aReply; }}), /dns_unavailable/);
});
test("any nonpublic A or AAAA answer blocks the whole host", async () => {
  assert.equal((await publicAddresses(safeTarget("https://example.org/"),host => resolveDoh(host,{exchange:async (_host,type) => type === 1 ? aReply : emptyAAAA}))).length,1);
  const privateReply = Buffer.from(aaaaReply); privateReply.fill(0, privateReply.length-16); privateReply[privateReply.length-16]=0xfc;
  await assert.rejects(() => publicAddresses(safeTarget("https://example.org/"),host => resolveDoh(host,{exchange:async (_host,type) => type === 1 ? aReply : privateReply})), /dns_blocked/);
});

function fakeHttps({status=200,mime="application/dns-message",bytes=aReply,error}={}) {
  const calls = [];
  const request = (url, options, callback) => {
    const req = new EventEmitter(); req.setTimeout = () => req;
    req.destroy = cause => queueMicrotask(() => req.emit("error",cause));
    req.end = body => {
      calls.push({url,options,body});
      queueMicrotask(() => {
        if (error) { req.emit("error",error); return; }
        const response = Readable.from([bytes]); response.statusCode=status; response.headers={"content-type":mime}; callback(response);
      });
    };
    return req;
  };
  return {request,calls};
}
test("DoH bootstrap pins official public IPs while preserving original TLS identity", async () => {
  const fake = fakeHttps();
  assert.deepEqual(await dohRequest("example.org",1,{request:fake.request}),aReply);
  const {url,options,body} = fake.calls[0];
  assert.equal(url.hostname,"dns.alidns.com"); assert.equal(url.pathname,"/dns-query");
  assert.equal(options.method,"POST"); assert.equal(options.servername,"dns.alidns.com");
  assert.equal(options.rejectUnauthorized,true);
  assert.equal(options.headers.Accept,"application/dns-message");
  assert.equal(body.toString("hex"),`000001000001000000000000${qA}`);
  const pinned = await new Promise((resolve,reject) => options.lookup("dns.alidns.com",{all:true},(err,value) => err ? reject(err) : resolve(value)));
  assert.deepEqual(pinned,[{address:"223.5.5.5",family:4},{address:"223.6.6.6",family:4}]);
  await assert.rejects(() => new Promise((resolve,reject) => options.lookup("unexpected.example.org",{all:true},err => err ? reject(err) : resolve())), /unbound_host/);
  assert.equal(options.headers.Cookie,undefined); assert.equal(options.headers.Authorization,undefined);
});
test("DoH response bounds, MIME and redirect status fail closed", async () => {
  await assert.rejects(() => dohRequest("example.org",1,{request:fakeHttps({bytes:Buffer.alloc(65536)}).request}), /dns_unavailable/);
  await assert.rejects(() => dohRequest("example.org",1,{request:fakeHttps({mime:"text/html"}).request}), /dns_unavailable/);
  await assert.rejects(() => dohRequest("example.org",1,{request:fakeHttps({status:302}).request}), /dns_unavailable/);
});
