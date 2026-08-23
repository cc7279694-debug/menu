"use client";

import { Button } from "@/components/ui/button";
import { formatRemainingSeconds } from "@/features/cooking/timers";
import type { CookingTimerView } from "@/features/cooking/types";

type TimerTrayProps = {
  timers: CookingTimerView[];
  onCancel(stepId: string): void;
  onDismiss(stepId: string): void;
};

export function TimerTray({ timers, onCancel, onDismiss }: TimerTrayProps) {
  if (timers.length === 0) return null;

  return (
    <aside aria-label="计时器" aria-live="polite" className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">进行中的计时器</h2>
      <ul className="mt-3 space-y-2">
        {timers.map((timer) => {
          const remaining = formatRemainingSeconds(timer.remainingSeconds);
          const finished = timer.status === "finished";
          const status = finished ? "已完成" : `剩余 ${remaining}`;
          return (
            <li aria-label={`${timer.label}，${finished ? "已完成" : remaining}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2" key={timer.stepId}>
              <div className="min-w-0">
                <p className="font-medium">{timer.label}</p>
                <p className={finished ? "text-sm font-medium text-primary" : "text-sm text-muted-foreground"}>{status}</p>
              </div>
              <Button className="min-h-11" onClick={() => finished ? onDismiss(timer.stepId) : onCancel(timer.stepId)} size="sm" type="button" variant="outline">
                {finished ? `关闭${timer.label}计时` : `取消${timer.label}计时`}
              </Button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
