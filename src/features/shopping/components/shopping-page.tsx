"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearCompletedShoppingItemsAction,
  deleteShoppingItemAction,
  reorderShoppingItemsAction,
  saveShoppingItemAction,
  setShoppingItemCheckedAction,
} from "@/features/shopping/actions";
import { ShoppingGenerator } from "@/features/shopping/components/shopping-generator";
import { ShoppingItemEditor, type ShoppingItemEditorValue } from "@/features/shopping/components/shopping-item-editor";
import { ShoppingListView } from "@/features/shopping/components/shopping-list-view";
import type { ShoppingActiveList, ShoppingListItemSummary, ShoppingRecipeOption } from "@/features/shopping/types";

type ShoppingPageProps = {
  currentList: ShoppingActiveList | null;
  initialRecipes: ShoppingRecipeOption[];
};

type PendingControl = {
  kind: "toggle" | "save" | "delete" | "clear" | "reorder";
  id?: string;
} | null;

type ConfirmState =
  | { kind: "delete"; item: ShoppingListItemSummary }
  | { kind: "clear" }
  | null;

function sortItems(items: ShoppingListItemSummary[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.id.localeCompare(right.id, "en-US");
  });
}

function normalizeOrder(items: ShoppingListItemSummary[]) {
  return sortItems(items).map((item, index) => ({ ...item, sortOrder: index }));
}

function replaceItem(
  items: ShoppingListItemSummary[],
  itemId: string,
  update: (item: ShoppingListItemSummary) => ShoppingListItemSummary,
) {
  return normalizeOrder(items.map((item) => (item.id === itemId ? update(item) : item)));
}

function addManualItem(
  items: ShoppingListItemSummary[],
  value: ShoppingItemEditorValue,
  itemId: string,
): ShoppingListItemSummary[] {
  const nextSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  return normalizeOrder([
    ...items,
    {
      id: itemId,
      ingredientId: null,
      nameSnapshot: value.nameSnapshot,
      quantity: value.quantity,
      quantityText: value.quantityText,
      unit: value.unit,
      aisle: value.aisle,
      isChecked: false,
      isManual: true,
      sortOrder: nextSortOrder,
      sources: [],
    },
  ]);
}

export function ShoppingPage({ currentList, initialRecipes }: ShoppingPageProps) {
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<ShoppingListItemSummary[]>(() => currentList?.items ?? []);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingControl, setPendingControl] = useState<PendingControl>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItemSummary | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  useEffect(() => {
    setItems(currentList?.items ?? []);
    setStatusMessage(null);
    setPendingControl(null);
    setEditorOpen(false);
    setEditingItem(null);
    setConfirmState(null);
  }, [currentList]);

  const sortedItems = useMemo(() => sortItems(items), [items]);
  const checkedCount = items.filter((item) => item.isChecked).length;
  const totalCount = items.length;
  const uncheckedCount = totalCount - checkedCount;
  const hasCompleted = checkedCount > 0;
  const pendingDelete = pendingControl?.kind === "delete";
  const pendingClear = pendingControl?.kind === "clear";

  function runMutation<T>(
    pending: PendingControl,
    action: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>,
    onSuccess: (data: T) => void,
  ) {
    setStatusMessage(null);
    setPendingControl(pending);
    startTransition(() => {
      void (async () => {
        const result = await action();
        if (result.ok) {
          onSuccess(result.data);
        } else {
          setStatusMessage(result.message);
        }
        setPendingControl(null);
      })();
    });
  }

  function handleToggle(item: ShoppingListItemSummary, isChecked: boolean) {
    if (!currentList) return;
    runMutation(
      { kind: "toggle", id: item.id },
      () => setShoppingItemCheckedAction({
        shoppingListId: currentList.id,
        itemId: item.id,
        isChecked,
      }),
      () => setItems((current) => replaceItem(current, item.id, (currentItem) => ({ ...currentItem, isChecked }))),
    );
  }

  function handleReorder(itemId: string, direction: "up" | "down") {
    if (!currentList) return;
    const currentOrder = sortItems(items);
    const currentIndex = currentOrder.findIndex((item) => item.id === itemId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
    const itemIds = nextOrder.map((item) => item.id);
    runMutation(
      { kind: "reorder", id: itemId },
      () => reorderShoppingItemsAction({ shoppingListId: currentList.id, itemIds }),
      () => setItems(nextOrder.map((item, index) => ({ ...item, sortOrder: index }))),
    );
  }

  function openCreateEditor() {
    setEditingItem(null);
    setEditorOpen(true);
  }

  function openEditEditor(item: ShoppingListItemSummary) {
    setEditingItem(item);
    setEditorOpen(true);
  }

  function handleSave(value: ShoppingItemEditorValue) {
    if (!currentList) return;
    const itemId = editingItem?.id ?? null;
    runMutation(
      { kind: "save", id: itemId ?? "new" },
      () => saveShoppingItemAction({
        shoppingListId: currentList.id,
        itemId,
        nameSnapshot: value.nameSnapshot,
        quantity: value.quantity,
        quantityText: value.quantityText,
        unit: value.unit,
        aisle: value.aisle,
      }),
      (data) => {
        setItems((current) => itemId
          ? replaceItem(current, itemId, (item) => ({
            ...item,
            nameSnapshot: value.nameSnapshot,
            quantity: value.quantity,
            quantityText: value.quantityText,
            unit: value.unit,
            aisle: value.aisle,
          }))
          : addManualItem(current, value, data.itemId));
        setEditorOpen(false);
        setEditingItem(null);
      },
    );
  }

  function handleConfirmDelete() {
    if (!currentList || confirmState?.kind !== "delete") return;
    const itemId = confirmState.item.id;
    runMutation(
      { kind: "delete", id: itemId },
      () => deleteShoppingItemAction({ shoppingListId: currentList.id, itemId }),
      () => {
        setItems((current) => normalizeOrder(current.filter((item) => item.id !== itemId)));
        setConfirmState(null);
      },
    );
  }

  function handleConfirmClear() {
    if (!currentList) return;
    runMutation(
      { kind: "clear" },
      () => clearCompletedShoppingItemsAction({ shoppingListId: currentList.id }),
      () => {
        setItems((current) => normalizeOrder(current.filter((item) => !item.isChecked)));
        setConfirmState(null);
      },
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">购物清单</h1>
          <p className="text-sm text-muted-foreground">
            {currentList ? `${currentList.name} · ${totalCount} 项食材` : "按菜谱生成采购清单，也可以补充日常用品。"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {currentList && (
            <p className="text-sm text-muted-foreground">生成新清单会替换当前清单。</p>
          )}
          <ShoppingGenerator initialRecipes={initialRecipes} />
        </div>
      </header>

      {statusMessage && (
        <p aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
          {statusMessage}
        </p>
      )}

      {!currentList ? (
        <section className="rounded-lg border border-dashed bg-muted/20 p-6">
          <h2 className="text-lg font-medium">还没有当前购物清单</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            选择菜谱生成第一份采购清单，之后可手动补充日常用品。
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">待采购</p>
              <p className="mt-1 text-xl font-semibold">未完成 {uncheckedCount} 项</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">完成进度</p>
              <p className="mt-1 text-xl font-semibold">进度 {checkedCount} / {totalCount}</p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-end">
              <Button className="min-h-11" onClick={openCreateEditor} type="button" variant="outline">
                <PlusIcon data-icon="inline-start" />
                添加食材
              </Button>
              <Button
                className="min-h-11"
                disabled={!hasCompleted || pendingClear}
                onClick={() => setConfirmState({ kind: "clear" })}
                type="button"
                variant="outline"
              >
                清理已完成
              </Button>
            </div>
          </div>

          <ShoppingListView
            items={sortedItems}
            onDelete={(item) => setConfirmState({ kind: "delete", item })}
            onEdit={openEditEditor}
            onReorder={handleReorder}
            onToggle={handleToggle}
            pendingControl={pendingControl}
          />
        </section>
      )}

      {currentList && (
        <ShoppingItemEditor
          item={editingItem}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSave={handleSave}
          open={editorOpen}
          pending={pendingControl?.kind === "save"}
        />
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open && !pendingDelete && !pendingClear) setConfirmState(null);
        }}
        open={confirmState !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmState?.kind === "delete" ? "删除食材" : "清理已完成食材"}</DialogTitle>
            <DialogDescription>
              {confirmState?.kind === "delete"
                ? `只会从购物清单删除「${confirmState.item.nameSnapshot}」，不会修改菜谱。`
                : "只会清理当前购物清单中已完成的食材，不会修改菜谱。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="min-h-11"
              disabled={pendingDelete || pendingClear}
              onClick={() => setConfirmState(null)}
              type="button"
              variant="outline"
            >
              取消
            </Button>
            {confirmState?.kind === "delete" ? (
              <Button
                className="min-h-11"
                disabled={pendingDelete}
                onClick={handleConfirmDelete}
                type="button"
                variant="destructive"
              >
                确认删除
              </Button>
            ) : (
              <Button
                className="min-h-11"
                disabled={pendingClear}
                onClick={handleConfirmClear}
                type="button"
                variant="destructive"
              >
                确认清理
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
