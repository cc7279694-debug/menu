import { BackupControls, type BackupController } from "../backup/backup-controls";
import { AiSettings } from "../ai/ai-settings";
import type { AiKeyPort } from "../ai/native-bridge";
import type { V2Theme } from "./appearance";
import { V2Button } from "./components";

const options = [
  { id: "warm-ivory", label: "Warm Ivory（暖米色）" },
  { id: "pure-glass", label: "Pure Glass（纯净白）" },
  { id: "soft-sage", label: "Soft Sage（淡绿色）" },
] as const;

/** Presentation only: existing backup and native key controls keep their owners. */
export function SettingsScreen({ theme, onTheme, persistenceWarning, backup, keys, onKeyChanged, returnAction }: {
  theme: V2Theme; onTheme: (theme: V2Theme) => void; backup?: BackupController;
  persistenceWarning?: string;
  keys: AiKeyPort; onKeyChanged: () => void;
  returnAction?: { label: string; onClick: () => void };
}) {
  return <main className="v2-settings" aria-label="设置">
    <header className="v2-settings-header"><h1 className="v2-page-title">设置</h1>
      {returnAction && <V2Button variant="secondary" onClick={returnAction.onClick}>{returnAction.label}</V2Button>}
    </header>
    <section className="v2-settings-group" aria-labelledby="settings-appearance">
      <h2 id="settings-appearance">外观</h2>
      <fieldset className="v2-settings-themes"><legend className="sr-only">外观主题</legend>
        {options.map(({ id, label }) => <label className="v2-settings-theme" key={id}>
          <span className="recipio-ui-v2 v2-settings-swatch" data-v2-theme={id} aria-hidden="true"><i /><i /></span>
          <span>{label}</span><input type="radio" name="recipio-theme" value={id} checked={theme === id}
            onClick={() => { if (theme === id) onTheme(id); }} onChange={() => onTheme(id)} />
        </label>)}
      </fieldset>
      <p className="v2-secondary">只改变显示外观，不影响菜谱和本轮草稿。</p>
      {persistenceWarning && <p className="v2-task-status" role="alert">{persistenceWarning}</p>}
    </section>
    <section className="v2-settings-group" aria-labelledby="settings-backup">
      <h2 id="settings-backup">数据与备份</h2>
      <p>无需登录，核心操作仅在本机完成。请定期导出完整备份。</p>
      <details className="v2-settings-privacy"><summary>本机数据与隐私说明</summary>
        <p>浏览器预览使用 IndexedDB，Android 使用 SQLite 和私有文件目录，两者数据不会自动同步。</p>
        <p>请勿清除浏览器数据或卸载应用来排查问题。图片读取失败不影响文字菜谱；移除图片后暂时保留本地文件，以保护修改历史中的引用。</p>
      </details>
      <BackupControls service={backup} appearance="v2" />
    </section>
    <section className="v2-settings-group" aria-labelledby="settings-ai"><h2 id="settings-ai">AI 设置</h2>
      <AiSettings keys={keys} onChanged={onKeyChanged} appearance="v2" />
    </section>
    <section className="v2-settings-group v2-settings-about" aria-labelledby="settings-about"><h2 id="settings-about">关于 / 版本</h2>
      <p>谱序 RECIPIO · 自己的做法，随时翻开</p>
      <dl><div><dt>版本</dt><dd>{import.meta.env.VITE_RECIPIO_VERSION || "开发预览"}</dd></div></dl>
      <p className="v2-secondary">本地优先，无需账户。联网整理始终由你明确发起。</p>
    </section>
  </main>;
}
