import Link from "next/link";

export function RecipeListEmpty({ mode }: { mode: "all" | "filtered" | "trash" }) {
  if (mode === "trash") {
    return <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">回收站还是空的</h2><p className="mt-2 text-sm text-muted-foreground">被移入回收站的菜谱会显示在这里。</p></div>;
  }
  if (mode === "filtered") {
    return <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">没有找到匹配的菜谱</h2><p className="mt-2 text-sm text-muted-foreground">试试换一个关键词或清除筛选条件。</p><Link className="mt-4 inline-block text-sm underline" href="/recipes">清除筛选</Link></div>;
  }
  return <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">还没有菜谱</h2><p className="mt-2 text-sm text-muted-foreground">把你的第一个做菜步骤记录下来。</p><Link className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" href="/recipes/new">新建菜谱</Link></div>;
}
