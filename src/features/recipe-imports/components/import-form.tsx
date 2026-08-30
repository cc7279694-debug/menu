"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { attachRecipeImportImagesAction, createRecipeImportAction } from "@/features/recipe-imports/actions";
import type { RecipeAiProvider } from "@/features/recipe-imports/schemas";
import { uploadImportImages } from "@/features/recipe-imports/upload-import-images";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type InputMode = "url" | "images" | "text";

const modes: Array<{ value: InputMode; label: string }> = [
  { value: "url", label: "粘贴链接" },
  { value: "images", label: "上传图片" },
  { value: "text", label: "粘贴文字" },
];

const aiProviders: Array<{ value: RecipeAiProvider; label: string }> = [
  { value: "auto", label: "自动推荐（Qwen 优先，失败时用 Gemini）" },
  { value: "qwen", label: "只用 Qwen 3.8 Flash" },
  { value: "gemini", label: "只用 Gemini" },
];

export function ImportForm({ initialMode = "url" }: { initialMode?: InputMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [aiProvider, setAiProvider] = useState<RecipeAiProvider>("auto");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (mode === "text" && text.trim().length < 40) {
      setError("请至少粘贴 40 个字的菜谱内容");
      return;
    }
    if (mode === "images" && files.length < 1) {
      setError("请至少选择一张菜谱图片");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createRecipeImportAction(
        mode === "url" ? { sourceType: "url", sourceUrl: url.trim(), aiProvider } : mode === "text" ? { sourceType: "text", sourceText: text.trim(), aiProvider } : { sourceType: "images", aiProvider },
      );
      if (!created.ok) throw new Error(created.message);
      let paths: string[] = [];
      if (mode === "images") {
        const supabase = getBrowserSupabaseClient();
        paths = await uploadImportImages({ userId: created.data.uploadFolder.split("/")[0]!, importId: created.data.importId, files, bucket: supabase.storage.from("recipe-imports") });
        const attached = await attachRecipeImportImagesAction({ importId: created.data.importId, imagePaths: paths });
        if (!attached.ok) {
          await supabase.storage.from("recipe-imports").remove(paths);
          throw new Error(attached.message);
        }
      }
      router.push(`/recipes/import/${created.data.importId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入失败，请稍后重试");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={submit}>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="菜谱来源类型">
        {modes.map((item) => (
          <button className={`rounded-full border px-4 py-2 text-sm ${mode === item.value ? "bg-primary text-primary-foreground" : "bg-background"}`} key={item.value} onClick={() => setMode(item.value)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      {mode === "url" ? <div className="space-y-2"><Label htmlFor="recipe-source-url">网页或视频链接</Label><Input id="recipe-source-url" onChange={(event) => setUrl(event.target.value)} placeholder="https://…" type="url" value={url} /></div> : null}
      {mode === "text" ? <div className="space-y-2"><Label htmlFor="recipe-source-text">菜谱文字</Label><Textarea id="recipe-source-text" onChange={(event) => setText(event.target.value)} placeholder="粘贴图文笔记中的食材和步骤…" rows={10} value={text} /></div> : null}
      {mode === "images" ? <div className="space-y-2"><Label htmlFor="recipe-source-images">菜谱截图（最多 6 张，单张原图不超过 15MB）</Label><Input accept="image/jpeg,image/png,image/webp" id="recipe-source-images" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />{files.length ? <p className="text-sm text-muted-foreground">已选择 {files.length} 张图片</p> : null}</div> : null}
      <div className="space-y-2"><Label htmlFor="recipe-ai-provider">整理模型</Label><select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm" disabled={submitting} id="recipe-ai-provider" onChange={(event) => setAiProvider(event.target.value as RecipeAiProvider)} value={aiProvider}>{aiProviders.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><p className="text-xs text-muted-foreground">自动推荐会优先使用 Qwen，服务异常时再切换 Gemini。</p></div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button disabled={submitting} type="submit">{submitting ? "正在准备导入…" : "生成菜谱草稿"}</Button>
    </form>
  );
}
