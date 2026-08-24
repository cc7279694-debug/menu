import { ArrowDownIcon, ArrowUpIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatIngredientAmount } from "@/features/ingredients/quantities";
import type { ShoppingListItemSummary } from "@/features/shopping/types";
import { cn } from "@/lib/utils";

type PendingControl = {
  kind: "toggle" | "save" | "delete" | "clear" | "reorder";
  id?: string;
} | null;

type ShoppingItemRowProps = {
  item: ShoppingListItemSummary;
  pendingControl: PendingControl;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: (item: ShoppingListItemSummary, isChecked: boolean) => void;
  onEdit: (item: ShoppingListItemSummary) => void;
  onDelete: (item: ShoppingListItemSummary) => void;
  onReorder: (itemId: string, direction: "up" | "down") => void;
};

export function ShoppingItemRow({
  item,
  pendingControl,
  canMoveUp,
  canMoveDown,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: ShoppingItemRowProps) {
  const amount = formatIngredientAmount(item.quantity, item.quantityText, item.unit);
  const togglePending = pendingControl?.kind === "toggle" && pendingControl.id === item.id;
  const reorderPending = pendingControl?.kind === "reorder" && pendingControl.id === item.id;

  return (
    <li
      aria-label={`${item.nameSnapshot} ${amount} ${item.aisle ?? "未分类"}`}
      className={cn(
        "rounded-lg border bg-background p-3 transition-colors",
        item.isChecked && "bg-muted/35 text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Checkbox
            aria-label={`${item.nameSnapshot} 标记为${item.isChecked ? "未完成" : "已完成"}`}
            checked={item.isChecked}
            className="mt-1"
            disabled={togglePending}
            onCheckedChange={(checked) => onToggle(item, Boolean(checked))}
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn("text-sm font-semibold", item.isChecked && "line-through")}>
                {item.nameSnapshot}
              </h3>
              <Badge variant="secondary">{amount}</Badge>
              {item.isManual && <Badge variant="outline">手动</Badge>}
            </div>
            {item.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.sources.map((source) => (
                  <Badge key={source.id} variant="outline">
                    {source.recipeTitleSnapshot}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:flex sm:justify-end">
          <Button
            aria-label={`上移${item.nameSnapshot}`}
            className="min-h-11 min-w-11"
            disabled={!canMoveUp || reorderPending}
            onClick={() => onReorder(item.id, "up")}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            aria-label={`下移${item.nameSnapshot}`}
            className="min-h-11 min-w-11"
            disabled={!canMoveDown || reorderPending}
            onClick={() => onReorder(item.id, "down")}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowDownIcon />
          </Button>
          <Button
            aria-label={`编辑${item.nameSnapshot}`}
            className="min-h-11 min-w-11"
            onClick={() => onEdit(item)}
            size="icon"
            type="button"
            variant="outline"
          >
            <PencilIcon />
          </Button>
          <Button
            aria-label={`删除${item.nameSnapshot}`}
            className="min-h-11 min-w-11"
            onClick={() => onDelete(item)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </li>
  );
}
