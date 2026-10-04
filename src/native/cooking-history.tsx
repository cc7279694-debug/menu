import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecipeLibrary } from "./recipe-model";
import type {
  CookingCursor,
  CookingRecord,
  CookingSummary,
} from "./cooking-model";
import { LocalImage } from "./local-image";

const evaluations = {
  tasty: "好吃",
  okay: "一般",
  adjust_next_time: "下次调整",
};
function RecordContent({ record }: { record: CookingRecord }) {
  return (
    <>
      <time dateTime={record.cookedAt}>
        {new Date(record.cookedAt).toLocaleString()}
      </time>
      {record.finishedPhotoPath && (
        <LocalImage
          path={record.finishedPhotoPath}
          alt="这次的成品照片"
          className="mt-3 max-h-64 w-full rounded-lg object-cover"
        />
      )}
      {record.evaluation && (
        <p className="mt-3">{evaluations[record.evaluation]}</p>
      )}
      {record.note && (
        <p className="mt-3 whitespace-pre-wrap break-words">{record.note}</p>
      )}
    </>
  );
}
function Summary({ summary }: { summary: CookingSummary }) {
  return (
    <div className="space-y-2">
      <p>做过 {summary.count} 次</p>
      {summary.lastCookedAt && (
        <p className="text-sm text-muted-foreground">
          最近做过：{new Date(summary.lastCookedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
export function CookingOverview({
  recipeId,
  store,
  revision,
  onHistory,
}: {
  recipeId: string;
  store: RecipeLibrary;
  revision: number;
  onHistory: () => void;
}) {
  const [result, setResult] = useState<{
    summary: CookingSummary;
    rows: CookingRecord[];
  } | null>(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    setResult(null);
    void Promise.all([
      store.getCookingSummary(recipeId),
      store.listCookingRecords(recipeId, 3),
    ])
      .then(([summary, rows]) => {
        if (alive) setResult({ summary, rows });
      })
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "无法读取做菜记录");
      });
    return () => {
      alive = false;
    };
  }, [recipeId, store, revision, retry]);
  return (
    <section className="mt-6 space-y-4 rounded-xl border p-4">
      <h3 className="text-lg font-semibold">做菜记录</h3>
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            重试读取做菜记录
          </Button>
        </div>
      ) : result ? (
        <>
          <Summary summary={result.summary} />
          {!result.rows.length && (
            <p className="text-sm text-muted-foreground">
              只有点击完成才会记录；浏览步骤不会自动记为做过。
            </p>
          )}
          <ol className="space-y-4">
            {result.rows.map((record) => (
              <li
                key={record.id}
                data-testid="cooking-record"
                data-record-id={record.id}
              >
                <RecordContent record={record} />
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p role="status">读取本地做菜记录…</p>
      )}
      <Button variant="outline" className="min-h-11" onClick={onHistory}>
        查看做菜记录
      </Button>
    </section>
  );
}
export function CookingHistory({
  recipeId,
  store,
  onBack,
  onChanged,
}: {
  recipeId: string;
  store: RecipeLibrary;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<CookingRecord[]>([]),
    [summary, setSummary] = useState<CookingSummary>({
      count: 0,
      lastCookedAt: null,
    });
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [more, setMore] = useState(false);
  const sequence = useRef(0),
    lock = useRef(false),
    cursor = useRef<CookingCursor | undefined>(undefined);
  const load = useCallback(
    async (next?: CookingCursor) => {
      if (lock.current) return;
      lock.current = true;
      const request = ++sequence.current;
      cursor.current = next;
      setBusy(true);
      setError("");
      try {
        const [page, current] = await Promise.all([
          store.listCookingRecords(recipeId, 20, next),
          store.getCookingSummary(recipeId),
        ]);
        if (request === sequence.current) {
          setRows((old) =>
            next
              ? [...old, ...page.filter((r) => !old.some((o) => o.id === r.id))]
              : page,
          );
          setSummary(current);
          setMore(page.length === 20);
        }
      } catch (e) {
        if (request === sequence.current)
          setError(e instanceof Error ? e.message : "无法读取做菜记录，请重试");
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
  useEffect(() => {
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (!lock.current) onBack();
    };
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  }, [onBack]);
  async function remove(record: CookingRecord) {
    if (
      lock.current ||
      !window.confirm("删除这次做菜记录？不会删除菜谱，且无法撤销。")
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setWarning("");
    const request = sequence.current;
    try {
      const result = await store.deleteCookingRecord(record.id);
      if (request !== sequence.current) return;
      setWarning(result.cleanupWarning ?? "");
      onChanged();
      lock.current = false;
      await load();
    } catch (e) {
      if (request === sequence.current)
        setError(e instanceof Error ? e.message : "删除记录失败，请重试");
    } finally {
      if (request === sequence.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const last = rows.at(-1);
  return (
    <section className="space-y-5">
      <Button
        variant="ghost"
        className="min-h-11"
        disabled={busy}
        onClick={onBack}
      >
        返回菜谱
      </Button>
      <h2 className="text-2xl font-semibold">做菜记录</h2>
      <Summary summary={summary} />
      {busy && <p role="status">读取本地做菜记录…</p>}
      {warning && <p role="status">{warning}</p>}
      {error && (
        <div>
          <p role="alert">{error}</p>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void load(cursor.current)}
          >
            重试读取做菜记录
          </Button>
        </div>
      )}
      {!busy && !error && !rows.length && (
        <p>还没有做菜记录。只有点击完成才会记录。</p>
      )}
      <ol className="space-y-4">
        {rows.map((record) => (
          <li
            key={record.id}
            data-testid="cooking-record"
            data-record-id={record.id}
            className="rounded-xl border p-4"
          >
            <RecordContent record={record} />
            <Button
              variant="ghost"
              className="mt-3 min-h-11 text-destructive"
              disabled={busy}
              onClick={() => void remove(record)}
            >
              删除这次记录
            </Button>
          </li>
        ))}
      </ol>
      {more && last && !error && (
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void load({ cookedAt: last.cookedAt, id: last.id })}
        >
          加载更多做菜记录
        </Button>
      )}
    </section>
  );
}
