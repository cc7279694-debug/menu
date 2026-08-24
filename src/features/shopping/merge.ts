import { scaleQuantity } from "@/features/ingredients/quantities";

import type {
  ShoppingContribution,
  ShoppingDraftItem,
  ShoppingDraftItemSource,
  ShoppingGenerationRecipe,
  ShoppingRecipeSelection,
} from "@/features/shopping/types";

const UNCATEGORIZED_AISLE = "未分类";

function roundShoppingQuantity(quantity: number): number {
  return Number(quantity.toFixed(3));
}

function sanitizeShoppingText(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  return normalized || null;
}

function toShoppingSource(contribution: ShoppingContribution): ShoppingDraftItemSource {
  return {
    recipeId: contribution.recipeId,
    recipeTitleSnapshot: contribution.recipeTitleSnapshot,
    selectedServings: contribution.selectedServings,
    recipeIngredientId: contribution.recipeIngredientId,
    quantityContribution: contribution.quantity,
    quantityTextContribution: contribution.quantityText,
    unitSnapshot: contribution.unit,
    aisleSnapshot: contribution.aisle,
    recipeOrder: contribution.recipeOrder,
    recipeIngredientOrder: contribution.recipeIngredientOrder,
  };
}

function compareDraftItems(left: ShoppingDraftItem, right: ShoppingDraftItem) {
  const leftAisle = left.aisle ?? UNCATEGORIZED_AISLE;
  const rightAisle = right.aisle ?? UNCATEGORIZED_AISLE;
  if (leftAisle !== rightAisle) {
    if (leftAisle === UNCATEGORIZED_AISLE) return 1;
    if (rightAisle === UNCATEGORIZED_AISLE) return -1;
    return leftAisle.localeCompare(rightAisle, "zh-CN");
  }

  const leftSource = left.sources[0];
  const rightSource = right.sources[0];
  if (leftSource.recipeOrder !== rightSource.recipeOrder) {
    return leftSource.recipeOrder - rightSource.recipeOrder;
  }
  if (leftSource.recipeIngredientOrder !== rightSource.recipeIngredientOrder) {
    return leftSource.recipeIngredientOrder - rightSource.recipeIngredientOrder;
  }
  return left.nameSnapshot.localeCompare(right.nameSnapshot, "zh-CN");
}

function canMergeContribution(contribution: ShoppingContribution): boolean {
  return !contribution.isManual
    && contribution.ingredientId !== null
    && contribution.quantity !== null
    && Number.isFinite(contribution.quantity)
    && contribution.quantity > 0
    && contribution.quantityText === null;
}

export function normalizeShoppingUnit(unit: string | null): string | null {
  const normalized = sanitizeShoppingText(unit);
  return normalized ? normalized.toLocaleLowerCase("en-US") : null;
}

export function buildShoppingContributions(
  recipes: ShoppingGenerationRecipe[],
  selections: ShoppingRecipeSelection[],
): ShoppingContribution[] {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return selections.flatMap((selection, recipeOrder) => {
    const recipe = recipeMap.get(selection.recipeId);
    if (!recipe) return [];

    return [...recipe.ingredients]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((ingredient) => ({
        recipeId: recipe.id,
        recipeTitleSnapshot: recipe.title,
        selectedServings: selection.selectedServings,
        recipeOrder,
        recipeIngredientId: ingredient.recipeIngredientId,
        ingredientId: ingredient.ingredientId,
        nameSnapshot: ingredient.name,
        quantity: ingredient.quantity === null
          ? null
          : roundShoppingQuantity(scaleQuantity(ingredient.quantity, recipe.baseServings, selection.selectedServings)),
        quantityText: sanitizeShoppingText(ingredient.quantityText),
        unit: sanitizeShoppingText(ingredient.unit),
        normalizedUnit: normalizeShoppingUnit(ingredient.unit),
        aisle: sanitizeShoppingText(ingredient.aisle) ?? UNCATEGORIZED_AISLE,
        recipeIngredientOrder: ingredient.sortOrder,
        isManual: false,
      }));
  });
}

export function mergeShoppingContributions(
  contributions: ShoppingContribution[],
  excludedRecipeIngredientIds: ReadonlySet<string>,
): ShoppingDraftItem[] {
  const grouped = new Map<string, ShoppingDraftItem>();

  for (const contribution of contributions) {
    if (excludedRecipeIngredientIds.has(contribution.recipeIngredientId)) continue;

    const source = toShoppingSource(contribution);
    const mergeKey = canMergeContribution(contribution)
      ? `merge:${contribution.ingredientId}:${contribution.normalizedUnit ?? ""}`
      : `single:${contribution.recipeIngredientId}`;
    const existing = grouped.get(mergeKey);

    if (!existing) {
      grouped.set(mergeKey, {
        ingredientId: contribution.ingredientId,
        nameSnapshot: contribution.nameSnapshot,
        quantity: contribution.quantity,
        quantityText: contribution.quantityText,
        unit: contribution.unit,
        aisle: contribution.aisle,
        isManual: contribution.isManual,
        sortOrder: 0,
        sources: [source],
      });
      continue;
    }

    existing.sources.push(source);
    if (existing.quantity !== null && contribution.quantity !== null) {
      existing.quantity = roundShoppingQuantity(existing.quantity + contribution.quantity);
    }
  }

  return [...grouped.values()]
    .sort(compareDraftItems)
    .map((item, sortOrder) => ({
      ...item,
      sortOrder,
      sources: [...item.sources],
    }));
}
