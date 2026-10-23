import assert from "node:assert/strict";
import { build } from "vite";
import { fileURLToPath } from "node:url";

let checked = 0;
await build({
  configFile: fileURLToPath(new URL("../vite.native.config.mts", import.meta.url)),
  build: { write: false },
  plugins: [{
    name: "verify-ui-v2-is-not-in-production-apk-graph",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === "chunk");
      const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules));
      checked = modules.length;
      assert(checked > 100, "An empty graph is not proof of isolation");
      assert.deepEqual(modules.filter((id) => /[\\/]ui-v2[\\/]|ui-v2-showcase/.test(id)), []);
      assert.deepEqual(Object.keys(bundle).filter((name) => /cola-wings|cola-step|tomato-egg-soup|broccoli/.test(name)), []);
    },
  }],
});
assert(checked > 100, "Production graph inspection did not execute");
console.log(JSON.stringify({ result: "PASS", productionModuleCount: checked, uiV2Modules: 0, fixtureAssets: 0, write: false }));
