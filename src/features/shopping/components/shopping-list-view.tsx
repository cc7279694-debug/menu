import { ShoppingItemRow } from "@/features/shopping/components/shopping-item-row";
import type { ShoppingListItemSummary } from "@/features/shopping/types";

type PendingControl = {
  kind: "toggle" | "save" | "delete" | "clear" | "reorder";
  id?: string;
} | null;

type ShoppingListViewProps = {
  items: ShoppingListItemSummary[];
  offline: boolean;
  pendingControl: PendingControl;
  onToggle: (item: ShoppingListItemSummary, isChecked: boolean) => void;
  onEdit: (item: ShoppingListItemSummary) => void;
  onDelete: (item: ShoppingListItemSummary) => void;
  onReorder: (itemId: string, direction: "up" | "down") => void;
};

type Group = {
  aisle: string;
  items: ShoppingListItemSummary[];
  firstSortOrder: number;
  unclassified: boolean;
};

function buildGroups(items: ShoppingListItemSummary[]): Group[] {
  const groups = new Map<string, Group>();

  for (const item of items) {
    const aisle = item.aisle?.trim() || "未分类";
    const unclassified = aisle === "未分类";
    const group = groups.get(aisle) ?? {
      aisle,
      items: [],
      firstSortOrder: item.sortOrder,
      unclassified,
    };
    group.items.push(item);
    group.firstSortOrder = Math.min(group.firstSortOrder, item.sortOrder);
    groups.set(aisle, group);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.unclassified !== right.unclassified) return left.unclassified ? 1 : -1;
    if (left.firstSortOrder !== right.firstSortOrder) return left.firstSortOrder - right.firstSortOrder;
    return left.aisle.localeCompare(right.aisle, "zh-Hans-CN");
  });
}

export function ShoppingListView({
  items,
  offline,
  pendingControl,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: ShoppingListViewProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        当前清单没有食材。可以添加食材，或重新生成购物清单。
      </p>
    );
  }

  const groups = buildGroups(items);
  const orderedIds = items.map((item) => item.id);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section className="space-y-2" key={group.aisle}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{group.aisle}</h2>
            <span className="text-sm text-muted-foreground">{group.items.length} 项</span>
          </div>
          <ul className="space-y-2">
            {group.items.map((item) => {
              const index = orderedIds.indexOf(item.id);
              return (
                <ShoppingItemRow
                  canMoveDown={index < orderedIds.length - 1}
                  canMoveUp={index > 0}
                  item={item}
                  key={item.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReorder={onReorder}
                  onToggle={onToggle}
                  offline={offline}
                  pendingControl={pendingControl}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
