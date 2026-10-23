import assert from "node:assert/strict";
import { build } from "vite";
import { fileURLToPath } from "node:url";

let checked = 0;
let sharedV2 = 0;
await build({
  configFile: fileURLToPath(new URL("../vite.native.config.mts", import.meta.url)),
  build: { write: false },
  plugins: [{
    name: "verify-production-v2-excludes-showcase-and-fixtures",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === "chunk");
      const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules));
      checked = modules.length;
      assert(checked > 100, "An empty graph is not proof of isolation");
      sharedV2 = modules.filter((id) => /[\\/]ui-v2[\\/]/.test(id)).length;
      assert(sharedV2 > 0, "G2 production must use the approved shared V2 presentation");
      assert.deepEqual(modules.filter((id) => /[\\/]showcase[\\/]|ui-v2-showcase|demo-data|\.test\.[cm]?[jt]sx?/.test(id)), []);
      assert.deepEqual(Object.keys(bundle).filter((name) => /cola-wings|cola-step|tomato-egg-soup|broccoli/.test(name)), []);
    },
  }],
});
assert(checked > 100, "Production graph inspection did not execute");
console.log(JSON.stringify({ result: "PASS", productionModuleCount: checked, sharedV2Modules: sharedV2, showcaseModules: 0, fixtureAssets: 0, write: false }));
