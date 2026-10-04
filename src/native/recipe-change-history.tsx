import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecipeLibrary } from "./recipe-model";
import type { ChangeCursor, RecipeChange } from "./cooking-model";
import { summarizeRecipeChange } from "./recipe-change-summary";
import { LocalImage } from "./local-image";
export function RecipeChangeHistory({
  recipeId,
  store,
  onBack,
}: {
  recipeId: string;
  store: RecipeLibrary;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<RecipeChange[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [more, setMore] = useState(false);
  const sequence = useRef(0),
    lock = useRef(false),
    cursor = useRef<ChangeCursor | undefined>(undefined);
  const load = useCallback(
    async (next?: ChangeCursor) => {
      if (lock.current) return;
      lock.current = true;
      const request = ++sequence.current;
      cursor.current = next;
      setBusy(true);
      setError("");
      try {
        const page = await store.listRecipeChanges(recipeId, 20, next);
        if (request === sequence.current) {
          setRows((old) =>
            next
              ? [...old, ...page.filter((r) => !old.some((c) => c.id === r.id))]
              : page,
          );
          setMore(page.length === 20);
        }
      } catch (e) {
        if (request === sequence.current)
          setError(e instanceof Error ? e.message : "无法读取修改记录，请重试");
      } finally {
        if (request === sequence.current) {
          lock.current = false;
          setBusy(false);
        }
      }
    },
    [recipeId, store],
  );
  useEffect(() => {
    const lifetime = sequence,
      busyLock = lock;
    void load();
    return () => {
      lifetime.current++;
      busyLock.current = false;
    };
  }, [load]);
  const last = rows.at(-1);
  return (
    <section className="space-y-5">
      <Button variant="ghost" className="min-h-11" onClick={onBack}>
        返回菜谱
      </Button>
      <h2 className="text-2xl font-semibold">修改记录</h2>
      <p className="text-sm text-muted-foreground">
        这里只回看以前改过什么；当前菜谱始终是你的最新做法。
      </p>
      {busy && <p role="status">读取本地修改记录…</p>}
      {error && (
        <div>
          <p role="alert">{error}</p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void load(cursor.current)}
          >
            重试读取修改记录
          </Button>
        </div>
      )}
      {!busy && !error && !rows.length && (
        <p>还没有修改记录。当前菜谱就是你认可的最新做法。</p>
      )}
      <ol className="space-y-4">
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid="recipe-change"
            className="rounded-xl border p-4"
          >
            <time
              dateTime={r.changedAt}
              className="text-sm text-muted-foreground"
            >
              {new Date(r.changedAt).toLocaleString()}
            </time>
            <ul className="mt-3 space-y-2">
              {summarizeRecipeChange(r).map((s, i) => (
                <li key={i} className="whitespace-pre-wrap break-words">
                  {s}
                </li>
              ))}
            </ul>
            {(r.before.coverPath || r.after.coverPath) &&
              r.before.coverPath !== r.after.coverPath && (
                <details className="mt-3">
                  <summary className="min-h-11 cursor-pointer">
                    查看封面修改
                  </summary>
                  <div className="grid grid-cols-2 gap-3">
                    {[r.before.coverPath, r.after.coverPath].map((path, i) => (
                      <div key={i}>
                        <p>{i === 0 ? "修改前" : "修改后"}</p>
                        {path ? (
                          <LocalImage
                            path={path}
                            alt={i === 0 ? "修改前封面" : "修改后封面"}
                            className="max-h-40 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <p>未设置</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
          </li>
        ))}
      </ol>
      {more && last && !error && (
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void load({ changedAt: last.changedAt, id: last.id })}
        >
          加载更多修改记录
        </Button>
      )}
    </section>
  );
}
