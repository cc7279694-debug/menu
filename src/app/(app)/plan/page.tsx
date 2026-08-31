import { MealPlanPage } from "@/features/meal-plans/components/meal-plan-page";
import { listMealPlanRecipeOptions } from "@/features/meal-plans/queries";

export default async function PlanRoutePage() {
  const recipes = await listMealPlanRecipeOptions();
  return <MealPlanPage recipes={recipes} />;
}
