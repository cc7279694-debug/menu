import { RecipeListPage } from "@/features/recipes/components/recipe-list-page";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <RecipeListPage searchParams={searchParams} title="我的菜谱" />;
}
