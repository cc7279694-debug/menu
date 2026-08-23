"use client";

/* eslint-disable @next/next/no-img-element -- Step images use short-lived private signed URLs. */

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TimerTray } from "@/features/cooking/components/timer-tray";
import { getStepIngredients } from "@/features/cooking/servings";
import { formatRemainingSeconds } from "@/features/cooking/timers";
import { useCookingSession } from "@/features/cooking/hooks/use-cooking-session";
import { useWakeLock } from "@/features/cooking/hooks/use-wake-lock";
import type { RecipeDetail } from "@/features/recipes/types";

type CookingScreenProps = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
};

export function CookingScreen({ recipe, requestedServings, restart }: CookingScreenProps) {
  const [completed, setCompleted] = useState(false);
  const cooking = useCookingSession({ recipe, requestedServings, restart });
  const wakeLock = useWakeLock(!completed);
  const ingredients = getStepIngredients(recipe, cooking.currentStep.id, cooking.session.targetServings);
  const timerSeconds = cooking.currentStep.timerSeconds;
  const timerLabel = `第 ${cooking.currentIndex + 1} 步`;
  const capabilityMessage = !cooking.storageAvailable
    ? "无法保存烹饪进度，本次烹饪仍可继续。"
    : wakeLock.message ?? (typeof globalThis.Notification === "undefined" ? "此浏览器不支持计时完成通知。" : null);

  if (completed) {
    return (
      <main className="mx-auto max-w-xl space-y-5 py-12 text-center">
        <h1 className="text-2xl font-semibold">烹饪完成</h1>
        <p className="text-muted-foreground">这次烹饪进度已清除。</p>
        <div className="flex justify-center gap-3">
          <Link className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/recipes/${recipe.id}`}>查看菜谱</Link>
          <Link className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium" href={`/recipes/${recipe.id}/edit`}>编辑菜谱</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-28">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">第 {cooking.currentIndex + 1} / {recipe.steps.length} 步</p>
        <div aria-label="烹饪进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={cooking.progressPercent} className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar">
          <div className="h-full bg-primary" style={{ width: `${cooking.progressPercent}%` }} />
        </div>
        {capabilityMessage && <p className="mt-3 text-sm text-muted-foreground" role="status">{capabilityMessage}</p>}
      </header>

      <article className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
        <p className="whitespace-pre-wrap text-lg leading-8">{cooking.currentStep.instruction}</p>
        {cooking.currentStep.imageUrl && (
          <Dialog>
            <DialogTrigger aria-label={`查看步骤 ${cooking.currentIndex + 1} 图片`} render={<button className="block w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" type="button" />}>
              <img alt={`步骤 ${cooking.currentIndex + 1} 图片，点击查看大图`} className="max-h-80 w-full object-cover" src={cooking.currentStep.imageUrl} />
            </DialogTrigger>
            <DialogContent className="max-w-3xl" showCloseButton={false}>
              <DialogTitle>步骤 {cooking.currentIndex + 1} 图片</DialogTitle>
              <img alt={`${recipe.title}，第 ${cooking.currentIndex + 1} 步图片`} className="max-h-[75vh] w-full rounded-lg object-contain" src={cooking.currentStep.imageUrl} />
              <DialogClose render={<Button type="button" variant="outline" />}>关闭步骤图片</DialogClose>
            </DialogContent>
          </Dialog>
        )}
        {timerSeconds && timerSeconds > 0 && (
          <Button onClick={() => { void cooking.startTimer(cooking.currentStep.id, timerLabel, timerSeconds); }} type="button">
            开始本步计时（{formatRemainingSeconds(timerSeconds)}）
          </Button>
        )}
        {ingredients.length > 0 && (
          <section aria-labelledby="step-ingredients-heading">
            <h2 className="text-sm font-medium" id="step-ingredients-heading">本步食材</h2>
            <ul className="mt-2 space-y-2">
              {ingredients.map((ingredient) => (
                <li className="flex justify-between gap-4 text-sm" key={ingredient.recipeIngredientId}>
                  <span>{ingredient.name}{ingredient.preparationNote ? `（${ingredient.preparationNote}）` : ""}</span>
                  <span className="shrink-0 text-muted-foreground">{ingredient.amount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <TimerTray onCancel={cooking.cancelTimer} onDismiss={cooking.dismissTimer} timers={cooking.timerViews} />

      <nav aria-label="烹饪步骤" className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur sm:static sm:rounded-xl sm:border">
        <div className="mx-auto flex max-w-3xl justify-between gap-3">
          <Button disabled={cooking.currentIndex === 0} onClick={cooking.previous} type="button" variant="outline">上一步</Button>
          {cooking.currentIndex === recipe.steps.length - 1 ? (
            <Button onClick={() => { cooking.complete(); setCompleted(true); }} type="button">完成烹饪</Button>
          ) : (
            <Button onClick={cooking.next} type="button">下一步</Button>
          )}
        </div>
      </nav>
    </main>
  );
}
