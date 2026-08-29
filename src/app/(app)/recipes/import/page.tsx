import { ImportForm } from "@/features/recipe-imports/components/import-form";
import { cleanupExpiredRecipeImports } from "@/features/recipe-imports/queries";

export default async function RecipeImportPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  await cleanupExpiredRecipeImports();
  const params = await searchParams;
  const initialMode = params.mode === "images" || params.mode === "text" ? params.mode : "url";
  return <main className="mx-auto max-w-2xl space-y-5"><div><p className="text-sm text-muted-foreground">来源导入</p><h1 className="text-3xl font-semibold">生成菜谱卡</h1><p className="mt-2 text-muted-foreground">粘贴公开链接、菜谱文字或截图，整理后仍可在保存前逐项修改。</p></div><ImportForm initialMode={initialMode} /></main>;
}
