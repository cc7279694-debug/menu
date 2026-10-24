// Browser QA only. No production module may import this file.
import { createRoot } from "react-dom/client";
import { LibraryApp } from "../../src/native/library-app";
import { PreviewRecipeLibrary } from "../../src/native/preview-store";
import { emptyDetails, type RecipeDetailsInput } from "../../src/native/recipe-model";
import { AiIntakeService } from "../../src/native/ai/service";
import type { AiBridge, AiKeyPort } from "../../src/native/ai/native-bridge";
import { LinkImportService } from "../../src/native/link-import/service";
import type { WebImportPort } from "../../src/native/link-import/contract";
import { FindRecipeService } from "../../src/native/find-recipe/service";
import { FinderError, type FinderPort, type RecipeCandidate } from "../../src/native/find-recipe/contract";
import { ShareTargetController } from "../../src/native/share-target/controller";
import type { ShareItem, SharePort, ShareReply } from "../../src/native/share-target/contract";

const title = "番茄炒蛋";
const sourceText = "番茄炒蛋，番茄2个，鸡蛋3个。番茄切块，鸡蛋打散。炒熟后拌匀。";
function output(recipeTitle = title) {
  return JSON.stringify({ recipe: { ...emptyDetails(recipeTitle), servings: 2,
    ingredients: [{ name: "番茄", amount: "2个" }, { name: "鸡蛋", amount: "3个" }],
    steps: [{ instruction: "番茄切块，鸡蛋打散。", imagePath: null }, { instruction: "炒熟后拌匀。", imagePath: null }] },
    fieldChecks: [{ path: "title", label: "菜名", status: "explicit", message: null },
      { path: "servings", label: "份数", status: "inferred", message: "来源未说明份数，请确认。" }], warnings: [] });
}
function thumbnail(index: number) {
  const canvas = document.createElement("canvas"); canvas.width = 480; canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = index % 2 ? "#e6e4cc" : "#eee5d5"; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = "#514b3e"; ctx.font = "26px sans-serif";
  ctx.fillText(`测试截图 ${index} · ${title}`, 30, 70);
  ctx.font = "22px sans-serif"; ctx.fillText("番茄 2个 / 鸡蛋 3个", 30, 135);
  ctx.fillText("切块、打散、炒熟后拌匀", 30, 185);
  return canvas.toDataURL("image/jpeg", .8);
}

export async function renderFixture(target: HTMLElement, options: { configured?: boolean; duplicate?: boolean } = {}) {
  const calls = { ai: 0, search: 0, extract: 0, read: 0, create: 0, keyWrites: 0,
    picks: 0, removals: 0, recoverIds: [] as string[], createdIds: [] as string[], extractedIds: [] as string[] };
  let loseAcknowledgement = false, failRead = false, configured = options.configured ?? true;
  // The real IndexedDB repository writes the recipe before the injected I/O error.
  class ObservedLibrary extends PreviewRecipeLibrary {
    override async createDetails(...args: Parameters<PreviewRecipeLibrary["createDetails"]>) {
      calls.create++; const saved = await super.createDetails(...args); calls.createdIds.push(saved.id);
      if (loseAcknowledgement) { loseAcknowledgement = false; failRead = true; throw new Error("QA lost acknowledgement"); }
      return saved;
    }
    override async getDetails(id: string) {
      calls.recoverIds.push(id);
      if (failRead) { failRead = false; throw new Error("QA one failed reconciliation read"); }
      return super.getDetails(id);
    }
  }
  const store = new ObservedLibrary();
  if (options.duplicate) await store.create(title);
  const keys: AiKeyPort = { hasAiKey: async () => ({ configured }),
    saveAiKey: async () => { calls.keyWrites++; configured = true; return { configured: true, cancelled: false }; },
    deleteAiKey: async () => { calls.keyWrites++; configured = false; } };
  const bridge: AiBridge = {
    createSession: async () => ({ operationId: crypto.randomUUID() }), discardSession: async () => {},
    cancel: async () => {}, cleanupExpired: async () => ({ pendingCleanup: false }),
    preflight: async () => ({ available: true, model: "qwen3.8-flash", region: "beijing" }),
    organize: async () => { calls.ai++; return { rawJson: output() }; },
    pickImage: async () => { calls.picks++; return { cancelled: false, image: {
      id: crypto.randomUUID(), mimeType: "image/jpeg", byteSize: 4096, width: 480, height: 320,
      // Generated browser-only media; never reads a local user's image or Native path.
      previewUri: thumbnail(calls.picks) } }; },
    removeImage: async () => { calls.removals++; },
  };
  const ai = new AiIntakeService(keys, bridge, { store });
  const web: WebImportPort = { read: async request => {
    calls.read++; const partial = request.url.includes("partial");
    const recipe = { "@context": "https://schema.org", "@type": "Recipe", name: title,
      recipeIngredient: ["番茄 2个", "鸡蛋 3个"],
      ...(partial ? {} : { recipeInstructions: [{ "@type": "HowToStep", text: "番茄切块，鸡蛋打散。" }, { "@type": "HowToStep", text: "炒熟后拌匀。" }], totalTime: "PT15M", recipeYield: "2份" }),
      image: "https://example.com/private-source-image.jpg" };
    return { finalUrl: request.url, contentType: "text/html", html: `<!doctype html><html><head><title>${title}</title><script type="application/ld+json">${JSON.stringify(recipe)}</script></head><body><h1>${title}</h1><p>${sourceText}</p></body></html>` };
  }, cancel: async () => {} };
  const link = new LinkImportService({ store, ai, port: web });
  const candidates: RecipeCandidate[] = ["家常快炒", "少油做法", "软嫩口感"].map((summary, index) => ({
    id: `qa-source-${index + 1}`, title: `${title} · ${summary}`, sourceUrl: `https://example.com/recipe-${index + 1}`,
    sourceHost: "example.com", summary, highlights: [index === 0 ? "分开炒制后拌匀" : "依照来源步骤调整火候"], totalMinutes: index === 0 ? 15 : null, preparationHint: "" }));
  const sessions = new Map<string, RecipeCandidate[]>();
  let finishExtract: (() => void) | null = null;
  const finderPort: FinderPort = {
    createSession: async () => ({ sessionId: crypto.randomUUID() }),
    search: async request => { calls.search++; sessions.set(request.sessionId, structuredClone(candidates)); return { candidates: structuredClone(candidates) }; },
    extract: async request => {
      calls.extract++; calls.extractedIds.push(request.candidateId);
      const selected = sessions.get(request.sessionId)?.find(candidate => candidate.id === request.candidateId);
      if (!selected) throw new FinderError("source_mismatch");
      // The real service enters extracting. Only the external I/O completion waits.
      await new Promise<void>(resolve => { finishExtract = resolve; });
      return { rawJson: output(), sourceText };
    }, cancel: async () => {}, discardSession: async request => { sessions.delete(request.sessionId); },
  };
  const finder = new FindRecipeService({ port: finderPort, ai });
  const queue: ShareItem[] = []; let available = () => {};
  const sharePort: SharePort = { consume: async (): Promise<ShareReply> => queue.shift() ?? { status: "empty" },
    listen: async listener => { available = listener; return () => { available = () => {}; }; },
    release: async () => {}, transferImages: async () => [] };
  const share = new ShareTargetController(sharePort);
  const root = createRoot(target);
  root.render(<LibraryApp store={store} ai={ai} aiKeys={keys} link={link} finder={finder} share={share} />);
  return {
    calls,
    snapshot: () => ({ ai: ai.snapshot(), link: link.snapshot(), finder: finder.snapshot(), share: share.snapshot() }),
    observeAi: ai.subscribe,
    recipes: async () => Promise.all((await store.list()).map(recipe => store.getDetails(recipe.id))),
    armUncertain: () => { loseAcknowledgement = true; },
    resolveExtract: () => { const resolve = finishExtract; finishExtract = null; if (!resolve) throw new Error("No pending extraction"); resolve(); },
    emitShare: () => { queue.push({ status: "text", id: crypto.randomUUID(), replaced: false, text: "另一份未处理的分享文字" }); available(); },
    assertServiceReviewGate: async () => {
      const draft = ai.snapshot().draft;
      if (!draft) throw new Error("Review is not open");
      try { await ai.save(draft.recipe as RecipeDetailsInput); } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "review_required") return true;
        throw error;
      }
      throw new Error("Service allowed save before confirmation");
    },
    unmount: () => root.unmount(),
  };
}
