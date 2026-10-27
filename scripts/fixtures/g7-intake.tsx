// Cloud browser QA only. Production code must never import this fixture.
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { LibraryApp } from "../../src/native/library-app";
import { PreviewRecipeLibrary } from "../../src/native/preview-store";
import { emptyDetails } from "../../src/native/recipe-model";
import { AiIntakeService } from "../../src/native/ai/service";
import type { AiBridge, AiKeyPort } from "../../src/native/ai/native-bridge";
import { LinkImportService } from "../../src/native/link-import/service";
import type { WebImportPort } from "../../src/native/link-import/contract";
import { FindRecipeService } from "../../src/native/find-recipe/service";
import { FinderError, type FinderPort, type RecipeCandidate } from "../../src/native/find-recipe/contract";

export const fixtureTitle = "G7 合成清汤";
export const fixtureSource = "G7 合成清汤。酱汁20毫升，另有酱汁适量。先焯水，再收汁。只供合成测试😊。";
function output() {
  return JSON.stringify({
    recipe: { ...emptyDetails(fixtureTitle),
      ingredients: [{ name: "酱汁", amount: "20 毫升" }, { name: "酱汁", amount: "" }],
      steps: [{ instruction: "先焯水", imagePath: null }, { instruction: "再收汁", imagePath: null }],
      keyTips: [{ instruction: "收汁时留意锅底", stepNumber: 2 }] },
    fieldChecks: [
      { path: "title", label: "菜名", status: "explicit", message: "原菜名有来源" },
      { path: "servings", label: "份数", status: "missing", message: "原文没有人数" },
      { path: "ingredients[0].amount", label: "第一条酱汁用量", status: "inferred", message: "原结果用量需检查" },
      { path: "ingredients[1].amount", label: "第二条酱汁用量", status: "missing", message: "原结果用量未填写" },
    ], warnings: ["本轮合成来源只用于界面与保存保护验证，仍需人工核对。"] });
}

async function generatedImage() {
  const canvas = document.createElement("canvas"); canvas.width = 480; canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Generated canvas unavailable");
  context.fillStyle = "#eee5d5"; context.fillRect(0, 0, 480, 320);
  context.fillStyle = "#514b3e"; context.font = "26px sans-serif";
  context.fillText("G7 合成本轮截图", 24, 64);
  context.font = "22px sans-serif"; context.fillText("酱汁 20 毫升 / 适量", 24, 128);
  context.fillText("先焯水，再收汁", 24, 188);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Generated image failed")), "image/jpeg", .8));
  return { blob, url: URL.createObjectURL(blob) };
}

export async function renderG7Fixture(target: HTMLElement, options: { duplicateTitle?: string } = {}) {
  const calls = { ai: 0, picks: 0, read: 0, search: 0, extract: 0, create: 0,
    titleChecks: [] as string[], createdIds: [] as string[], recoverIds: [] as string[] };
  let loseAcknowledgement = false, failReconciliation = false, failTitle = false;
  class ObservedLibrary extends PreviewRecipeLibrary {
    override async createDetails(...args: Parameters<PreviewRecipeLibrary["createDetails"]>) {
      calls.create++; const saved = await super.createDetails(...args); calls.createdIds.push(saved.id);
      if (loseAcknowledgement) { loseAcknowledgement = false; failReconciliation = true; throw new Error("Synthetic lost acknowledgement"); }
      return saved;
    }
    override async getDetails(id: string) {
      calls.recoverIds.push(id);
      if (failReconciliation) { failReconciliation = false; throw new Error("Synthetic failed first reconciliation"); }
      return super.getDetails(id);
    }
    override async hasExactTitle(title: string) {
      calls.titleChecks.push(title);
      if (failTitle) { failTitle = false; throw new Error("Synthetic title query failure"); }
      return super.hasExactTitle(title);
    }
  }
  const store = new ObservedLibrary();
  if (options.duplicateTitle) {
    await store.createDetails({ ...emptyDetails(options.duplicateTitle), notes: "Existing synthetic recipe must remain unchanged" });
    calls.create = 0; calls.createdIds = [];
  }
  const media = await generatedImage(), ownedPreviewUris = new Map<string, string>();
  const originalConvert = Capacitor.convertFileSrc;
  // Native converts registered file URIs into WebView URLs. The browser fixture
  // supplies this external media adapter for its own exact controlled URI only.
  // Metadata still passes the unchanged production URI/session validator.
  Capacitor.convertFileSrc = uri => ownedPreviewUris.get(uri) ?? originalConvert(uri);
  const keys: AiKeyPort = { hasAiKey: async () => ({ configured: true }),
    saveAiKey: async () => { throw new Error("QA must not write credentials"); },
    deleteAiKey: async () => { throw new Error("QA must not write credentials"); } };
  const bridge: AiBridge = {
    createSession: async () => ({ operationId: crypto.randomUUID() }), discardSession: async () => {},
    cancel: async () => {}, cleanupExpired: async () => ({ pendingCleanup: false }),
    preflight: async () => ({ available: true, model: "qwen3.8-flash", region: "beijing" }),
    organize: async () => { calls.ai++; return { rawJson: output() }; },
    pickImage: async ({ operationId }) => {
      calls.picks++; const id = crypto.randomUUID();
      const previewUri = `file:///data/user/0/app.recipio.local/cache/ai-import/${operationId}/${id}.jpg`;
      ownedPreviewUris.set(previewUri, media.url);
      return { cancelled: false, image: { id, previewUri, mimeType: "image/jpeg", byteSize: media.blob.size, width: 480, height: 320 } };
    }, removeImage: async () => {},
  };
  const ai = new AiIntakeService(keys, bridge, { store });
  const web: WebImportPort = {
    read: async request => {
      calls.read++;
      const recipe = { "@context": "https://schema.org", "@type": "Recipe", name: fixtureTitle,
        recipeIngredient: ["酱汁20毫升", "酱汁适量"], recipeInstructions: [
          { "@type": "HowToStep", text: "先焯水" }, { "@type": "HowToStep", text: "再收汁" }],
        image: "https://example.com/must-not-load.jpg" };
      return { finalUrl: request.url, contentType: "text/html", html: `<!doctype html><html><head><title>${fixtureTitle}</title><script type="application/ld+json">${JSON.stringify(recipe)}</script></head><body><h1>${fixtureTitle}</h1><p>${fixtureSource}</p></body></html>` };
    }, cancel: async () => {},
  };
  const link = new LinkImportService({ store, ai, port: web });
  const candidates: RecipeCandidate[] = ["家常快炒", "少油做法"].map((summary, index) => ({
    id: `g7-source-${index + 1}`, title: `${fixtureTitle} · ${summary}`, sourceUrl: `https://example.com/g7-${index + 1}`,
    sourceHost: "example.com", summary, highlights: ["合成来源摘要，不是逐字原文"], totalMinutes: null, preparationHint: "" }));
  const sessions = new Map<string, RecipeCandidate[]>();
  const port: FinderPort = {
    createSession: async () => ({ sessionId: crypto.randomUUID() }),
    search: async request => { calls.search++; sessions.set(request.sessionId, structuredClone(candidates)); return { candidates: structuredClone(candidates) }; },
    extract: async request => {
      calls.extract++;
      if (!sessions.get(request.sessionId)?.some(candidate => candidate.id === request.candidateId)) throw new FinderError("source_mismatch");
      return { rawJson: output(), sourceText: fixtureSource };
    }, cancel: async () => {}, discardSession: async request => { sessions.delete(request.sessionId); },
  };
  const finder = new FindRecipeService({ port, ai });
  const root = createRoot(target);
  root.render(<LibraryApp store={store} ai={ai} aiKeys={keys} link={link} finder={finder} />);
  return {
    calls,
    snapshot: () => ({ ai: ai.snapshot(), link: link.snapshot(), finder: finder.snapshot() }),
    recipes: async () => Promise.all((await store.list()).map(recipe => store.getDetails(recipe.id))),
    armUncertain: () => { loseAcknowledgement = true; },
    failNextTitleQuery: () => { failTitle = true; },
    unmount: () => { root.unmount(); Capacitor.convertFileSrc = originalConvert; URL.revokeObjectURL(media.url); },
  };
}
