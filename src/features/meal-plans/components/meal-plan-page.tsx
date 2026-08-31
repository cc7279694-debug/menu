"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CalendarPlus, ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMealPlanEntryAction,
  generateMealPlanShoppingListAction,
  loadMealPlanWeekAction,
  saveMealPlanEntryAction,
  setMealPlanStatusAction,
} from "@/features/meal-plans/actions";
import {
  getNotificationCapability,
  requestNotificationPermission,
  sendDuePreparationNotifications,
  type NotificationCapability,
} from "@/features/meal-plans/notifications";
import {
  buildPreparationReminders,
  formatLocalDate,
  getDefaultMealLocalDateTime,
  getWeekRange,
  localDateTimeToUtc,
  utcToLocalDateTime,
} from "@/features/meal-plans/time";
import type { MealPlanEntry, MealPlanStatus, MealSlot } from "@/features/meal-plans/types";
import type { RecipeSelectionSummary } from "@/features/recipes/types";

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

const STATUS_LABELS: Record<MealPlanStatus, string> = {
  planned: "待进行",
  completed: "已完成",
  skipped: "已跳过",
};

type EditorState = {
  entryId?: string;
  date: string;
  mealSlot: MealSlot;
  recipeId: string;
  localDateTime: string;
  targetServings: string;
  note: string;
};

function getRange(days: string[]) {
  const start = new Date(`${days[0]}T00:00`);
  const end = new Date(`${days[6]}T00:00`);
  end.setDate(end.getDate() + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function getReminderRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 30);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 32);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short", month: "numeric", day: "numeric" })
    .format(new Date(`${value}T12:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function newEditor(date: string, slot: MealSlot, recipes: RecipeSelectionSummary[]): EditorState {
  const recipe = recipes[0];
  return {
    date,
    mealSlot: slot,
    recipeId: recipe?.id ?? "",
    localDateTime: getDefaultMealLocalDateTime(date, slot),
    targetServings: String(recipe?.baseServings ?? 2),
    note: "",
  };
}

function editEntry(entry: MealPlanEntry): EditorState {
  return {
    entryId: entry.id,
    date: formatLocalDate(new Date(entry.plannedAt)),
    mealSlot: entry.mealSlot,
    recipeId: entry.recipeId,
    localDateTime: utcToLocalDateTime(entry.plannedAt),
    targetServings: String(entry.targetServings),
    note: entry.note ?? "",
  };
}

export function MealPlanPage({ recipes }: { recipes: RecipeSelectionSummary[] }) {
  const router = useRouter();
  const [anchorDate, setAnchorDate] = useState(() => formatLocalDate(new Date()));
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [reminderEntries, setReminderEntries] = useState<MealPlanEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [notificationState, setNotificationState] = useState<NotificationCapability>("unsupported");
  const weekDays = useMemo(() => getWeekRange(anchorDate), [anchorDate]);
  const range = useMemo(() => getRange(weekDays), [weekDays]);

  const loadWeek = useCallback(async () => {
    setIsLoading(true);
    const [weekResult, reminderResult] = await Promise.all([
      loadMealPlanWeekAction(range),
      loadMealPlanWeekAction(getReminderRange()),
    ]);
    if (weekResult.ok) {
      setEntries(weekResult.data);
      setMessage(null);
    } else {
      setMessage(weekResult.message);
    }
    if (reminderResult.ok) setReminderEntries(reminderResult.data);
    else setReminderEntries([]);
    setIsLoading(false);
  }, [range]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const reminders = useMemo(() => buildPreparationReminders(reminderEntries, new Date()), [reminderEntries]);
  const today = formatLocalDate(new Date());
  const tomorrow = shiftDate(today, 1);
  const todayReminders = useMemo(() => reminders.filter((reminder) => {
    if (reminder.state === "overdue") return true;
    if (reminder.dueAt) return formatLocalDate(new Date(reminder.dueAt)) === today;
    const entry = reminderEntries.find((item) => item.id === reminder.entryId);
    if (!entry) return false;
    const plannedDate = formatLocalDate(new Date(entry.plannedAt));
    return plannedDate === today || plannedDate === tomorrow;
  }), [reminderEntries, reminders, today, tomorrow]);

  useEffect(() => {
    const state = getNotificationCapability();
    setNotificationState(state);
    if (state === "granted") sendDuePreparationNotifications(todayReminders);
  }, [todayReminders]);

  const runMutation = useCallback((task: () => Promise<{ ok: boolean; message?: string }>) => {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setMessage(result.message ?? "操作失败，请稍后重试");
        return;
      }
      setMessage(null);
      await loadWeek();
    });
  }, [loadWeek]);

  function openAdd(date: string, slot: MealSlot) {
    setMessage(null);
    setEditor(newEditor(date, slot, recipes));
  }

  function updateEditor<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  }

  function submitEditor() {
    if (!editor) return;
    const targetServings = Number(editor.targetServings);
    if (!Number.isFinite(targetServings) || targetServings < 0.25 || targetServings > 1000) {
      setMessage("目标份数需要在 0.25 到 1000 之间");
      return;
    }
    let plannedAt: string;
    try {
      plannedAt = localDateTimeToUtc(editor.localDateTime);
    } catch {
      setMessage("请选择有效的开做时间");
      return;
    }
    startTransition(async () => {
      const result = await saveMealPlanEntryAction({
        entryId: editor.entryId,
        recipeId: editor.recipeId,
        mealSlot: editor.mealSlot,
        plannedAt,
        targetServings,
        note: editor.note,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setEditor(null);
      setMessage(null);
      await loadWeek();
    });
  }

  async function enableNotifications() {
    const permission = await requestNotificationPermission();
    setNotificationState(permission);
    if (permission === "granted") {
      sendDuePreparationNotifications(todayReminders);
      setMessage("浏览器提醒已开启；打开应用时会提示到期准备事项。");
    } else if (permission === "denied") {
      setMessage("通知权限已拒绝，应用内提醒仍可正常使用。");
    } else if (permission === "unsupported") {
      setMessage("当前浏览器不支持通知，应用内提醒仍可正常使用。");
    }
  }

  function generateShoppingList() {
    startTransition(async () => {
      const result = await generateMealPlanShoppingListAction(range);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push("/shopping");
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">安排一周，准备更从容</p>
          <h1 className="text-3xl font-semibold tracking-tight">周菜单</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending || entries.length === 0} onClick={generateShoppingList} variant="outline">
            <ShoppingBasket aria-hidden="true" />生成购物清单
          </Button>
          {notificationState !== "granted" ? (
            <Button onClick={() => void enableNotifications()} variant="outline">
              {notificationState === "denied" ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
              开启浏览器提醒
            </Button>
          ) : (
            <Badge variant="secondary"><Bell aria-hidden="true" />提醒已开启</Badge>
          )}
        </div>
      </header>

      {message ? <div aria-live="polite" className="rounded-xl border bg-muted/50 p-3 text-sm">{message}</div> : null}
      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          还没有可安排的菜谱。请先到“菜谱”中新建或从来源生成菜谱。
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>今天需要准备</CardTitle>
          <CardDescription>精确时间按计划自动计算；文字时间保持原样，不会替你猜测。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayReminders.length === 0 ? (
            <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">今天暂时没有提前准备事项。</p>
          ) : todayReminders.map((reminder) => {
            const stateLabel = reminder.state === "overdue" ? "已逾期" : reminder.state === "due" ? "已到时间" : reminder.state === "upcoming" ? "即将开始" : reminder.timingText;
            return (
              <div className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" key={`${reminder.entryId}-${reminder.preparationId}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{reminder.recipeTitle}</strong>
                    <Badge variant={reminder.state === "overdue" ? "destructive" : "outline"}>{stateLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm">{reminder.instruction}</p>
                  {reminder.dueAt ? <p className="text-xs text-muted-foreground">准备时间 {formatTime(reminder.dueAt)}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPending} onClick={() => runMutation(() => setMealPlanStatusAction({ entryId: reminder.entryId, status: "completed" }))} size="sm">完成</Button>
                  <Button disabled={isPending} onClick={() => runMutation(() => setMealPlanStatusAction({ entryId: reminder.entryId, status: "skipped" }))} size="sm" variant="outline">跳过</Button>
                  <Button onClick={() => {
                    const item = entries.find((entry) => entry.id === reminder.entryId);
                    if (item) setEditor(editEntry(item));
                  }} size="sm" variant="ghost">重新安排</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section aria-label="周菜单安排" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button aria-label="上一周" onClick={() => setAnchorDate(shiftDate(anchorDate, -7))} size="icon" variant="outline"><ChevronLeft /></Button>
          <div className="text-center">
            <p className="font-medium">{weekDays[0]} 至 {weekDays[6]}</p>
            <Button onClick={() => setAnchorDate(formatLocalDate(new Date()))} size="sm" variant="ghost">回到本周</Button>
          </div>
          <Button aria-label="下一周" onClick={() => setAnchorDate(shiftDate(anchorDate, 7))} size="icon" variant="outline"><ChevronRight /></Button>
        </div>

        {isLoading ? <p aria-live="polite" className="rounded-xl border p-8 text-center text-muted-foreground">正在加载本周菜单…</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {weekDays.map((day) => (
              <Card key={day}>
                <CardHeader className={day === today ? "bg-accent/50" : undefined}>
                  <CardTitle>{formatDay(day)}{day === today ? " · 今天" : ""}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
                    const slotEntries = entries.filter((entry) => entry.mealSlot === slot && formatLocalDate(new Date(entry.plannedAt)) === day);
                    return (
                      <section aria-label={`${formatDay(day)}${SLOT_LABELS[slot]}`} className="space-y-2" key={slot}>
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-semibold">{SLOT_LABELS[slot]}</h2>
                          <Button aria-label={`添加${SLOT_LABELS[slot]} ${day}`} disabled={recipes.length === 0} onClick={() => openAdd(day, slot)} size="icon-xs" variant="ghost"><CalendarPlus /></Button>
                        </div>
                        {slotEntries.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">尚未安排</p> : slotEntries.map((entry) => (
                          <div className="rounded-lg border bg-background p-3" key={entry.id}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{entry.recipeTitle}</p>
                                <p className="text-xs text-muted-foreground">{formatTime(entry.plannedAt)} · {entry.targetServings} 份</p>
                              </div>
                              <Badge variant={entry.status === "planned" ? "outline" : "secondary"}>{STATUS_LABELS[entry.status]}</Badge>
                            </div>
                            {entry.note ? <p className="mt-2 text-xs">备注：{entry.note}</p> : null}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Button onClick={() => setEditor(editEntry(entry))} size="xs" variant="ghost">编辑</Button>
                              {entry.status === "planned" ? <>
                                <Button disabled={isPending} onClick={() => runMutation(() => setMealPlanStatusAction({ entryId: entry.id, status: "completed" }))} size="xs" variant="ghost">完成</Button>
                                <Button disabled={isPending} onClick={() => runMutation(() => setMealPlanStatusAction({ entryId: entry.id, status: "skipped" }))} size="xs" variant="ghost">跳过</Button>
                              </> : (
                                <Button disabled={isPending} onClick={() => runMutation(() => setMealPlanStatusAction({ entryId: entry.id, status: "planned" }))} size="xs" variant="ghost">恢复</Button>
                              )}
                              <Button disabled={isPending} onClick={() => {
                                if (window.confirm(`确定删除“${entry.recipeTitle}”的这条安排吗？`)) {
                                  runMutation(() => deleteMealPlanEntryAction({ entryId: entry.id }));
                                }
                              }} size="xs" variant="destructive">删除</Button>
                            </div>
                          </div>
                        ))}
                      </section>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog onOpenChange={(open) => { if (!open) setEditor(null); }} open={editor !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor?.entryId ? "调整菜单" : "添加菜单"}</DialogTitle>
            <DialogDescription>时间按当前设备时区显示，保存时会自动转换为 UTC。</DialogDescription>
          </DialogHeader>
          {editor ? <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-recipe">菜谱</Label>
              <select className="h-9 w-full rounded-lg border bg-background px-3 text-sm" id="plan-recipe" onChange={(event) => {
                const recipe = recipes.find((item) => item.id === event.target.value);
                updateEditor("recipeId", event.target.value);
                if (!editor.entryId && recipe) updateEditor("targetServings", String(recipe.baseServings));
              }} value={editor.recipeId}>
                {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-slot">餐次</Label>
              <select className="h-9 w-full rounded-lg border bg-background px-3 text-sm" id="plan-slot" onChange={(event) => updateEditor("mealSlot", event.target.value as MealSlot)} value={editor.mealSlot}>
                <option value="breakfast">早餐</option><option value="lunch">午餐</option><option value="dinner">晚餐</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-time">开做时间</Label>
              <Input id="plan-time" onChange={(event) => updateEditor("localDateTime", event.target.value)} type="datetime-local" value={editor.localDateTime} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-servings">目标份数</Label>
              <Input id="plan-servings" max="1000" min="0.25" onChange={(event) => updateEditor("targetServings", event.target.value)} step="0.25" type="number" value={editor.targetServings} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-note">备注</Label>
              <Textarea id="plan-note" maxLength={500} onChange={(event) => updateEditor("note", event.target.value)} placeholder="例如：少盐、带饭" value={editor.note} />
            </div>
          </div> : null}
          <DialogFooter>
            <Button disabled={isPending || !editor?.recipeId || Number(editor?.targetServings) < 0.25} onClick={submitEditor}>保存安排</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
