import "fake-indexeddb/auto";
import { expect,it,vi } from "vitest";
import { openAiIntakeRuntime } from "./runtime";
import { PreviewRecipeLibrary } from "../preview-store";
it("App-lifespan runtime is reused with no bridge/key/network work during local startup",()=>{
  const store=new PreviewRecipeLibrary();const fetch=vi.spyOn(globalThis,"fetch");const one=openAiIntakeRuntime(store);expect(openAiIntakeRuntime(store)).toBe(one);expect(openAiIntakeRuntime(new PreviewRecipeLibrary())).not.toBe(one);expect(fetch).not.toHaveBeenCalled();expect(one.snapshot().operationId).toBeNull();
});
