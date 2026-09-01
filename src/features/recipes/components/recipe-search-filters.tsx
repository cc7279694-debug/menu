import type { RecipeListQuery } from "@/features/recipes/query-params";
import Link from "next/link";
import { DIET_GOALS, findDietGoalTag } from "@/features/recipes/diet-goals";

type TaxonomyOption = { id: string; name: string };

export function RecipeSearchFilters({
  current,
  categories,
  tags,
}: {
  current: RecipeListQuery;
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
}) {
  const buildGoalHref = (tagId: string | null) => {
    const params = new URLSearchParams();
    if (current.query) params.set("q", current.query);
    if (current.categoryId) params.set("category", current.categoryId);
    if (current.favoriteOnly) params.set("favorite", "1");
    if (current.deletedOnly) params.set("view", "trash");
    if (tagId) params.set("tag", tagId);
    const search = params.toString();
    return `${current.favoriteOnly ? "/favorites" : "/recipes"}${search ? `?${search}` : ""}`;
  };

  return (
    <form aria-label="菜谱搜索" className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_0.7fr_0.7fr_auto]" method="get" role="search">
      <label className="sr-only" htmlFor="recipe-search">搜索菜谱、食材或标签</label>
      <input className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue={current.query} id="recipe-search" name="q" placeholder="搜索菜名、食材或标签" />
      <label className="sr-only" htmlFor="recipe-category-filter">分类</label>
      <select className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue={current.categoryId ?? ""} id="recipe-category-filter" name="category" aria-label="分类"><option value="">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <label className="sr-only" htmlFor="recipe-tag-filter">标签</label>
      <select className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue={current.tagId ?? ""} id="recipe-tag-filter" name="tag" aria-label="标签"><option value="">全部标签</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select>
      {current.favoriteOnly && <input name="favorite" type="hidden" value="1" />}
      {current.deletedOnly && <input name="view" type="hidden" value="trash" />}
      <button className="h-10 rounded-lg bg-primary px-4 text-sm text-primary-foreground" type="submit">搜索</button>
      <div className="space-y-2 md:col-span-full" aria-label="饮食目标快捷筛选">
        <p className="text-sm font-medium">饮食目标</p>
        <div className="flex flex-wrap gap-2">
          {DIET_GOALS.map((goal) => {
            const tag = findDietGoalTag(tags, goal.name);
            if (!tag) return null;
            const selected = current.tagId === tag.id;
            return (
              <Link
                aria-current={selected ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                href={buildGoalHref(selected ? null : tag.id)}
                key={goal.name}
                title={goal.description}
              >
                {goal.name}
              </Link>
            );
          })}
          {!DIET_GOALS.some((goal) => findDietGoalTag(tags, goal.name)) && (
            <span className="text-sm text-muted-foreground">在菜谱编辑页创建“减脂 / 增肌 / 高蛋白”标签后即可快捷筛选。</span>
          )}
        </div>
      </div>
    </form>
  );
}
