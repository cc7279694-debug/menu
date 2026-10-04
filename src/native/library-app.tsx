import { useEffect, useRef, useState } from "react";
import { BookOpen, House, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type RecipeDetails,
  type RecipeDetailsInput,
  type RecipeLibrary,
  type DurationFilter,
  type RecipeListItem,
} from "./recipe-model";
import { RecipeEditor } from "./recipe-editor";
import { RecipeDetail } from "./recipe-detail";
import { LocalImage } from "./local-image";
import {
  BackupControls,
  backupBusy,
  useBackupState,
  type BackupController,
} from "./backup/backup-controls";
import { StepViewer } from "./step-viewer";
import { RecipeChangeHistory } from "./recipe-change-history";
import { CookingCompletion } from "./cooking-completion";
import type { CookingRecord, CookingRecordExtras } from "./cooking-model";
import { CookingHistory, CookingOverview } from "./cooking-history";
import { AiSettings } from "./ai/ai-settings";
import type { AiKeyPort } from "./ai/native-bridge";

type View =
  | "home"
  | "library"
  | "settings"
  | "new"
  | "detail"
  | "edit"
  | "changes"
  | "completion"
  | "history";
export function LibraryApp({
  store,
  backup,
  aiKeys,
}: {
  store: RecipeLibrary;
  backup?: BackupController;
  aiKeys?: AiKeyPort;
}) {
  const backupState = useBackupState(backup);
  const restored = useRef<unknown>(null);
  const [view, setView] = useState<View>("home");
  const [returnView, setReturnView] = useState<"home" | "library">("home");
  const [records, setRecords] = useState<RecipeListItem[]>([]);
  const [selected, setSelected] = useState<RecipeDetails | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DurationFilter>("all");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [viewer, setViewer] = useState<{
    mode: "focus" | "guided";
    index: number;
  } | null>(null);
  const detailReturn = useRef<{ scroll: number; trigger: HTMLElement | null }>({
    scroll: 0,
    trigger: null,
  });
  const [cookingRecord, setCookingRecord] = useState<CookingRecord | null>(
    null,
  );
  const completionAttempt = useRef<{ recipeId: string; id: string } | null>(
    null,
  );
  const [pending, setPending] = useState<
    Array<{ id: string; title: string; expires: number }>
  >([]);
  useEffect(() => {
    if (
      backupState.phase === "success" &&
      backupState.mode === "restore" &&
      restored.current !== backupState
    ) {
      restored.current = backupState;
      setSelected(null);
      setViewer(null);
      setCookingRecord(null);
      completionAttempt.current = null;
      setPending([]);
      setSearch("");
      setPage(0);
      setFilter("all");
      setRevision((n) => n + 1);
    }
  }, [backupState]);
  useEffect(() => {
    if (view !== "home" && view !== "library") return;
    let alive = true;
    setLoading(true);
    store
      .list(search, 100, page * 100, view === "library" ? filter : "all")
      .then((r) => {
        if (alive) setRecords(r);
      })
      .catch(() => {
        if (alive) setError("无法读取本地菜谱，请重试，不要清除数据。");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [store, search, page, filter, revision, view]);
  useEffect(() => {
    if (!pending.length) return;
    const timer = setTimeout(
      () => {
        void store
          .purgeExpired()
          .then((result) => {
            if (result.cleanupWarning) setError(result.cleanupWarning);
            setPending((p) => p.filter((r) => r.expires > Date.now()));
          })
          .catch(() => {
            setError("删除清理尚未完成，重试时会继续处理。");
            setPending([]);
          });
      },
      Math.max(1, Math.min(...pending.map((p) => p.expires)) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [store, pending]);
  async function work(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "本地操作失败，请重试");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function open(id: string) {
    let recipe: RecipeDetails | null = null;
    const origin = view === "library" ? "library" : "home";
    await work(async () => {
      const r = await store.getDetails(id);
      if (!r) throw new Error("菜谱已删除或不存在");
      recipe = r;
    });
    // Never render the destination while its transient read lock still blocks Back.
    if (recipe) {
      setSelected(recipe);
      setReturnView(origin);
      setView("detail");
      window.scrollTo(0, 0);
    }
  }
  function showViewer(
    mode: "focus" | "guided",
    index: number,
    trigger: HTMLElement,
  ) {
    if (!selected?.steps.length || lock.current) return;
    detailReturn.current = { scroll: window.scrollY, trigger };
    setViewer({ mode, index });
  }
  function closeViewer() {
    setViewer(null);
    const { scroll, trigger } = detailReturn.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, scroll);
      trigger?.focus({ preventScroll: true });
    });
  }
  async function complete() {
    if (!selected || lock.current) return;
    const recipeId = selected.id;
    if (completionAttempt.current?.recipeId !== recipeId)
      completionAttempt.current = { recipeId, id: crypto.randomUUID() };
    const attempt = completionAttempt.current;
    let record: CookingRecord | null = null;
    await work(async () => {
      record = await store.recordCooking(recipeId, attempt.id);
    });
    if (record) {
      setCookingRecord(record);
      setViewer(null);
      setView("completion");
      window.scrollTo(0, 0);
    }
  }
  function finishCompletion(next: "detail" | "edit" = "detail") {
    setCookingRecord(null);
    completionAttempt.current = null;
    setView(next);
    setRevision((n) => n + 1);
    window.scrollTo(0, 0);
  }
  async function updateCompletion(extras: CookingRecordExtras) {
    if (!cookingRecord) throw new Error("做菜记录已关闭，请重新打开");
    const saved = await store.updateCookingRecord(cookingRecord.id, extras);
    setCookingRecord(saved);
    setRevision((n) => n + 1);
    return saved;
  }
  async function setCompletionCover() {
    if (!cookingRecord) throw new Error("做菜记录已关闭，请重新打开");
    const saved = await store.setCookingPhotoAsCover(cookingRecord.id);
    setSelected(saved);
    setRevision((n) => n + 1);
    return saved;
  }
  async function remove() {
    if (!selected) return;
    await work(async () => {
      const expires = await store.remove(selected.id);
      setPending((p) => [
        ...p,
        { id: selected.id, title: selected.title, expires },
      ]);
      setSelected(null);
      setView(returnView);
    });
  }
  async function save(value: RecipeDetailsInput) {
    setError("");
    const saved = selected
      ? (await store.saveDetails(selected.id, value),
        await store.getDetails(selected.id))
      : await store.createDetails(value);
    if (!saved) throw new Error("保存后无法读取菜谱，请重试");
    setSelected(saved);
    setRevision((n) => n + 1);
    setView("detail");
    window.scrollTo(0, 0);
  }
  async function navigate(next: "home" | "library" | "settings") {
    if (
      lock.current ||
      backupBusy(backupState) ||
      backupState.phase === "uncertain"
    )
      return;
    if (backupState.phase === "preview") await backup?.cancel();
    setView(next);
    setPage(0);
    setSearch("");
    setError("");
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      if (backupBusy(backupState) || backupState.phase === "uncertain") {
        event.preventDefault();
        return;
      }
      if (viewer) {
        event.preventDefault();
        if (!lock.current) closeViewer();
        return;
      }
      // The editor owns its dirty/busy guard. Root pages may go to background.
      if (
        view === "new" ||
        view === "edit" ||
        view === "home" ||
        view === "completion" ||
        view === "history"
      )
        return;
      event.preventDefault();
      if (lock.current) return;
      if (view === "detail") setView(returnView);
      else if (view === "changes") setView("detail");
      else {
        setView("home");
        setPage(0);
        setSearch("");
        setError("");
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  }, [view, returnView, backupState, viewer]);
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-28 pt-5 sm:px-8">
      <header className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="./icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <div>
            <h1 className="text-lg font-semibold">谱序 RECIPIO</h1>
            <p className="text-xs text-muted-foreground">
              自己的做法，随时翻开
            </p>
          </div>
        </div>
        {(view === "home" || view === "library") && (
          <Button
            size="icon"
            className="h-11 w-11"
            aria-label="新增菜谱"
            onClick={() => {
              setSelected(null);
              setReturnView(view);
              setView("new");
            }}
          >
            <Plus size={22} />
          </Button>
        )}
      </header>
      {error && (
        <div role="alert" className="mb-5 rounded-xl border p-4">
          <p>{error}</p>
          <Button
            variant="outline"
            className="mt-2"
            disabled={busy}
            onClick={() => void work(() => store.purgeExpired())}
          >
            重试
          </Button>
        </div>
      )}
      {view === "new" || view === "edit" ? (
        <RecipeEditor
          key={selected?.id ?? "new"}
          initial={view === "edit" && selected ? selected : undefined}
          onSave={save}
          onCancel={() => setView(selected ? "detail" : returnView)}
        />
      ) : view === "history" && selected ? (
        <CookingHistory
          recipeId={selected.id}
          store={store}
          onBack={() => setView("detail")}
          onChanged={() => setRevision((n) => n + 1)}
        />
      ) : view === "completion" && cookingRecord ? (
        <CookingCompletion
          key={cookingRecord.id}
          record={cookingRecord}
          onUpdate={updateCompletion}
          onSetCover={setCompletionCover}
          onDone={() => finishCompletion()}
          onAdjust={() => finishCompletion("edit")}
        />
      ) : view === "changes" && selected ? (
        <RecipeChangeHistory
          recipeId={selected.id}
          store={store}
          onBack={() => setView("detail")}
        />
      ) : view === "detail" && selected ? (
        <div hidden={!!viewer}>
          <RecipeDetail
            recipe={selected}
            onEdit={() => {
              if (!lock.current) setView("edit");
            }}
            onBack={() => {
              if (!lock.current) setView(returnView);
            }}
            onDelete={() => void remove()}
            onFocus={(index, trigger) => showViewer("focus", index, trigger)}
            onGuided={(trigger) => showViewer("guided", 0, trigger)}
            onComplete={() => void complete()}
            completing={busy}
          />
          <CookingOverview
            recipeId={selected.id}
            store={store}
            revision={revision}
            disabled={busy}
            onHistory={() => {
              if (!lock.current) setView("history");
            }}
          />
          <Button
            variant="outline"
            className="mt-5 min-h-11"
            disabled={busy}
            onClick={() => {
              if (!lock.current) setView("changes");
            }}
          >
            查看修改记录
          </Button>
        </div>
      ) : view === "settings" ? (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">设置</h2>
          <div className="rounded-2xl border p-5 space-y-3">
            <h3 className="font-medium">本机数据</h3>
            <p className="text-sm text-muted-foreground">
              无需登录，核心操作不上传、不联网。浏览器预览使用
              IndexedDB，Android 使用 SQLite
              和私有文件目录，两者数据不会自动同步。
            </p>
            <p className="text-sm text-muted-foreground">
              请定期导出完整备份。请勿清除浏览器数据或卸载应用来排查问题。
            </p>
            <p className="text-xs text-muted-foreground">
              图片读取失败不影响文字菜谱；暂时保留移除图片的本地文件，以保护历史引用。
            </p>
          </div>
          <BackupControls service={backup} />
          <AiSettings keys={aiKeys} onChanged={() => {}} />
        </section>
      ) : (
        <>
          <h2 className="mb-4 text-2xl font-semibold">
            {view === "home" ? "今天想做什么？" : "我的菜谱"}
          </h2>
          <label className="block">
            <span className="sr-only">搜索菜名或食材</span>
            <Input
              className="min-h-12"
              placeholder="搜索菜名或食材"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {view === "library" && (
            <label className="mt-4 flex items-center gap-3 text-sm">
              耗时筛选
              <select
                aria-label="耗时筛选"
                className="min-h-11 rounded-lg border bg-background px-3"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as DurationFilter);
                  setPage(0);
                }}
              >
                <option value="all">全部</option>
                <option value="short">30 分钟内</option>
                <option value="medium">超过 30 至 60 分钟</option>
                <option value="long">超过 60 分钟</option>
              </select>
            </label>
          )}
          <h3 className="mb-4 mt-6 text-sm text-muted-foreground">
            {search ? "搜索结果" : view === "home" ? "最近加入" : "全部菜谱"}
          </h3>
          {loading && !records.length ? (
            <p role="status">正在读取本地菜谱…</p>
          ) : !records.length ? (
            <section className="rounded-2xl border border-dashed px-5 py-12 text-center">
              <BookOpen className="mx-auto mb-4 text-muted-foreground" />
              <p>
                {search || filter !== "all"
                  ? "没有符合条件的菜谱"
                  : "先记下第一道想做的菜"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                只记菜名也可以，以后再完善。
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSelected(null);
                  setView("new");
                }}
              >
                记下一个菜名
              </Button>
            </section>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-2xl border bg-card"
                >
                  <button
                    className="block w-full text-left disabled:opacity-60"
                    aria-label={`打开 ${r.title}`}
                    disabled={busy}
                    onClick={() => void open(r.id)}
                  >
                    <LocalImage
                      path={r.coverPath}
                      alt={`${r.title} 封面`}
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="break-words font-semibold">{r.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {r.totalMinutes == null
                          ? "耗时未记录"
                          : `${r.totalMinutes} 分钟`}
                        {view === "home" && r.caloriesPerServing != null
                          ? ` · 约 ${r.caloriesPerServing} kcal/份`
                          : ""}
                      </p>
                      {view === "home" && r.preparationHint && (
                        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                          提前准备：{r.preparationHint}
                        </p>
                      )}
                      {view === "home" && r.lastCookedAt && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          上次做过：{new Date(r.lastCookedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex gap-3">
            {page > 0 && (
              <Button variant="outline" onClick={() => setPage((n) => n - 1)}>
                上一页
              </Button>
            )}
            {records.length === 100 && (
              <Button variant="outline" onClick={() => setPage((n) => n + 1)}>
                下一页
              </Button>
            )}
          </div>
        </>
      )}
      {viewer && selected && (
        <StepViewer
          recipe={selected}
          mode={viewer.mode}
          initialIndex={viewer.index}
          onClose={closeViewer}
          onComplete={() => void complete()}
          busy={busy}
          error={error}
        />
      )}
      {pending.length > 0 && (
        <aside
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 z-20 mx-auto max-w-2xl rounded-xl bg-primary p-3 text-primary-foreground"
        >
          {pending.map((p) => (
            <div className="flex items-center justify-between gap-2" key={p.id}>
              <span className="truncate">已删除 {p.title}</span>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void work(async () => {
                    if (!(await store.undo(p.id)))
                      throw new Error("撤销时间已结束");
                    setPending((items) => items.filter((i) => i.id !== p.id));
                  })
                }
              >
                撤销
              </Button>
            </div>
          ))}
        </aside>
      )}
      {view !== "new" && view !== "edit" && view !== "completion" && (
        <nav
          aria-label="主要导航"
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-3">
            {(
              [
                { key: "home", label: "首页", icon: House },
                { key: "library", label: "我的菜谱", icon: BookOpen },
                { key: "settings", label: "设置", icon: Settings },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                disabled={
                  busy ||
                  backupBusy(backupState) ||
                  backupState.phase === "uncertain"
                }
                onClick={() => void navigate(item.key)}
                aria-current={view === item.key ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${view === item.key ? "bg-muted font-semibold" : "text-muted-foreground"}`}
              >
                <item.icon size={21} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
