import { ShoppingPage } from "@/features/shopping/components/shopping-page";
import { getActiveShoppingList, searchShoppingRecipeOptions } from "@/features/shopping/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export default async function ShoppingRoutePage() {
  const [currentList, initialRecipes, authContext] = await Promise.all([
    getActiveShoppingList(),
    searchShoppingRecipeOptions(""),
    getServerAuthContext(),
  ]);

  if (authContext.error || !authContext.user) {
    throw new Error("请先登录后再查看购物清单");
  }

  return <ShoppingPage currentList={currentList} initialRecipes={initialRecipes} userId={authContext.user.id} />;
}
