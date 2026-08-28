"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { queueShoppingToggle } from "@/features/offline/database";
import type { OfflineShoppingSnapshot } from "@/features/offline/types";

export function OfflineShoppingList({ userId, snapshot }: { userId: string; snapshot: OfflineShoppingSnapshot }) {
  const [items, setItems] = useState(snapshot.list.items);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  async function toggle(itemId: string, checked: boolean) {
    setPendingIds((current) => new Set(current).add(itemId));
    setStatus(null);
    try {
      await queueShoppingToggle({ userId, listId: snapshot.listId, itemId, targetChecked: checked });
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, isChecked: checked } : item));
      setStatus("待同步");
    } catch {
      setStatus("离线操作保存失败，请重试。");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{snapshot.list.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">离线购物清单 · 只能勾选状态，其他编辑操作联网后可用。</p>
      </header>
      {status && <p aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">{status}</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li className="flex min-h-14 items-center gap-3 rounded-xl border bg-card p-3" key={item.id}>
            <Checkbox
              aria-label={`${item.nameSnapshot} 标记为${item.isChecked ? "未完成" : "已完成"}`}
              checked={item.isChecked}
              className="size-5 after:-inset-3"
              disabled={pendingIds.has(item.id)}
              onCheckedChange={(checked) => { void toggle(item.id, Boolean(checked)); }}
            />
            <span className={item.isChecked ? "text-sm text-muted-foreground line-through" : "text-sm"}>{item.nameSnapshot}</span>
            <span className="ml-auto text-xs text-muted-foreground">{item.quantityText ?? item.quantity ?? "适量"}{item.unit ? ` ${item.unit}` : ""}</span>
            {pendingIds.has(item.id) && <span className="text-xs text-muted-foreground">同步中</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
