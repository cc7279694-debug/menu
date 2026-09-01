export const DIET_GOALS = [
  { name: "减脂", description: "更轻盈的日常搭配" },
  { name: "增肌", description: "适合训练期记录" },
  { name: "高蛋白", description: "优先关注蛋白质" },
] as const;

export function findDietGoalTag(
  tags: Array<{ id: string; name: string }>,
  goalName: string,
) {
  const normalizedGoal = goalName.trim().toLocaleLowerCase("zh-CN");
  return tags.find((tag) => tag.name.trim().toLocaleLowerCase("zh-CN") === normalizedGoal) ?? null;
}
