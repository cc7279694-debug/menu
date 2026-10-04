import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BackupService, BackupState } from "./service";
export type BackupController = Pick<
  BackupService,
  | "getState"
  | "subscribe"
  | "export"
  | "inspectRestore"
  | "confirmReplace"
  | "cancel"
>;
const idle: BackupState = { phase: "idle" };
const emptySubscribe = () => () => {};
const emptySnapshot = () => idle;
const busyPhases = new Set([
  "choosing",
  "preparing",
  "media",
  "writing",
  "validating",
  "restoring",
]);
export function backupBusy(state: BackupState) {
  return busyPhases.has(state.phase);
}
export function useBackupState(service?: BackupController) {
  return useSyncExternalStore(
    service?.subscribe ?? emptySubscribe,
    service?.getState ?? emptySnapshot,
    emptySnapshot,
  );
}
const labels = {
  choosing: "请选择设备本地文件位置…",
  preparing: "正在准备一致数据快照…",
  media: "正在校验并暂存图片…",
  writing: "正在写入备份并完整回读校验…",
  validating: "正在校验备份格式、引用与文件哈希…",
  restoring: "正在创建安全副本并替换数据，请勿清除应用数据…",
};
export function BackupControls({ service }: { service?: BackupController }) {
  const state = useBackupState(service);
  const [confirm, setConfirm] = useState(false);
  const busy = backupBusy(state);
  useEffect(() => {
    if (!service) return;
    const back = (event: Event) => {
      const s = service.getState();
      if (s.phase === "preview" || backupBusy(s) || s.phase === "uncertain") {
        event.preventDefault();
        if (s.phase === "preview") {
          setConfirm(false);
          void service.cancel();
        }
      }
    };
    window.addEventListener("recipio:back", back);
    return () => {
      window.removeEventListener("recipio:back", back);
      if (service.getState().phase === "preview") void service.cancel();
    };
  }, [service]);
  const manifest = state.manifest;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>数据与备份</h3>
        </CardTitle>
        <CardDescription>
          完整保留菜谱、烹饪记录、成品照片与修改历史中的旧图片。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          备份可能包含照片和个人备注，此备份未加密，请妥善保管。系统文件选择器请选设备本地位置，不要选云盘。
        </p>
        {!service ? (
          <p>
            完整备份与恢复请使用 Android 应用。浏览器预览不能代替原生 SQLite
            与系统文件验收。
          </p>
        ) : (
          <>
            {busy && (
              <p role="status" aria-live="polite">
                {labels[state.phase as keyof typeof labels]}
              </p>
            )}
            {state.phase === "preview" && manifest && (
              <section aria-label="恢复预览" className="flex flex-col gap-2">
                <h4 className="font-medium">备份已校验，图片已暂存</h4>
                <p>创建时间：{new Date(manifest.createdAt).toLocaleString()}</p>
                <p>
                  应用版本：{manifest.appVersionName}（{manifest.appVersionCode}
                  ） · 格式：v{manifest.formatVersion}
                </p>
                <p>
                  菜谱：{manifest.counts.recipes} · 食材：
                  {manifest.counts.ingredients} · 步骤：{manifest.counts.steps}
                </p>
                <p>
                  提前准备：{manifest.counts.preparations} · 关键事项：
                  {manifest.counts.keyTips} · 修改记录：
                  {manifest.counts.changes}
                </p>
                <p>
                  烹饪记录：
                  {"cookingRecords" in manifest.counts
                    ? manifest.counts.cookingRecords
                    : 0}
                  {manifest.formatVersion === 1 ? "（旧版无烹饪记录）" : ""}
                </p>
                <p>
                  图片：{manifest.counts.media} ·{" "}
                  {manifest.media
                    .reduce((n, m) => n + m.size, 0)
                    .toLocaleString()}{" "}
                  字节
                </p>
                <p>
                  恢复将替换当前设备上的 {state.currentCount}{" "}
                  道菜谱及关联记录，不会合并。
                </p>
                <p className="text-sm text-muted-foreground">
                  替换前会验证本机安全副本；安全副本不能防止卸载或清除应用数据。重要数据请先导出到外部位置。
                </p>
                {state.message && <p role="status">{state.message}</p>}
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="min-h-11"
                    variant="destructive"
                    onClick={() => setConfirm(true)}
                  >
                    恢复并替换当前数据
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="outline"
                    onClick={() => void service.cancel()}
                  >
                    取消恢复
                  </Button>
                </div>
              </section>
            )}
            {state.phase === "success" && (
              <p role="status">
                {state.mode === "restore"
                  ? "恢复成功，所有数据已提交。"
                  : "完整备份已保存并回读校验。"}
                {state.result && (
                  <span className="block break-all">
                    {state.result.fileName} ·{" "}
                    {state.result.size.toLocaleString()} 字节
                  </span>
                )}
              </p>
            )}
            {state.phase === "cancelled" && (
              <p role="status">操作已取消，当前数据未替换。</p>
            )}
            {(state.phase === "error" || state.phase === "uncertain") && (
              <p role="alert" className="break-words">
                {state.message}
              </p>
            )}
            {state.warning && <p role="status">{state.warning}</p>}
            <Dialog
              open={confirm && state.phase === "preview"}
              onOpenChange={setConfirm}
            >
              <DialogContent showCloseButton={false}>
                <DialogTitle>确认替换当前数据？</DialogTitle>
                <DialogDescription>
                  将用备份中的 {manifest?.counts.recipes ?? 0} 道菜谱替换当前{" "}
                  {state.currentCount ?? 0} 道菜谱及相关记录。不是合并操作。
                </DialogDescription>
                <DialogFooter>
                  <Button
                    className="min-h-11"
                    variant="outline"
                    onClick={() => setConfirm(false)}
                  >
                    返回检查
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="destructive"
                    onClick={() => {
                      setConfirm(false);
                      void service.confirmReplace();
                    }}
                  >
                    确认替换 {state.currentCount} 道菜谱
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
      {service && (
        <CardFooter className="flex flex-wrap gap-3">
          <Button
            className="min-h-11"
            disabled={
              busy || state.phase === "preview" || state.phase === "uncertain"
            }
            onClick={() => void service.export()}
          >
            导出完整备份
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={
              busy || state.phase === "preview" || state.phase === "uncertain"
            }
            onClick={() => void service.inspectRestore()}
          >
            导入并恢复
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
