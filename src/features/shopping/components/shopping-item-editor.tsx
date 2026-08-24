import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import type { ShoppingListItemSummary } from "@/features/shopping/types";

export type ShoppingItemEditorValue = {
  nameSnapshot: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  aisle: string | null;
};

type ShoppingItemEditorProps = {
  open: boolean;
  item: ShoppingListItemSummary | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: ShoppingItemEditorValue) => void;
};

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatQuantityInput(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(3)));
}

export function ShoppingItemEditor({
  open,
  item,
  pending,
  onOpenChange,
  onSave,
}: ShoppingItemEditorProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [unit, setUnit] = useState("");
  const [aisle, setAisle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(item?.nameSnapshot ?? "");
    setQuantity(formatQuantityInput(item?.quantity ?? null));
    setQuantityText(item?.quantityText ?? "");
    setUnit(item?.unit ?? "");
    setAisle(item?.aisle ?? "");
    setError(null);
  }, [item, open]);

  const numericFilled = quantity.trim().length > 0;
  const textFilled = quantityText.trim().length > 0;
  const canSave = useMemo(() => name.trim().length > 0 && !pending, [name, pending]);

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请填写食材名称");
      return;
    }

    const parsedQuantity = numericFilled ? Number(quantity) : null;
    if (parsedQuantity !== null && (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0)) {
      setError("数字数量需要大于 0");
      return;
    }

    onSave({
      nameSnapshot: trimmedName,
      quantity: parsedQuantity,
      quantityText: nullableText(quantityText),
      unit: nullableText(unit),
      aisle: nullableText(aisle),
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "编辑食材" : "添加食材"}</DialogTitle>
          <DialogDescription>
            数字数量和文本数量只能填写一种，区域会保存为当前购物清单的分组快照。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {error && (
            <p aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="status">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="shopping-item-name">食材名称</Label>
            <Input
              className="min-h-11"
              disabled={pending}
              id="shopping-item-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="shopping-item-quantity">数字数量</Label>
              <Input
                className="min-h-11"
                disabled={pending || textFilled}
                id="shopping-item-quantity"
                min="0"
                onChange={(event) => setQuantity(event.target.value)}
                step="0.001"
                type="number"
                value={quantity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shopping-item-quantity-text">文本数量</Label>
              <Input
                className="min-h-11"
                disabled={pending || numericFilled}
                id="shopping-item-quantity-text"
                onChange={(event) => setQuantityText(event.target.value)}
                value={quantityText}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="shopping-item-unit">单位</Label>
              <Input
                className="min-h-11"
                disabled={pending}
                id="shopping-item-unit"
                onChange={(event) => setUnit(event.target.value)}
                value={unit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shopping-item-aisle">区域</Label>
              <Input
                className="min-h-11"
                disabled={pending}
                id="shopping-item-aisle"
                onChange={(event) => setAisle(event.target.value)}
                value={aisle}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="min-h-11" disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">
            取消
          </Button>
          <Button className="min-h-11" disabled={!canSave} onClick={handleSubmit} type="button">
            {pending ? "保存中..." : "保存食材"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
