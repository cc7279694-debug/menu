import type { RecipeListQuery } from "@/features/recipes/query-params";

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
    </form>
  );
}
