import type { CookingRecord, CookingRecordExtras } from "./cooking-model";
import {
  cookingEvaluationSchema,
  cookingRecordExtrasSchema,
} from "./cooking-model";
import type { RecipeDetails } from "./recipe-model";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pickLocalImage, saveLocalImage, usesNativeImagePicker } from "./media";
import { LocalImage } from "./local-image";
export type CookingCompletionProps = {
  record: CookingRecord;
  onUpdate: (extras: CookingRecordExtras) => Promise<CookingRecord>;
  onSetCover: () => Promise<RecipeDetails>;
  onAdjust: () => void;
  onDone: () => void;
};
const extrasOf = (r: CookingRecord): CookingRecordExtras => ({
  finishedPhotoPath: r.finishedPhotoPath,
  evaluation: r.evaluation,
  note: r.note,
});
export function CookingCompletion({
  record,
  onUpdate,
  onSetCover,
  onAdjust,
  onDone,
}: CookingCompletionProps) {
  const [base, setBase] = useState(() => extrasOf(record)),
    [value, setValue] = useState(() => extrasOf(record));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const lock = useRef(false),
    id = useId();
  const dirty = JSON.stringify(base) !== JSON.stringify(value);
  function leave(action = onDone) {
    if (lock.current) return;
    if (
      !dirty ||
      window.confirm("补充内容尚未保存，确定放弃补充？做过记录会保留。")
    )
      action();
  }
  useEffect(() => {
    const back = (e: Event) => {
      e.preventDefault();
      leave();
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("recipio:back", back);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("recipio:back", back);
      window.removeEventListener("beforeunload", unload);
    };
  });
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "补充保存失败；做过记录仍已保留，请重试",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function persist() {
    if (!dirty) return;
    const saved = await onUpdate(cookingRecordExtrasSchema.parse(value));
    const extras = extrasOf(saved);
    setBase(extras);
    setValue(extras);
  }
  async function image(file?: File) {
    await run(async () => {
      const path = usesNativeImagePicker()
        ? await pickLocalImage()
        : file
          ? await saveLocalImage(file)
          : null;
      if (path !== null) setValue((v) => ({ ...v, finishedPhotoPath: path }));
    });
  }
  return (
    <section className="space-y-5">
      <Button
        variant="ghost"
        className="min-h-11"
        disabled={busy}
        onClick={() => leave()}
      >
        返回菜谱
      </Button>
      <h2 className="text-2xl font-semibold">已记录做过这道菜</h2>
      <p>
        做菜时间：
        <time dateTime={record.cookedAt}>
          {new Date(record.cookedAt).toLocaleString()}
        </time>
      </p>
      <p className="text-sm text-muted-foreground">
        已经保存在本机。下面都可跳过，不填写也可以直接返回。
      </p>
      <div className="rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold">成品照片（可选）</h3>
        {value.finishedPhotoPath && (
          <LocalImage
            path={value.finishedPhotoPath}
            alt="这次的成品照片"
            className="max-h-72 w-full rounded-xl object-cover"
          />
        )}
        {usesNativeImagePicker() ? (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void image()}
          >
            {value.finishedPhotoPath ? "更换成品照片" : "添加成品照片"}
          </Button>
        ) : (
          <label className="block">
            {value.finishedPhotoPath ? "更换成品照片" : "添加成品照片"}
            <input
              aria-label="选择成品照片"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={busy}
              className="mt-2 block min-h-11 max-w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void image(file);
              }}
            />
          </label>
        )}
        {value.finishedPhotoPath && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await persist();
                  await onSetCover();
                  setStatus("成品照片已同时用作菜谱封面。");
                })
              }
            >
              设为菜谱封面
            </Button>
            <Button
              variant="ghost"
              className="min-h-11"
              disabled={busy}
              onClick={() =>
                setValue((v) => ({ ...v, finishedPhotoPath: null }))
              }
            >
              移除成品照片
            </Button>
          </div>
        )}
      </div>
      <label className="block" htmlFor={`${id}-evaluation`}>
        这次感觉（可选）
        <select
          id={`${id}-evaluation`}
          disabled={busy}
          value={value.evaluation ?? ""}
          className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3"
          onChange={(e) =>
            setValue((v) => ({
              ...v,
              evaluation: e.target.value
                ? cookingEvaluationSchema.parse(e.target.value)
                : null,
            }))
          }
        >
          <option value="">暂不评价</option>
          <option value="tasty">好吃</option>
          <option value="okay">一般</option>
          <option value="adjust_next_time">下次调整</option>
        </select>
      </label>
      <label className="block" htmlFor={`${id}-note`}>
        这次的备注
        <Textarea
          id={`${id}-note`}
          maxLength={2000}
          disabled={busy}
          value={value.note ?? ""}
          className="mt-2 min-h-28"
          placeholder="例如：下次糖少放一些（可选）"
          onChange={(e) =>
            setValue((v) => ({ ...v, note: e.target.value || null }))
          }
        />
      </label>
      {error && (
        <div
          role="alert"
          className="whitespace-pre-wrap break-words rounded-xl border p-4"
        >
          {error}
          <p className="mt-2 text-sm">
            最简做过记录已保留，补充内容未丢弃，可以重试。
          </p>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          className="min-h-11"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await persist();
              onDone();
            })
          }
        >
          完成并返回
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await persist();
              onAdjust();
            })
          }
        >
          调整做法
        </Button>
      </div>
      {error && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            className="min-h-11"
            disabled={busy}
            onClick={() => leave()}
          >
            仅保留做过记录
          </Button>
          <Button
            variant="ghost"
            className="min-h-11"
            disabled={busy}
            onClick={() => leave(onAdjust)}
          >
            仅保留记录并调整做法
          </Button>
        </div>
      )}
    </section>
  );
}
