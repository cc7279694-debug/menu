import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecipeName, RecipeNameStore } from "./recipe-store";
import { openRecipeStore } from "./sqlite";
import { Capacitor } from "@capacitor/core";
import { PreviewRecipeLibrary } from "./preview-store";
import type { RecipeLibrary } from "./recipe-model";
import { LibraryApp } from "./library-app";
import { openBackupService } from "./backup/runtime";
import type { BackupService } from "./backup/service";

export function NativeApp() {
  const [store, setStore] = useState<RecipeLibrary | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [backup, setBackup] = useState<BackupService>();
  useEffect(() => {
    let alive = true;
    (Capacitor.getPlatform() === "android"
      ? openRecipeStore()
      : Promise.resolve(new PreviewRecipeLibrary()).then(async (db) => {
          await db.purgeExpired();
          return db;
        })
    )
      .then(async (db) => {
        const service =
          Capacitor.getPlatform() === "android"
            ? await openBackupService()
            : undefined;
        if (alive) {
          setBackup(service);
          setStore(db);
        }
      })
      .catch(() => {
        if (alive) setError("本地数据库无法打开。请重试；不要清除应用数据。");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  if (store) return <LibraryApp store={store} backup={backup} />;
  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-6">
      <header className="mb-8 flex items-center gap-3">
        <img
          src="./icon.png"
          width="44"
          height="44"
          alt=""
          className="rounded-xl"
        />
        <div>
          <h1 className="text-xl font-semibold">谱序 RECIPIO</h1>
          <p className="text-sm text-muted-foreground">我的本地菜谱</p>
        </div>
      </header>
      {store ? (
        <LibraryApp store={store} />
      ) : error ? (
        <section role="alert">
          <p>{error}</p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            重试
          </Button>
        </section>
      ) : (
        <p role="status">正在打开本地菜谱…</p>
      )}
    </main>
  );
}

export function RecipeNames({ store }: { store: RecipeNameStore }) {
  const [records, setRecords] = useState<RecipeName[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<RecipeName | null>(null);
  const [detail, setDetail] = useState(false);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<
    Array<{ id: string; title: string; expires: number }>
  >([]);

  useEffect(() => {
    let alive = true;
    store
      .list(search, 100, page * 100)
      .then((rows) => {
        if (alive) setRecords(rows);
      })
      .catch(() => {
        if (alive) setError("无法读取本地菜谱，请重试。");
      });
    return () => {
      alive = false;
    };
  }, [store, search, revision, page]);

  useEffect(() => {
    if (!pending.length) return;
    const next = Math.min(...pending.map((p) => p.expires));
    const timer = window.setTimeout(
      () => {
        store
          .purgeExpired()
          .then(() =>
            setPending((items) => items.filter((p) => p.expires > Date.now())),
          )
          .catch(() => {
            setError("删除清理未完成，数据仍保留。重试或重启后将再次清理。");
            setPending([]);
          });
      },
      Math.max(1, next - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [pending, store]);

  async function action(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "本地保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  function closeEditor() {
    setSelected(null);
    setTitle("");
    setDetail(false);
  }

  return (
    <>
      <label htmlFor="recipe-search" className="mb-2 block font-medium">
        找到一道菜
      </label>
      <Input
        id="recipe-search"
        placeholder="搜索菜名"
        value={search}
        className="mb-6 min-h-12"
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      <section
        aria-label="新建或修改菜谱"
        className="mb-6 rounded-2xl border bg-card p-4"
      >
        <h2 className="mb-3 font-medium">
          {selected ? (detail ? "菜谱详情" : "修改菜名") : "记下一个菜名"}
        </h2>
        {detail && selected ? (
          <>
            <p className="mb-3 break-words text-2xl">{selected.title}</p>
            <p className="mb-4 text-sm text-muted-foreground">
              仅保存了名称，后续可以完善食材与步骤。
            </p>
            <Button className="min-h-11" onClick={() => setDetail(false)}>
              修改名称
            </Button>
            <Button
              variant="ghost"
              className="ml-2 min-h-11"
              onClick={closeEditor}
            >
              返回
            </Button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                if (selected) await store.rename(selected.id, title);
                else await store.create(title);
                closeEditor();
                setPage(0);
              });
            }}
          >
            <label htmlFor="recipe-title" className="sr-only">
              菜名
            </label>
            <Input
              id="recipe-title"
              placeholder="例如：啤酒鸭"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-3 min-h-11"
              disabled={busy}
            />
            <Button
              type="submit"
              className="min-h-11"
              disabled={busy || !title.trim()}
            >
              {busy ? "保存中…" : "保存菜名"}
            </Button>
            {selected && (
              <Button
                variant="ghost"
                className="ml-2 min-h-11"
                onClick={closeEditor}
              >
                取消
              </Button>
            )}
          </form>
        )}
      </section>
      {error && (
        <div role="alert" className="mb-4 rounded-xl border p-3">
          <p>{error}</p>
          <Button
            variant="outline"
            className="mt-2 min-h-11"
            onClick={() => void action(() => store.purgeExpired())}
          >
            重试
          </Button>
        </div>
      )}
      <h2 className="mb-3 font-medium">{search ? "搜索结果" : "最近加入"}</h2>
      {!records.length && (
        <p className="py-6 text-muted-foreground">
          {search
            ? "没有找到这道菜，可以先记下名称。"
            : "还没有菜谱，先记下第一道菜吧。"}
        </p>
      )}
      <ul className="space-y-3">
        {records.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-2 rounded-xl border bg-card p-3"
          >
            <button
              className="min-h-11 min-w-0 flex-1 text-left break-words font-medium"
              onClick={() => {
                setSelected(r);
                setTitle(r.title);
                setDetail(true);
              }}
            >
              {r.title}
            </button>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0"
              disabled={busy}
              aria-label={`删除 ${r.title}`}
              onClick={() =>
                void action(async () => {
                  const expires = await store.remove(r.id);
                  if (selected?.id === r.id) closeEditor();
                  setPending((items) => [
                    ...items,
                    { id: r.id, title: r.title, expires },
                  ]);
                })
              }
            >
              删除
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-3">
        {page > 0 && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setPage((n) => n - 1)}
          >
            上一页
          </Button>
        )}
        {records.length === 100 && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setPage((n) => n + 1)}
          >
            下一页
          </Button>
        )}
      </div>
      {pending.length > 0 && (
        <aside
          aria-live="polite"
          className="sticky bottom-4 mt-4 rounded-xl bg-primary p-3 text-primary-foreground"
        >
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="truncate">已删除 {p.title}</span>
              <Button
                variant="secondary"
                className="min-h-11"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    if (!(await store.undo(p.id)))
                      throw new Error("撤销时间已结束");
                    setPending((items) =>
                      items.filter((item) => item.id !== p.id),
                    );
                  })
                }
              >
                撤销
              </Button>
            </div>
          ))}
        </aside>
      )}
      <p className="mt-8 text-xs text-muted-foreground">
        数据仅保存在本机。卸载或清除数据会丢失菜谱；完整备份将在 APK-2 提供。
      </p>
    </>
  );
}
