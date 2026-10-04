import type { RecipeDetails } from "./recipe-model";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RecipeStepContent } from "./recipe-step-content";
export type StepViewerProps = {
  recipe: RecipeDetails;
  mode: "focus" | "guided";
  initialIndex: number;
  onClose: () => void;
  onComplete: () => void;
  busy?: boolean;
  error?: string;
};
export function StepViewer({
  recipe,
  mode,
  initialIndex,
  onClose,
  onComplete,
  busy = false,
  error,
}: StepViewerProps) {
  const [index, setIndex] = useState(() =>
    mode === "guided"
      ? 0
      : Math.max(0, Math.min(recipe.steps.length - 1, initialIndex)),
  );
  const count = recipe.steps.length;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="inset-0 left-0 top-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none"
      >
        <header className="shrink-0 border-b px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <DialogTitle className="text-xl leading-relaxed">
            {mode === "guided" ? "引导烹饪" : "单步查看"}
          </DialogTitle>
          <DialogDescription className="mt-1 break-words">
            {recipe.title}
          </DialogDescription>
          <Button
            variant="ghost"
            className="mt-2 min-h-11"
            disabled={busy}
            onClick={onClose}
          >
            {mode === "guided" ? "退出引导" : "返回完整步骤"}
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 text-xl">
          {count ? (
            <>
              <p
                className="mb-5 text-sm text-muted-foreground"
                aria-live="polite"
              >
                第 {index + 1} 步 / {count}
              </p>
              <RecipeStepContent recipe={recipe} stepIndex={index} />
            </>
          ) : (
            <p>还没有步骤，仍可以在菜谱页记录做过。</p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-base">
              {error}，可以再次点击完成重试。
            </p>
          )}
        </div>
        {count > 0 && (
          <footer className="flex shrink-0 flex-wrap gap-3 border-t bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="min-h-11 flex-1"
              disabled={busy || index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              上一步
            </Button>
            {mode === "guided" && index === count - 1 ? (
              <Button
                className="min-h-11 flex-1"
                disabled={busy}
                onClick={onComplete}
              >
                完成这道菜
              </Button>
            ) : (
              <Button
                className="min-h-11 flex-1"
                disabled={busy || index === count - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                下一步
              </Button>
            )}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
