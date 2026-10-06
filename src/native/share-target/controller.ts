import type { ShareItem, SharePort } from "./contract";

type State = { pending: ShareItem | null; deferred: boolean; replaced: boolean; unavailable: boolean };
/** Native owns unread receipts; this owns consumed receipts until opened/ignored. */
export class ShareTargetController {
  private state: State = { pending: null, deferred: false, replaced: false, unavailable: false };
  private listeners = new Set<() => void>();
  private seen = new Set<string>();
  private users = 0;
  private generation = 0;
  private detach: (() => void) | null = null;
  private attaching: number | null = null;
  private draining = false;
  private again = false;
  constructor(private readonly port: SharePort) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(state: State) { this.state = state; this.listeners.forEach(fn => fn()); }
  start = () => {
    if (++this.users === 1) {
      ++this.generation; this.attach();
    }
    let stopped = false;
    return () => {
      if (stopped) return; stopped = true;
      if (--this.users === 0) { ++this.generation; this.detach?.(); this.detach = null; }
    };
  };
  private attach() {
    if (!this.users || this.detach || this.attaching === this.generation) return;
    const generation = this.generation; this.attaching = generation;
    void this.port.listen(this.requestDrain).then(detach => {
      if (!this.users || generation !== this.generation) { detach(); return; }
      this.detach = detach; this.requestDrain();
    }).catch(() => { if (generation === this.generation) this.set({ ...this.state, unavailable: true }); })
      .finally(() => { if (this.attaching === generation) this.attaching = null; });
  }
  retry = () => { if (this.detach) this.requestDrain(); else this.attach(); };
  private requestDrain = () => { this.again = true; if (!this.draining && this.users) void this.drain(); };
  private async drain() {
    this.draining = true;
    try {
      do {
        this.again = false;
        const reply = await this.port.consume();
        if (reply.status !== "empty") {
          if (!this.seen.has(reply.id)) {
            this.seen.add(reply.id);
            if (this.seen.size > 32) this.seen.delete(this.seen.values().next().value!);
            this.set({ pending: reply, deferred: false, replaced: reply.replaced || !!this.state.pending, unavailable: false });
          }
          this.again = true;
        } else if (this.state.unavailable) this.set({ ...this.state, unavailable: false });
      } while (this.again && this.users);
    } catch { this.set({ ...this.state, unavailable: true }); }
    finally { this.draining = false; }
  }
  defer(id: string) { if (this.state.pending?.id === id && !this.state.deferred) this.set({ ...this.state, deferred: true }); }
  complete(id: string) { if (this.state.pending?.id === id) this.set({ ...this.state, pending: null, deferred: false, replaced: false }); }
}
