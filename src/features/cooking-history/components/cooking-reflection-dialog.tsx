"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeCookingRecordAction } from "@/features/cooking-history/actions";
import { CookingPhotoPicker, type CookingPhotoDraft } from "@/features/cooking-history/components/cooking-photo-picker";
import { removeCookingRecordPhotoPaths, uploadCookingRecordPhotos } from "@/features/cooking-history/media";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export type CookingReflectionDialogProps = {
  open: boolean;
  userId: string;
  recipeId: string;
  mealPlanEntryId: string | null;
  startedAt: number;
  defaultServings: number;
  onOpenChange(open: boolean): void;
  onCompleted(cookingRecordId: string): void;
  onSkip(): void;
};

export function CookingReflectionDialog({
  open,
  userId,
  recipeId,
  mealPlanEntryId,
  startedAt,
  defaultServings,
  onOpenChange,
  onCompleted,
  onSkip,
}: CookingReflectionDialogProps) {
  const [actualServings, setActualServings] = useState(String(defaultServings));
  const [rating, setRating] = useState<number | null>(null);
  const [improvementNotes, setImprovementNotes] = useState("");
  const [photos, setPhotos] = useState<CookingPhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActualServings(String(defaultServings));
    setRating(null);
    setImprovementNotes("");
    setError(null);
  }, [defaultServings, open]);

  async function save() {
    if (isSaving) return;
    const servings = Number(actualServings);
    if (!Number.isFinite(servings) || servings < 0.25 || servings > 1000) {
      setError("实际份数需要在 0.25 到 1000 之间");
      return;
    }
    setIsSaving(true);
    setError(null);
    const cookingRecordId = crypto.randomUUID();
    let uploaded: Awaited<ReturnType<typeof uploadCookingRecordPhotos>> | null = null;
    try {
      const bucket = getBrowserSupabaseClient().storage.from("recipe-media");
      uploaded = await uploadCookingRecordPhotos({
        userId,
        cookingRecordId,
        files: photos.map(({ photoId, file }) => ({ photoId, file })),
        bucket,
      });
      const result = await completeCookingRecordAction({
        cookingRecordId,
        recipeId,
        mealPlanEntryId,
        startedAt: new Date(startedAt).toISOString(),
        actualServings: servings,
        rating,
        improvementNotes: improvementNotes.trim() || null,
        photos: uploaded.photos,
      });
      if (!result.ok) {
        await removeCookingRecordPhotoPaths(bucket, userId, cookingRecordId, uploaded.uploadedPaths);
        setError(result.message);
        return;
      }
      onCompleted(result.data.cookingRecordId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "烹饪记录保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSaving) onOpenChange(nextOpen); }}>
      <DialogContent aria-describedby="cooking-reflection-description" aria-labelledby="cooking-reflection-title" showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle id="cooking-reflection-title">记录这次烹饪</DialogTitle>
          <DialogDescription id="cooking-reflection-description">可选填几项，帮助你下次做得更好；也可以直接跳过。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cooking-actual-servings">实际份数</Label>
            <Input disabled={isSaving} id="cooking-actual-servings" min="0.25" onChange={(event) => setActualServings(event.target.value)} step="0.25" type="number" value={actualServings} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">评分（可选）</legend>
            <div aria-label="烹饪评分" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <Button aria-label={`${score} 星`} aria-pressed={rating === score} className="min-h-11 min-w-11 text-lg" disabled={isSaving} key={score} onClick={() => setRating(score)} type="button" variant={rating === score ? "default" : "outline"}>★</Button>
              ))}
              {rating !== null ? <Button className="min-h-11" disabled={isSaving} onClick={() => setRating(null)} type="button" variant="ghost">清除评分</Button> : null}
            </div>
          </fieldset>
          <CookingPhotoPicker disabled={isSaving} onChange={setPhotos} photos={photos} />
          <div className="space-y-2">
            <Label htmlFor="cooking-improvement-notes">下次注意（可选）</Label>
            <Textarea disabled={isSaving} id="cooking-improvement-notes" maxLength={2000} onChange={(event) => setImprovementNotes(event.target.value)} placeholder="例如：鱼片再薄一点，少放盐" value={improvementNotes} />
          </div>
          {error ? <div aria-live="polite" className="space-y-2" role="alert"><p className="text-sm text-destructive">{error}</p><p className="text-xs text-muted-foreground">本地烹饪进度仍保留，可以重试保存。</p><Button disabled={isSaving} onClick={() => void save()} type="button" variant="outline">重试保存</Button><Button disabled={isSaving} onClick={onSkip} type="button" variant="ghost">本次不保存记录并退出</Button></div> : null}
        </div>
        <DialogFooter>
          <Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">返回继续烹饪</Button>
          <Button disabled={isSaving} onClick={() => void save()} type="button">{isSaving ? "保存中…" : "保存记录"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
