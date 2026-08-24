"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShoppingRecipeOption } from "@/features/shopping/types";

export type SelectedShoppingRecipe = {
  recipe: ShoppingRecipeOption;
  servings: string;
};

type RecipeSelectionListProps = {
  recipes: ShoppingRecipeOption[];
  selectedRecipes: SelectedShoppingRecipe[];
  selectedIds: ReadonlySet<string>;
  maxReached: boolean;
  disabled?: boolean;
  servingErrors: ReadonlyMap<string, string>;
  onToggleRecipe: (recipe: ShoppingRecipeOption) => void;
  onServingsChange: (recipeId: string, value: string) => void;
};

export function RecipeSelectionList({
  recipes,
  selectedRecipes,
  selectedIds,
  maxReached,
  disabled = false,
  servingErrors,
  onToggleRecipe,
  onServingsChange,
}: RecipeSelectionListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <section aria-label="菜谱搜索结果" className="min-w-0 space-y-2">
        <div className="text-sm font-medium">可选菜谱</div>
        {recipes.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            没有找到匹配的菜谱
          </p>
        ) : (
          <ul className="space-y-2">
            {recipes.map((recipe) => {
              const checked = selectedIds.has(recipe.id);
              const isDisabled = disabled || (maxReached && !checked);
              return (
                <li className="rounded-lg border bg-background p-3" key={recipe.id}>
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      aria-describedby={isDisabled && maxReached && !checked ? "shopping-generator-limit" : undefined}
                      checked={checked}
                      disabled={isDisabled}
                      id={`shopping-recipe-${recipe.id}`}
                      onCheckedChange={() => onToggleRecipe(recipe)}
                    />
                    <div className="min-w-0 flex-1">
                      <Label className="leading-5" htmlFor={`shopping-recipe-${recipe.id}`}>
                        <span className="truncate">{recipe.title}</span>
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        默认 {recipe.baseServings} 人份
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {maxReached && (
          <p className="text-sm text-muted-foreground" id="shopping-generator-limit">
            最多一次选择 20 道菜。
          </p>
        )}
      </section>

      <section aria-label="已选菜谱" className="min-w-0 space-y-2">
        <div className="text-sm font-medium">已选菜谱</div>
        {selectedRecipes.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            先选择 1 道菜谱。
          </p>
        ) : (
          <ul className="space-y-3">
            {selectedRecipes.map(({ recipe, servings }) => {
              const error = servingErrors.get(recipe.id);
              return (
                <li className="rounded-lg border bg-muted/30 p-3" key={recipe.id}>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{recipe.title}</div>
                    <div className="space-y-1">
                      <Label htmlFor={`shopping-servings-${recipe.id}`}>
                        {recipe.title} 目标份数
                      </Label>
                      <Input
                        aria-describedby={error ? `shopping-servings-error-${recipe.id}` : undefined}
                        aria-invalid={Boolean(error)}
                        className="min-h-11"
                        id={`shopping-servings-${recipe.id}`}
                        disabled={disabled}
                        max={1000}
                        min={0.25}
                        onChange={(event) => onServingsChange(recipe.id, event.target.value)}
                        step="0.01"
                        type="number"
                        value={servings}
                      />
                      {error && (
                        <p className="text-sm text-destructive" id={`shopping-servings-error-${recipe.id}`}>
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
