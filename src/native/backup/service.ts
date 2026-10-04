import type { BackupData, BackupManifest } from "./format";
import { validateBackupData } from "./format";
import type { ArchivePort, ExportResult } from "./native-archive";
import { collectImageReferences, fromPortableData, toPortableData } from "./references";
import type { BackupRepository, RestoreCommit } from "./repository";

export type BackupPhase = "idle" | "choosing" | "preparing" | "media" | "writing" | "validating" | "preview" | "restoring" | "success" | "cancelled" | "error" | "uncertain";
export type BackupState = { phase: BackupPhase; mode?: "export" | "restore"; manifest?: BackupManifest; currentCount?: number; result?: ExportResult; message?: string; warning?: string };
type Prepared = { token: string; generationId: string; data: BackupData; manifest: BackupManifest; paths: Record<string,string>; currentCount: number };
const message = (error: unknown) => error instanceof Error ? error.message : "备份操作失败，请检查文件和设备空间";
export class BackupService {
  private state: BackupState = { phase: "idle" };
  private listeners = new Set<() => void>();
  private running = false;
  private prepared: Prepared | null = null;
  private token: string | null = null;
  constructor(private readonly repository: BackupRepository, private readonly archive: ArchivePort, private readonly clock = () => new Date()) {}
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: BackupState) { this.state = state; this.listeners.forEach(l => l()); }
  private canBegin() { return !this.running && !this.prepared && this.state.phase !== "uncertain"; }
  private async discard() { if (this.token) await this.archive.discard(this.token); this.token = null; this.prepared = null; }
  private async fail(error: unknown) {
    let warning: string | undefined;
    try { await this.discard(); } catch (cleanup) { warning = `清理提示：${message(cleanup)} 原数据与安全文件保留，请重新打开应用核查。`; }
    this.set({ phase: "error", message: message(error), warning });
  }
  async export() {
    if (!this.canBegin()) return; this.running = true;
    try {
      this.set({ phase: "choosing", mode: "export" });
      const choice = await this.archive.chooseExport(`recipio-backup-${this.clock().toISOString().replace(/[:.]/g,"-")}.recipio`);
      if ("cancelled" in choice) { this.set({ phase: "cancelled" }); return; }
      this.token = choice.token;
      this.set({ phase: "preparing", mode: "export" }); const source = await this.repository.snapshot();
      this.set({ phase: "media", mode: "export" }); const assets = await this.archive.inspectMedia(choice.token, collectImageReferences(source));
      const data = toPortableData(source, assets);
      this.set({ phase: "writing", mode: "export" }); const result = await this.archive.writeExport(choice.token, data, source.sourceSchemaVersion);
      validateBackupData(data, result.manifest);
      let warning: string | undefined; try { await this.discard(); } catch { warning = "备份已完成并回读校验；内部临时文件待下次启动清理。"; }
      this.set({ phase: "success", mode: "export", result, manifest: result.manifest, warning });
    } catch (error) { await this.fail(error); } finally { this.running = false; }
  }
  async inspectRestore() {
    if (!this.canBegin()) return; this.running = true;
    try {
      this.set({ phase: "choosing", mode: "restore" }); const chosen = await this.archive.chooseRestore();
      if ("cancelled" in chosen) { this.set({ phase: "cancelled" }); return; }
      this.token = chosen.token; this.set({ phase: "validating", mode: "restore" });
      const checked = validateBackupData(chosen.data, chosen.manifest);
      this.set({ phase: "media", mode: "restore" }); const staged = await this.archive.stageMedia(chosen.token);
      // Complete and verify staging before confirmation. UI cannot supply file paths.
      const mapped = fromPortableData(checked.data, staged.paths); await this.archive.verifyPaths(collectImageReferences(mapped));
      const current = await this.repository.snapshot();
      this.prepared = { ...checked, ...staged, token: chosen.token, currentCount: current.recipes.length };
      this.set({ phase: "preview", mode: "restore", manifest: checked.manifest, currentCount: current.recipes.length });
    } catch (error) { await this.fail(error); } finally { this.running = false; }
  }
  async cancel() {
    if (this.running || this.state.phase === "uncertain") return;
    this.running = true; try { await this.discard(); this.set({ phase: "cancelled" }); }
    catch (error) { this.set({ phase: "error", message: message(error), warning: "尚未提交恢复，原库未替换；请重启核查暂存。" }); }
    finally { this.running = false; }
  }
  async confirmReplace() {
    if (this.running || !this.prepared || this.state.phase !== "preview") return;
    this.running = true; const p = this.prepared;
    try {
      await this.repository.exclusive(async locked => {
        const current = await locked.snapshot();
        if (current.recipes.length !== p.currentCount) {
          p.currentCount = current.recipes.length;
          this.set({ phase: "preview", mode: "restore", manifest: p.manifest, currentCount: p.currentCount, message: "当前菜谱数量已变化，请再次确认替换。" }); return;
        }
        this.set({ phase: "restoring", mode: "restore", manifest: p.manifest, currentCount: p.currentCount });
        // Immutable new media already exists; keep full current/history image safety copy.
        const assets = await this.archive.inspectMedia(p.token, collectImageReferences(current));
        const paths = Object.fromEntries(assets.map(a => [a.assetId,a.sourcePath]));
        await this.archive.createSafetySnapshot(p.token, toPortableData(current, assets), paths, current.sourceSchemaVersion);
        await this.archive.verifyPaths(collectImageReferences(fromPortableData(p.data,p.paths)));
        await this.archive.writeJournal(p.token,"committing",p.manifest.dataFile.sha256,p.generationId);
        const commit: RestoreCommit = { operationId: p.token, generationId: p.generationId, dataSha256: p.manifest.dataFile.sha256, committedAt: this.clock().toISOString() };
        try { await locked.replace(fromPortableData(p.data,p.paths),commit); }
        catch (error) {
          let fact: RestoreCommit | null;
          try { fact = await locked.readRestoreCommit(); }
          catch { this.set({ phase: "uncertain", mode: "restore", message: "无法确认恢复提交状态。所有图片和安全副本已保留，请重启核查；不要清除数据或再次恢复。" }); return; }
          if (fact?.operationId !== commit.operationId || fact.generationId !== commit.generationId || fact.dataSha256 !== commit.dataSha256) throw error;
        }
        let warning: string | undefined;
        try { await this.archive.finishOperation(p.token,true); this.token = null; }
        catch { warning = "数据已完整恢复，暂存清理待下次启动核查。安全副本和旧图片仍在本机。"; }
        this.prepared = null;
        this.set({ phase: "success", mode: "restore", manifest: p.manifest, warning });
      });
    } catch (error) { await this.fail(error); } finally { this.running = false; }
  }
}
