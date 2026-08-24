import { ShoppingPage } from "@/features/shopping/components/shopping-page";
import { getActiveShoppingList, searchShoppingRecipeOptions } from "@/features/shopping/queries";

export default async function ShoppingRoutePage() {
  const [currentList, initialRecipes] = await Promise.all([
    getActiveShoppingList(),
    searchShoppingRecipeOptions(""),
  ]);

  return <ShoppingPage currentList={currentList} initialRecipes={initialRecipes} />;
}
