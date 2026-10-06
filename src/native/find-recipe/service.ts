import type { AiIntakeService } from "../ai/service";
import type { BackupController } from "../backup/backup-controls";
import type { RecipeDetails, RecipeDetailsInput } from "../recipe-model";
import { FinderError, extractReplySchema, safeFinderError, searchInputSchema, searchReplySchema, type FinderPort, type RecipeCandidate } from "./contract";
export type FindState = { phase: "input" | "searching" | "results" | "extracting" | "preview" | "saving" | "uncertain" | "saved"; dish: string; preference: string; candidates: RecipeCandidate[]; selected: RecipeCandidate | null; error: FinderError | null; cancelling: boolean };
const initial = (): FindState => ({ phase: "input", dish: "", preference: "", candidates: [], selected: null, error: null, cancelling: false });
export class FindRecipeService {
  private state = initial();
  private listeners = new Set<() => void>();
  private generation = 0;
  private sessionId: string | null = null;
  private flight: { requestId: string; sessionId: string | null; generation: number; kind: "searching" | "extracting" } | null = null;
  private aiOwned = false;
  private saving: Promise<RecipeDetails> | null = null;
  private transitioning = false;
  private restoreBlocked = false;
  constructor(readonly dependencies: { port: FinderPort; ai: AiIntakeService; backup?: BackupController }) {
    const observe = () => {
      const phase = dependencies.backup?.getState().phase;
      const restoring = phase === "restoring" || phase === "uncertain";
      if (restoring && !this.restoreBlocked) {
        ++this.generation; const flight = this.flight, sessionId = this.sessionId;
        this.flight = null; this.sessionId = null;
        this.set(initial());
        if (flight?.sessionId) void dependencies.port.cancel({ sessionId: flight.sessionId, requestId: flight.requestId }).catch(() => {});
        if (sessionId) void dependencies.port.discardSession({ sessionId }).catch(() => {});
        if (this.aiOwned) void dependencies.ai.discard().catch(() => {}); this.aiOwned = false;
      }
      this.restoreBlocked = restoring;
    };
    dependencies.backup?.subscribe(observe); observe();
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: FindState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private blocked() { const phase = this.dependencies.backup?.getState().phase; return this.restoreBlocked || phase === "preview" || phase === "restoring" || phase === "uncertain"; }
  private idle() {
    if (this.state.phase === "uncertain") throw new FinderError("save_uncertain");
    if (this.blocked() || this.flight || this.state.cancelling || this.saving || this.transitioning) throw new FinderError("busy");
  }
  private current(generation: number) { if (generation !== this.generation || this.blocked()) throw new FinderError("stale_session"); }
  updateInput(dish: string, preference: string) { this.idle(); if (this.state.phase !== "input" && this.state.phase !== "saved") throw new FinderError("busy"); this.set({ ...initial(), dish, preference }); }
  async search(): Promise<void> {
    this.idle(); if (!["input", "results", "saved"].includes(this.state.phase)) throw new FinderError("busy");
    const checked = searchInputSchema.safeParse({ dish: this.state.dish, preference: this.state.preference });
    if (!checked.success) { const error = new FinderError("input_invalid"); this.set({ ...this.state, error }); throw error; }
    const flight = { requestId: crypto.randomUUID(), sessionId: this.sessionId, generation: ++this.generation, kind: "searching" as const };
    this.flight = flight; this.set({ ...initial(), ...checked.data, phase: "searching" });
    try {
      if (!flight.sessionId) {
        const { sessionId } = await this.dependencies.port.createSession();
        if (flight.generation !== this.generation || this.blocked()) { await this.dependencies.port.discardSession({ sessionId }); throw new FinderError("stale_session"); }
        flight.sessionId = sessionId; this.sessionId = sessionId;
      }
      this.current(flight.generation);
      const reply = searchReplySchema.safeParse(await this.dependencies.port.search({ sessionId: flight.sessionId, requestId: flight.requestId, ...checked.data }));
      this.current(flight.generation); if (!reply.success) throw new FinderError("invalid_output");
      this.set({ ...this.state, phase: "results", candidates: reply.data.candidates, error: null });
    } catch (error) { if (flight.generation !== this.generation) throw new FinderError("stale_session"); const safe = safeFinderError(error); this.set({ ...this.state, phase: "input", error: safe }); throw safe; }
    finally { if (this.flight === flight) this.flight = null; }
  }
  async extract(id: string): Promise<void> {
    this.idle(); const selected = this.state.candidates.find(c => c.id === id);
    if (this.state.phase !== "results" || !selected || !this.sessionId) throw new FinderError("stale_session");
    const ai = this.dependencies.ai.snapshot();
    if (!this.aiOwned && (ai.imageBusy || !["input", "error", "saved"].includes(ai.phase) || ai.draft || ai.input.text || ai.images.length || ai.input.imageIds.length)) throw new FinderError("busy");
    const flight = { requestId: crypto.randomUUID(), sessionId: this.sessionId, generation: ++this.generation, kind: "extracting" as const };
    this.flight = flight; this.set({ ...this.state, phase: "extracting", selected, error: null });
    try {
      const reply = extractReplySchema.safeParse(await this.dependencies.port.extract({ sessionId: flight.sessionId, requestId: flight.requestId, candidateId: selected.id }));
      this.current(flight.generation); if (!reply.success) throw new FinderError("invalid_output");
      // Source metadata is not an allowed Recipe field. Reject URL-bearing model
      // content before handing off; sourceText is used once, never retained.
      let decoded: unknown;
      try { decoded = JSON.parse(reply.data.rawJson); } catch { throw new FinderError("invalid_output"); }
      const decodedText = JSON.stringify(decoded);
      if (/https?:\/\//i.test(decodedText) || decodedText.toLowerCase().includes(selected.sourceHost.toLowerCase())) throw new FinderError("invalid_output");
      await this.dependencies.ai.discard(); this.current(flight.generation); this.aiOwned = true;
      await this.dependencies.ai.acceptExternalDraft(reply.data.rawJson, { text: reply.data.sourceText, hasImages: false }, () => flight.generation === this.generation && !this.blocked());
      this.current(flight.generation); this.set({ ...this.state, phase: "preview", error: null });
    } catch (error) { if (flight.generation !== this.generation) throw new FinderError("stale_session"); const safe = safeFinderError(error); this.set({ ...this.state, phase: "results", selected: null, error: safe }); throw safe; }
    finally { if (this.flight === flight) this.flight = null; }
  }
  async cancelRequest(): Promise<void> {
    const flight = this.flight; if (!flight) return;
    const generation = ++this.generation; this.flight = null; this.set({ ...this.state, cancelling: true });
    try { if (flight.sessionId) await this.dependencies.port.cancel({ sessionId: flight.sessionId, requestId: flight.requestId }); }
    finally { if (generation === this.generation) this.set({ ...this.state, phase: flight.kind === "searching" ? "input" : "results", selected: null, cancelling: false }); }
  }
  returnToInput() { this.idle(); if (this.state.phase !== "results") throw new FinderError("busy"); this.set({ ...this.state, phase: "input", selected: null, error: null }); }
  async returnToResults(): Promise<void> {
    this.idle(); if (this.state.phase !== "preview") throw new FinderError("busy");
    this.transitioning = true; const generation = ++this.generation;
    this.set({ ...this.state, cancelling: true });
    try {
      if (this.aiOwned) await this.dependencies.ai.discard(); this.current(generation);
      this.aiOwned = false; this.set({ ...this.state, phase: "results", selected: null, error: null, cancelling: false });
    } finally { this.transitioning = false; if (generation === this.generation && this.state.cancelling) this.set({ ...this.state, cancelling: false }); }
  }
  save(input: RecipeDetailsInput): Promise<RecipeDetails> {
    try { this.idle(); if (this.state.phase !== "preview" || !this.aiOwned) throw new FinderError("stale_session"); }
    catch (error) { return Promise.reject(error); }
    const generation = this.generation;
    const saving = this.dependencies.ai.save(input).then(async recipe => {
      this.current(generation); this.aiOwned = false; const sessionId = this.sessionId; this.sessionId = null;
      this.set({ ...initial(), phase: "saved" }); if (sessionId) await this.dependencies.port.discardSession({ sessionId }).catch(() => {}); return recipe;
    }).catch(error => { const safe = safeFinderError(error); if (generation === this.generation) this.set({ ...this.state, phase: safe.code === "save_uncertain" ? "uncertain" : "preview", error: safe }); throw safe; }).finally(() => { if (this.saving === saving) this.saving = null; });
    this.saving = saving; this.set({ ...this.state, phase: "saving" }); return saving;
  }
  async recoverSave(): Promise<RecipeDetails | null> {
    if (this.blocked() || this.state.phase !== "uncertain") throw new FinderError("busy");
    const generation = this.generation; const recipe = await this.dependencies.ai.recoverSave(); this.current(generation);
    if (recipe) { this.aiOwned = false; const sessionId = this.sessionId; this.sessionId = null; this.set({ ...initial(), phase: "saved" }); if (sessionId) await this.dependencies.port.discardSession({ sessionId }).catch(() => {}); }
    else this.set({ ...this.state, phase: "preview", error: null }); return recipe;
  }
  async discard(): Promise<void> {
    this.idle(); this.transitioning = true; const generation = ++this.generation, sessionId = this.sessionId; this.sessionId = null;
    try {
      if (this.aiOwned) await this.dependencies.ai.discard(); this.current(generation);
      this.aiOwned = false; this.set(initial());
      if (sessionId) await this.dependencies.port.discardSession({ sessionId });
    } finally { this.transitioning = false; }
  }
}
