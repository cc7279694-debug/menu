import { useEffect, useRef, useState,type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyDetails,
  recipeDetailsSchema,
  type RecipeDetailsInput,
} from "./recipe-model";
import { LocalImage } from "./local-image";
import { pickLocalImage, saveLocalImage, usesNativeImagePicker } from "./media";

function numberOrNull(text: string) {
  return text.trim() === "" ? null : Number(text);
}
export function RecipeEditor({
  initial,
  onSave,
  onCancel,
  heading,
  submitLabel,
  beforeFields,
  mediaEnabled=true,
  beforeSubmit,
}: {
  initial?: RecipeDetailsInput;
  onSave: (input: RecipeDetailsInput) => Promise<void>;
  onCancel: () => void;
  heading?:string;
  submitLabel?:string;
  beforeFields?:ReactNode;
  mediaEnabled?:boolean;
  beforeSubmit?:(input:RecipeDetailsInput)=>boolean;
}) {
  const [value, setValue] = useState(() => initial ?? emptyDetails());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const dirty =
    JSON.stringify(value) !== JSON.stringify(initial ?? emptyDetails());
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function cancel() {
    if (!busy && (!dirty || window.confirm("有未保存的修改，确定放弃吗？")))
      onCancel();
  }
  useEffect(() => {
    const back = (event: Event) => {
      event.preventDefault();
      // Keep this renderer and the input while a local write is in progress.
      if (!lock.current) cancel();
    };
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  });
  function patch(change: Partial<RecipeDetailsInput>) {
    setValue((v) => ({ ...v, ...change }));
  }
  async function image(file: File | undefined, step?: number) {
    if (!mediaEnabled||(!file && !usesNativeImagePicker()) || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const path = usesNativeImagePicker()
        ? await pickLocalImage()
        : file ? await saveLocalImage(file) : null;
      if (path === null) return;
      setValue((v) =>
        step === undefined
          ? { ...v, coverPath: path }
          : {
              ...v,
              steps: v.steps.map((r, i) =>
                i === step ? { ...r, imagePath: path } : r,
              ),
            },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片保存失败，请重试");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function move<K extends "ingredients" | "steps" | "preparations" | "keyTips">(
    group: K,
    index: number,
    offset: number,
  ) {
    const next = [...value[group]];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    // Step-bound tips follow their referenced step when its position changes.
    if (group === "steps")
      patch({
        steps: next as RecipeDetailsInput["steps"],
        keyTips: value.keyTips.map((t) => ({
          ...t,
          stepNumber:
            t.stepNumber === index + 1
              ? index + offset + 1
              : t.stepNumber === index + offset + 1
                ? index + 1
                : t.stepNumber,
        })),
      });
    else patch({ [group]: next });
  }
  function remove(
    group: "ingredients" | "steps" | "preparations" | "keyTips",
    index: number,
  ) {
    if (group === "steps")
      patch({
        steps: value.steps.filter((_, i) => i !== index),
        keyTips: value.keyTips.map((t) => ({
          ...t,
          stepNumber:
            t.stepNumber === index + 1
              ? null
              : t.stepNumber !== null && t.stepNumber > index + 1
                ? t.stepNumber - 1
                : t.stepNumber,
        })),
      });
    else patch({ [group]: value[group].filter((_, i) => i !== index) });
  }
  function controls(
    group: "ingredients" | "steps" | "preparations" | "keyTips",
    index: number,
    label: string,
  ) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || index === 0}
          aria-label={`上移${label}`}
          onClick={() => move(group, index, -1)}
        >
          上移
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || index === value[group].length - 1}
          aria-label={`下移${label}`}
          onClick={() => move(group, index, 1)}
        >
          下移
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          aria-label={`移除${label}`}
          onClick={() => remove(group, index)}
        >
          移除
        </Button>
      </div>
    );
  }
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (lock.current) return;
        const result = recipeDetailsSchema.safeParse(value);
        if (!result.success) {
          setError(result.error.issues.map((i) => i.message).join("；"));
          return;
        }
        if(beforeSubmit&&!beforeSubmit(result.data)){setError("请先完成审核后保存。");return;}
        lock.current = true;
        setBusy(true);
        setError("");
        void onSave(result.data)
          .catch((e) =>
            setError(e instanceof Error ? e.message : "保存失败，请重试"),
          )
          .finally(() => {
            lock.current = false;
            setBusy(false);
          });
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">
          {heading??(initial ? "编辑菜谱" : "记下这道菜")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="submit"
            disabled={busy || !value.title.trim()}
            aria-label="快速保存菜谱"
          >
            {submitLabel??"保存"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={cancel}
          >
            取消
          </Button>
        </div>
      </header>
      <p className="text-sm text-muted-foreground">
        只填菜名也能保存，其他内容可以以后慢慢补充。
      </p>
      <fieldset disabled={busy} className="space-y-6">
        {beforeFields}
        <label className="block space-y-2">
          <span>菜名</span>
          <Input
            value={value.title}
            maxLength={120}
            autoFocus
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        {mediaEnabled&&<section className="rounded-2xl border bg-card p-4 space-y-3">
          <h3 className="font-medium">封面照片</h3>
          <LocalImage
            path={value.coverPath}
            alt="菜谱封面"
            className="h-40 w-full rounded-xl object-cover"
          />
          <label className="block text-sm">
            选择本地封面
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onClick={(e) => {
                if (usesNativeImagePicker()) {
                  e.preventDefault();
                  void image(undefined);
                }
              }}
              onChange={(e) => void image(e.target.files?.[0])}
              className="mt-2"
            />
          </label>
          {value.coverPath && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => patch({ coverPath: null })}
            >
              移除封面
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            图片保存在本机，不上传。大图片会占用更多设备空间。
          </p>
        </section>}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2">
            <span>做菜耗时（分钟）</span>
            <Input
              type="number"
              min="1"
              max="525600"
              value={value.totalMinutes ?? ""}
              onChange={(e) =>
                patch({ totalMinutes: numberOrNull(e.target.value) })
              }
            />
          </label>
          <label className="space-y-2">
            <span>约几人份</span>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={value.servings ?? ""}
              onChange={(e) =>
                patch({ servings: numberOrNull(e.target.value) })
              }
            />
          </label>
          <label className="space-y-2">
            <span>每份参考热量（kcal）</span>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={value.caloriesPerServing ?? ""}
              onChange={(e) =>
                patch({ caloriesPerServing: numberOrNull(e.target.value) })
              }
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          不知道就留空。耗时由你填写，不自动累加提前准备；用量不会随人数缩放。热量仅供日常参考。
        </p>
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">食材与实际用量</h3>
          {value.ingredients.map((r, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm">食材 {i + 1}</span>
                  <Input
                    value={r.name}
                    onChange={(e) =>
                      patch({
                        ingredients: value.ingredients.map((v, j) =>
                          j === i ? { ...v, name: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  <span className="text-sm">用量 {i + 1}</span>
                  <Input
                    placeholder="例如 500克／适量"
                    value={r.amount}
                    onChange={(e) =>
                      patch({
                        ingredients: value.ingredients.map((v, j) =>
                          j === i ? { ...v, amount: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              {controls("ingredients", i, `食材 ${i + 1}`)}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                ingredients: [...value.ingredients, { name: "", amount: "" }],
              })
            }
          >
            添加食材
          </Button>
        </section>
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">完整步骤</h3>
          {value.steps.map((r, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-3">
              <label className="block">
                <span className="text-sm">步骤 {i + 1}</span>
                <Textarea
                  value={r.instruction}
                  onChange={(e) =>
                    patch({
                      steps: value.steps.map((v, j) =>
                        j === i ? { ...v, instruction: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              {mediaEnabled&&<>
              {r.imagePath && (
                <LocalImage
                  path={r.imagePath}
                  alt={`步骤 ${i + 1} 参考图`}
                  className="h-40 w-full rounded-xl object-cover"
                />
              )}
              <label className="block text-sm">
                步骤 {i + 1} 图片（可选）
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onClick={(e) => {
                    if (usesNativeImagePicker()) {
                      e.preventDefault();
                      void image(undefined, i);
                    }
                  }}
                  onChange={(e) => void image(e.target.files?.[0], i)}
                />
              </label>
              {r.imagePath && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    patch({
                      steps: value.steps.map((v, j) =>
                        j === i ? { ...v, imagePath: null } : v,
                      ),
                    })
                  }
                >
                  移除步骤图片
                </Button>
              )}
              </>}
              {controls("steps", i, `步骤 ${i + 1}`)}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                steps: [...value.steps, { instruction: "", imagePath: null }],
              })
            }
          >
            添加步骤
          </Button>
        </section>
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">提前准备</h3>
          {value.preparations.map((r, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-3">
              <label className="block">
                <span>准备事项 {i + 1}</span>
                <Textarea
                  value={r.instruction}
                  onChange={(e) =>
                    patch({
                      preparations: value.preparations.map((v, j) =>
                        j === i ? { ...v, instruction: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm">准备时长 {i + 1}（分钟）</span>
                  <Input
                    type="number"
                    min="1"
                    value={r.minutes ?? ""}
                    onChange={(e) =>
                      patch({
                        preparations: value.preparations.map((v, j) =>
                          j === i
                            ? { ...v, minutes: numberOrNull(e.target.value) }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  <span className="text-sm">文字时间 {i + 1}</span>
                  <Input
                    placeholder="例如 提前一晚"
                    value={r.timingText ?? ""}
                    onChange={(e) =>
                      patch({
                        preparations: value.preparations.map((v, j) =>
                          j === i
                            ? { ...v, timingText: e.target.value || null }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              {controls("preparations", i, `准备事项 ${i + 1}`)}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                preparations: [
                  ...value.preparations,
                  { instruction: "", minutes: null, timingText: null },
                ],
              })
            }
          >
            添加准备事项
          </Button>
        </section>
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">关键事项</h3>
          {value.keyTips.map((r, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-3">
              <label className="block">
                <span>关键事项 {i + 1}</span>
                <Textarea
                  value={r.instruction}
                  onChange={(e) =>
                    patch({
                      keyTips: value.keyTips.map((v, j) =>
                        j === i ? { ...v, instruction: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm">关联步骤 {i + 1}（可选）</span>
                <Input
                  type="number"
                  min="1"
                  max={value.steps.length || 1}
                  value={r.stepNumber ?? ""}
                  onChange={(e) =>
                    patch({
                      keyTips: value.keyTips.map((v, j) =>
                        j === i
                          ? { ...v, stepNumber: numberOrNull(e.target.value) }
                          : v,
                      ),
                    })
                  }
                />
              </label>
              {controls("keyTips", i, `关键事项 ${i + 1}`)}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                keyTips: [
                  ...value.keyTips,
                  { instruction: "", stepNumber: null },
                ],
              })
            }
          >
            添加关键事项
          </Button>
        </section>
        <label className="block space-y-2">
          <span>个人备注</span>
          <Textarea
            value={value.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive p-3 text-sm"
        >
          {error}
        </p>
      )}
      <div className="sticky bottom-0 bg-background/95 py-3">
        <Button
          type="submit"
          disabled={busy || !value.title.trim()}
          className="min-h-12 w-full"
        >
          {busy ? "正在保存…" : submitLabel??"保存菜谱"}
        </Button>
      </div>
    </form>
  );
}
