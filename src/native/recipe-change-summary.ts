import type { RecipeChange } from "./cooking-model";
const label = (v: string | number | null) =>
  v === null ? "未记录" : v === "" ? "未填写" : String(v);
export function summarizeRecipeChange({
  before,
  after,
}: RecipeChange): string[] {
  const lines: string[] = [];
  const scalar = (
    name: string,
    old: string | number | null,
    next: string | number | null,
    unit = "",
  ) => {
    if (old !== next)
      lines.push(
        `${name}：${label(old)}${old === null ? "" : unit} → ${label(next)}${next === null ? "" : unit}`,
      );
  };
  scalar("菜名", before.title, after.title);
  scalar("总耗时", before.totalMinutes, after.totalMinutes, " 分钟");
  scalar("份数", before.servings, after.servings);
  scalar(
    "每份热量",
    before.caloriesPerServing,
    after.caloriesPerServing,
    " kcal",
  );
  scalar("个人备注", before.notes, after.notes);
  if (before.coverPath !== after.coverPath)
    lines.push(
      `封面：${before.coverPath ? "已设置" : "未设置"} → ${after.coverPath ? (before.coverPath ? "更换图片" : "已设置") : "移除图片"}`,
    );
  for (
    let i = 0;
    i < Math.max(before.ingredients.length, after.ingredients.length);
    i++
  ) {
    const a = before.ingredients[i],
      b = after.ingredients[i];
    if (a?.name === b?.name && a && b) scalar(a.name, a.amount, b.amount);
    else if (a || b)
      lines.push(
        `食材 ${i + 1}：${a ? `${a.name} ${a.amount}` : "未添加"} → ${b ? `${b.name} ${b.amount}` : "删除"}`,
      );
  }
  for (let i = 0; i < Math.max(before.steps.length, after.steps.length); i++) {
    const a = before.steps[i],
      b = after.steps[i];
    scalar(`步骤 ${i + 1}`, a?.instruction ?? null, b?.instruction ?? null);
    if ((a?.imagePath ?? null) !== (b?.imagePath ?? null))
      lines.push(
        `步骤图片 ${i + 1}：${a?.imagePath ? "已设置" : "未设置"} → ${b?.imagePath ? (a?.imagePath ? "更换图片" : "已设置") : "移除图片"}`,
      );
  }
  const groups = ["preparations", "keyTips"] as const;
  for (const group of groups)
    for (
      let i = 0;
      i < Math.max(before[group].length, after[group].length);
      i++
    ) {
      const a = before[group][i],
        b = after[group][i];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const describe = (item: typeof a) =>
        !item
          ? "未记录"
          : "minutes" in item
            ? `${item.instruction}${item.minutes !== null ? `（${item.minutes} 分钟）` : ""}${item.timingText ? `（${item.timingText}）` : ""}`
            : `${item.instruction}${item.stepNumber !== null ? `（步骤 ${item.stepNumber}）` : "（全菜）"}`;
      lines.push(
        `${group === "preparations" ? "提前准备" : "关键事项"} ${i + 1}：${describe(a)} → ${b ? describe(b) : "删除"}`,
      );
    }
  return lines;
}
