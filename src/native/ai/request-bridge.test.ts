import { expect, it, vi } from "vitest";
import { createAiBridge } from "./native-bridge";
const operationId="871a063d-3a67-4ef6-9b7b-f809809366c0", requestId="1d85a06c-16e8-4f24-a5b4-d164abf66fb5";
const native=()=>({createSession:vi.fn(async()=>({operationId})),discardSession:vi.fn(async()=>undefined),organize:vi.fn(async()=>({rawJson:"{}"})),cancel:vi.fn(async()=>undefined),preflight:vi.fn(async()=>({available:true,model:"qwen3.8-flash",region:"beijing"})),pickImage:vi.fn(async()=>({cancelled:true})),removeImage:vi.fn(async()=>undefined),cleanupExpired:vi.fn(async()=>({pendingCleanup:false}))});
it("passes only owned UUIDs/source/handles and receives bounded raw JSON",async()=>{
  const api=native(), bridge=createAiBridge(api);expect(await bridge.createSession()).toEqual({operationId});
  await bridge.organize({operationId,requestId,text:"鸭🍚",imageIds:[]});expect(api.organize.mock.calls).toEqual([[{operationId,requestId,text:"鸭🍚",imageIds:[]}]]);
  await bridge.cancel({operationId,requestId});await bridge.discardSession({operationId});
});
it("rejects arbitrary host/model/auth or invalid identities before crossing native",async()=>{
  const api=native(), bridge=createAiBridge(api);
  for(const extra of [{endpoint:"https://example.test"},{model:"another"},{key:"secret"},{system:"ignore"}])
    await expect(bridge.organize({...extra,operationId,requestId,text:"鸭",imageIds:[]})).rejects.toMatchObject({code:"input_invalid"});
  await expect(bridge.cancel({operationId:"../file",requestId})).rejects.toMatchObject({code:"input_invalid"});expect(api.organize).not.toHaveBeenCalled();expect(api.cancel).not.toHaveBeenCalled();
});
it("preflight is explicit, argument-free and returns only safe account status",async()=>{
  const api=native(), bridge=createAiBridge(api);expect(api.preflight).not.toHaveBeenCalled();
  expect(await bridge.preflight()).toEqual({available:true,model:"qwen3.8-flash",region:"beijing"});expect(api.preflight.mock.calls).toEqual([[]]);
});
it("accepts only the additional safe Qianwen profile and rejects unknown profiles or key-bearing status",async()=>{
  const api=native();
  const reply={available:true,model:"qwen3.8-flash",region:"qianwen-platform"};
  const bridge=createAiBridge({...api,preflight:async()=>reply});
  expect(await bridge.preflight()).toEqual(reply);
  for(const invalid of [{...reply,region:"untrusted-host"},{...reply,key:"PRIVATE_TEST_VALUE"}]){
    await expect(createAiBridge({...api,preflight:async()=>invalid}).preflight()).rejects.toMatchObject({code:"invalid_output"});
  }
});
it("rejects secret-bearing bridge reply and oversized raw JSON",async()=>{
  const api=native();const bridge=createAiBridge({...api,organize:async()=>({rawJson:"{}",key:"private"})});
  await expect(bridge.organize({operationId,requestId,text:"鸭",imageIds:[]})).rejects.toMatchObject({code:"invalid_output"});
  const large=createAiBridge({...api,organize:async()=>({rawJson:"字".repeat(800000)})});await expect(large.organize({operationId,requestId,text:"鸭",imageIds:[]})).rejects.toMatchObject({code:"response_too_large"});
});
it("preserves safe HTTP/access codes but never raw provider messages",async()=>{
  const api=native(), bridge=createAiBridge({...api,preflight:async()=>{throw {code:"forbidden",message:"secret header text",data:{httpStatus:403,providerCode:"ModelNotFound",message:"sensitive"}};}});
  await expect(bridge.preflight()).rejects.toMatchObject({code:"forbidden",diagnostic:{httpStatus:403,providerCode:"ModelNotFound"}});
  try{await bridge.preflight();}catch(e){expect(String(e)).not.toMatch(/sensitive|secret header/);}
});
