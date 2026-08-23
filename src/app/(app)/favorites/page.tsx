import { RecipeListPage } from "@/features/recipes/components/recipe-list-page";

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <RecipeListPage favoriteOnly searchParams={searchParams} title="我的收藏" />;
}
