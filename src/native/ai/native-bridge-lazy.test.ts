import { expect, it, vi } from "vitest";
const register=vi.hoisted(()=>vi.fn(()=>{throw new Error("explicit AI bridge only");}));
vi.mock("@capacitor/core",()=>({Capacitor:{isNativePlatform:()=>false},registerPlugin:register}));
it("import and key-port construction do not register AI or block local initialization",async()=>{
  await expect(import("./native-bridge")).resolves.toBeDefined();
  const {createAiKeyPort}=await import("./native-bridge");createAiKeyPort();expect(register).not.toHaveBeenCalled();
});
it("unsupported browser action is rejected before any native registration",async()=>{
  const {createAiKeyPort}=await import("./native-bridge");
  await expect(createAiKeyPort().hasAiKey()).rejects.toMatchObject({code:"native_unavailable"});expect(register).not.toHaveBeenCalled();
});
