import type { RecipeDetails, RecipeDetailsInput, RecipeLibrary } from "../recipe-model";
import { recipeDetailsSchema } from "../recipe-model";
import { sameEditableDetails } from "../recipe-history";
import type { AiIntakeService } from "../ai/service";
import { safeAiError } from "../ai/native-bridge";
import type { BackupController } from "../backup/backup-controls";
import { LinkImportError, fetchedPageSchema, linkReadSchema, safeLinkError, type ParsedPage, type VisiblePageText, type WebImportPort } from "./contract";
import { parseRecipePage } from "./parser";
import { buildAiText, extractVisibleText } from "./visible-text";

type Phase = "input" | "reading" | "ready" | "ai-requesting" | "ai-preview" | "saving" | "uncertain" | "saved" | "error";
export type LinkImportState = { phase: Phase; url: string; parsed: ParsedPage | null; visible: VisiblePageText | null; selectedId: string | null; parserDraft: RecipeDetailsInput | null; error: Error | null };
const initial = (): LinkImportState => ({ phase: "input", url: "", parsed: null, visible: null, selectedId: null, parserDraft: null, error: null });
export class LinkImportService {
  private state = initial();
  private listeners = new Set<() => void>();
  private generation = 0;
  private requestId: string | null = null;
  private saveAttempt: { id: string; input: RecipeDetailsInput; generation: number } | null = null;
  private saving: Promise<RecipeDetails> | null = null;
  private aiOwned = false;
  private restoreBlocked = false;
  constructor(readonly dependencies: { store: RecipeLibrary; port: WebImportPort; ai: AiIntakeService; backup?: BackupController }) {
    const observeRestore = () => {
      const phase = dependencies.backup?.getState().phase;
      const blocked = phase === "restoring" || phase === "uncertain";
      if (blocked && !this.restoreBlocked) {
        ++this.generation; const id = this.requestId; this.requestId = null; this.saveAttempt = null;
        this.set(initial()); if (id) void dependencies.port.cancel(id).catch(() => {});
        if (this.aiOwned) void dependencies.ai.discard().catch(() => {}); this.aiOwned = false;
      }
      this.restoreBlocked = blocked;
    };
    dependencies.backup?.subscribe(observeRestore); observeRestore();
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: LinkImportState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private assertCurrent(generation: number) { if (generation !== this.generation || this.restoreBlocked) throw new LinkImportError("stale_session"); }
  private assertIdle() { if (this.restoreBlocked || ["reading", "ai-requesting", "saving", "uncertain"].includes(this.state.phase) || this.aiOwned && ["saving", "uncertain"].includes(this.dependencies.ai.snapshot().phase)) throw new LinkImportError(this.state.phase === "uncertain" ? "save_uncertain" : "busy"); }
  setUrl(url: string) { this.assertIdle(); this.set({ ...initial(), url }); }
  selected() { return this.state.parsed?.candidates.find(item => item.id === this.state.selectedId) ?? null; }
  select(id: string) {
    this.assertIdle(); if (!this.state.parsed?.candidates.some(item => item.id === id)) throw new LinkImportError("stale_session");
    this.set({ ...this.state, selectedId: id, parserDraft: null });
  }
  returnToResults() { this.assertIdle(); this.set({ ...this.state, phase: "ready", error: null }); }
  async read(url = this.state.url): Promise<void> {
    this.assertIdle(); const generation = ++this.generation, requestId = crypto.randomUUID();
    const checked = linkReadSchema.safeParse({ requestId, url: url.trim() });
    if (!checked.success) { const error = new LinkImportError("invalid_url"); this.set({ ...initial(), url, phase: "error", error }); throw error; }
    this.requestId = requestId; this.set({ ...initial(), url: checked.data.url, phase: "reading" });
    try {
      const result = fetchedPageSchema.safeParse(await this.dependencies.port.read(checked.data)); this.assertCurrent(generation);
      if (!result.success) throw new LinkImportError("page_unreadable");
      const parsed = parseRecipePage(result.data.html, result.data.finalUrl), visible = extractVisibleText(result.data.html);
      this.assertCurrent(generation);
      if (!parsed.candidates.length && !visible.text) throw new LinkImportError("page_unreadable");
      this.set({ ...this.state, phase: "ready", parsed, visible, selectedId: parsed.needsSelection ? null : parsed.candidates[0]?.id ?? null });
    } catch (error) {
      if (generation !== this.generation) throw new LinkImportError("stale_session");
      const safe = safeLinkError(error); this.set({ ...this.state, phase: "error", error: safe }); throw safe;
    } finally { if (this.requestId === requestId) this.requestId = null; }
  }
  async cancelRead(): Promise<void> {
    const requestId = this.requestId; if (!requestId) return;
    const generation = ++this.generation; this.requestId = null;
    try { await this.dependencies.port.cancel(requestId); } finally { if (generation === this.generation) this.set({ ...initial(), url: this.state.url }); }
  }
  async useAi(): Promise<void> {
    this.assertIdle(); const visible = this.state.visible; if (!visible?.text) throw new LinkImportError("page_unreadable");
    const generation = ++this.generation;
    const text = buildAiText(visible, this.selected()?.recipe ?? null);
    this.set({ ...this.state, phase: "ai-requesting", error: null });
    try {
      await this.dependencies.ai.discard(); this.assertCurrent(generation); this.aiOwned = true;
      await this.dependencies.ai.startSession(); this.assertCurrent(generation);
      await this.dependencies.ai.organize({ text, imageIds: [] }); this.assertCurrent(generation);
      this.set({ ...this.state, phase: "ai-preview", error: null });
    } catch (error) {
      this.assertCurrent(generation); const safe = safeAiError(error);
      const shown = safe.code === "key_missing" ? new LinkImportError("ai_key_missing") : safe;
      this.set({ ...this.state, phase: "ready", error: shown }); throw shown;
    }
  }
  private finish(recipe: RecipeDetails) {
    this.saveAttempt = null;
    if (this.aiOwned && this.dependencies.ai.snapshot().operationId) void this.dependencies.ai.discard().catch(() => {});
    this.aiOwned = false; this.set({ ...initial(), phase: "saved" }); return recipe;
  }
  saveParser(input: RecipeDetailsInput): Promise<RecipeDetails> {
    try {
      if (this.state.phase === "uncertain") throw new LinkImportError("save_uncertain");
      if (this.saving) {
        if (!this.saveAttempt || !sameEditableDetails(this.saveAttempt.input, input)) throw new LinkImportError("save_uncertain");
        return this.saving;
      }
      this.assertIdle(); if (!this.selected()) throw new LinkImportError("stale_session");
      const parsed = recipeDetailsSchema.parse(input);
      if (parsed.coverPath !== null || parsed.steps.some(step => step.imagePath !== null)) throw new LinkImportError("storage_error");
      const attempt = { id: crypto.randomUUID(), input: structuredClone(parsed), generation: this.generation };
      this.saveAttempt = attempt; this.set({ ...this.state, phase: "saving", parserDraft: attempt.input, error: null });
      const saving = this.commitParser(attempt).finally(() => { if (this.saving === saving) this.saving = null; });
      this.saving = saving; return saving;
    } catch (error) { return Promise.reject(error); }
  }
  private async commitParser(attempt: NonNullable<LinkImportService["saveAttempt"]>): Promise<RecipeDetails> {
    const assertCurrent = () => this.assertCurrent(attempt.generation);
    try { const saved = await this.dependencies.store.createDetails(attempt.input, attempt.id, assertCurrent); assertCurrent(); return this.finish(saved); }
    catch (error) {
      assertCurrent(); let existing: RecipeDetails | null;
      try { existing = await this.dependencies.store.getDetails(attempt.id); assertCurrent(); }
      catch { assertCurrent(); const safe = new LinkImportError("save_uncertain"); this.set({ ...this.state, phase: "uncertain", error: safe }); throw safe; }
      if (existing && sameEditableDetails(existing, attempt.input)) return this.finish(existing);
      const safe = new LinkImportError(existing ? "save_uncertain" : "storage_error");
      if (!existing) this.saveAttempt = null;
      this.set({ ...this.state, phase: existing ? "uncertain" : "ready", error: safe });
      // Raw database/source exceptions never reach the UI.
      void error; throw safe;
    }
  }
  async saveAi(input: RecipeDetailsInput): Promise<RecipeDetails> {
    if (this.state.phase !== "ai-preview") throw new LinkImportError("stale_session");
    const generation = this.generation;
    const saved = await this.dependencies.ai.save(input); this.assertCurrent(generation);
    return this.finish(saved);
  }
  async recoverSave(): Promise<RecipeDetails | null> {
    if (this.dependencies.ai.snapshot().phase === "uncertain") { const generation = this.generation; const saved = await this.dependencies.ai.recoverSave(); this.assertCurrent(generation); return saved ? this.finish(saved) : null; }
    const attempt = this.saveAttempt; if (!attempt || this.state.phase !== "uncertain") throw new LinkImportError("stale_session");
    this.assertCurrent(attempt.generation);
    let saved: RecipeDetails | null;
    try { saved = await this.dependencies.store.getDetails(attempt.id); } catch { throw new LinkImportError("save_uncertain"); }
    this.assertCurrent(attempt.generation);
    if (saved && !sameEditableDetails(saved, attempt.input)) throw new LinkImportError("save_uncertain");
    if (saved) return this.finish(saved);
    this.saveAttempt = null; this.set({ ...this.state, phase: "ready", error: null }); return null;
  }
  async discard(): Promise<void> {
    if (this.saving || this.state.phase === "uncertain" || this.dependencies.ai.snapshot().phase === "uncertain") throw new LinkImportError("save_uncertain");
    ++this.generation; const id = this.requestId; this.requestId = null; const owned = this.aiOwned; this.aiOwned = false;
    this.set(initial());
    try { if (id) await this.dependencies.port.cancel(id); }
    finally { if (owned) await this.dependencies.ai.discard(); }
  }
}
