"use client";

/* eslint-disable @next/next/no-img-element -- Step images use short-lived private signed URLs. */

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TimerTray } from "@/features/cooking/components/timer-tray";
import { PreparationChecklist } from "@/features/cooking/components/preparation-checklist";
import { CookingReflectionDialog } from "@/features/cooking-history/components/cooking-reflection-dialog";
import { getStepIngredients } from "@/features/cooking/servings";
import { formatRemainingSeconds } from "@/features/cooking/timers";
import { useCookingSession } from "@/features/cooking/hooks/use-cooking-session";
import { useWakeLock } from "@/features/cooking/hooks/use-wake-lock";
import type { RecipeDetail } from "@/features/recipes/types";

type CookingScreenProps = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
  userId?: string | null;
  mealPlanEntryId?: string | null;
};

export function CookingScreen({ recipe, requestedServings, restart, userId = null, mealPlanEntryId = null }: CookingScreenProps) {
  const [completed, setCompleted] = useState(false);
  const [completionSaved, setCompletionSaved] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const cooking = useCookingSession({ recipe, requestedServings, restart, userId });
  const wakeLock = useWakeLock(!completed);
  const ingredients = getStepIngredients(recipe, cooking.currentStep.id, cooking.session.targetServings);
  const timerSeconds = cooking.currentStep.timerSeconds;
  const timerLabel = `第 ${cooking.currentIndex + 1} 步`;
  const capabilityMessages = [
    !cooking.ready ? "正在恢复本机烹饪进度…" : null,
    !cooking.storageAvailable ? "无法保存烹饪进度，本次烹饪仍可继续。" : null,
    wakeLock.message,
    cooking.notificationMessage,
  ].filter((message): message is string => message !== null);

  if (completed) {
    return (
      <main className="mx-auto max-w-xl space-y-5 py-12 text-center">
        <h1 className="text-2xl font-semibold">烹饪完成</h1>
        <p className="text-muted-foreground">{completionSaved ? "烹饪记录已保存，" : "本次未保存记录，"}这次烹饪进度已清除。</p>
        <div className="flex justify-center gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/recipes/${recipe.id}`}>查看菜谱</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium" href={`/recipes/${recipe.id}/edit`}>编辑菜谱</Link>
        </div>
      </main>
    );
  }

  if (recipe.preparations.length > 0 && cooking.session.preparationsConfirmedAt === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 py-8">
        <Link className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline" href={`/recipes/${recipe.id}`}>返回菜谱</Link>
        <PreparationChecklist
          allCompleted={cooking.preparationsComplete}
          completedIds={cooking.session.completedPreparationIds}
          onConfirm={cooking.confirmPreparations}
          onSkip={cooking.confirmPreparations}
          onToggle={cooking.togglePreparation}
          disabled={!cooking.ready}
          preparations={recipe.preparations}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-44 sm:pb-0">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">第 {cooking.currentIndex + 1} / {recipe.steps.length} 步</p>
        <div aria-label="烹饪进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={cooking.progressPercent} className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar">
          <div className="h-full bg-primary" style={{ width: `${cooking.progressPercent}%` }} />
        </div>
        {capabilityMessages.length > 0 && (
          <div className="mt-3 space-y-1 text-sm text-muted-foreground" role="status">
            {capabilityMessages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}
      </header>

      <article className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
        <p className="whitespace-pre-wrap text-lg leading-8">{cooking.currentStep.instruction}</p>
        {cooking.currentStep.imageUrl && (
          <Dialog>
            <DialogTrigger aria-label={`查看步骤 ${cooking.currentIndex + 1} 图片`} render={<button className="block min-h-11 w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" type="button" />}>
              <img alt={`步骤 ${cooking.currentIndex + 1} 图片，点击查看大图`} className="max-h-80 w-full object-cover" decoding="async" height={800} loading="lazy" src={cooking.currentStep.imageUrl} width={1200} />
            </DialogTrigger>
            <DialogContent className="max-w-3xl" showCloseButton={false}>
              <DialogTitle>步骤 {cooking.currentIndex + 1} 图片</DialogTitle>
              <img alt={`${recipe.title}，第 ${cooking.currentIndex + 1} 步图片`} className="max-h-[75vh] w-full rounded-lg object-contain" decoding="async" height={800} loading="lazy" src={cooking.currentStep.imageUrl} width={1200} />
              <DialogClose render={<Button className="min-h-11" type="button" variant="outline" />}>关闭步骤图片</DialogClose>
            </DialogContent>
          </Dialog>
        )}
        {timerSeconds && timerSeconds > 0 && (
          <Button className="min-h-11" disabled={!cooking.ready} onClick={() => { void cooking.startTimer(cooking.currentStep.id, timerLabel, timerSeconds); }} type="button">
            开始本步计时（{formatRemainingSeconds(timerSeconds)}）
          </Button>
        )}
        {ingredients.length > 0 && (
          <section aria-labelledby="step-ingredients-heading">
            <h2 className="text-sm font-medium" id="step-ingredients-heading">本步食材</h2>
            <ul className="mt-2 space-y-2">
              {ingredients.map((ingredient) => (
                <li className="flex justify-between gap-4 text-sm" key={ingredient.recipeIngredientId}>
                  <div className="min-w-0">
                    <p>{ingredient.name}</p>
                    {ingredient.preparationNote && <p className="text-muted-foreground">预处理：{ingredient.preparationNote}</p>}
                    {ingredient.linkNote && <p className="text-muted-foreground">本步备注：{ingredient.linkNote}</p>}
                  </div>
                  <span className="shrink-0 text-muted-foreground">{ingredient.amount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <TimerTray onCancel={cooking.cancelTimer} onDismiss={cooking.dismissTimer} timers={cooking.timerViews} />

      <nav aria-label="烹饪步骤" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/98 p-3 backdrop-blur-sm sm:static sm:rounded-xl sm:border sm:backdrop-blur-0">
        <div className="mx-auto flex max-w-3xl justify-between gap-3">
          <Button className="min-h-11" disabled={!cooking.ready || cooking.currentIndex === 0} onClick={cooking.previous} type="button" variant="outline">上一步</Button>
          {cooking.currentIndex === recipe.steps.length - 1 ? (
            <Button className="min-h-11" disabled={!cooking.ready} onClick={() => setReflectionOpen(true)} type="button">完成烹饪</Button>
          ) : (
            <Button className="min-h-11" disabled={!cooking.ready} onClick={cooking.next} type="button">下一步</Button>
          )}
        </div>
      </nav>

      <CookingReflectionDialog
        defaultServings={cooking.session.targetServings}
        mealPlanEntryId={mealPlanEntryId}
        onCompleted={() => {
          cooking.complete();
          setReflectionOpen(false);
          setCompletionSaved(true);
          setCompleted(true);
        }}
        onOpenChange={setReflectionOpen}
        onSkip={() => {
          cooking.complete();
          setReflectionOpen(false);
          setCompletionSaved(false);
          setCompleted(true);
        }}
        open={reflectionOpen}
        recipeId={recipe.id}
        startedAt={cooking.session.startedAt}
        userId={userId ?? ""}
      />
    </main>
  );
}
