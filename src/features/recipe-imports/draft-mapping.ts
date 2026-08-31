import type { RecipeSaveInput } from "@/features/recipes/schemas";
import type { RecipeImportDraft } from "@/features/recipe-imports/schemas";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function asNullable(value: string | null) {
  return value?.trim() || null;
}

export function mapImportDraftToRecipeSaveInput(input: {
  draft: RecipeImportDraft;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  createId?: () => string;
}): {
  value: RecipeSaveInput;
  unmatchedCategoryName: string | null;
  unmatchedTagNames: string[];
} {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const category = input.draft.suggestedCategoryName
    ? input.categories.find((option) => normalize(option.name) === normalize(input.draft.suggestedCategoryName ?? ""))
    : undefined;
  const matchedTags = input.draft.suggestedTagNames.flatMap((name) => {
    const match = input.tags.find((option) => normalize(option.name) === normalize(name));
    return match ? [match.id] : [];
  });
  const unmatchedTagNames = input.draft.suggestedTagNames.filter(
    (name) => !input.tags.some((option) => normalize(option.name) === normalize(name)),
  );
  const recipeId = createId();
  const recipeIngredientIds = input.draft.ingredients.map(() => createId());
  const ingredientByName = new Map(
    input.draft.ingredients.map((ingredient, index) => [normalize(ingredient.name), recipeIngredientIds[index]]),
  );
  const warnings = input.draft.warnings.length
    ? `AI 整理提示：\n${input.draft.warnings.map((warning) => `- ${warning}`).join("\n")}`
    : null;

  const value: RecipeSaveInput = {
    recipeId,
    title: input.draft.title,
    description: input.draft.description,
    categoryId: category?.id ?? null,
    tagIds: [...new Set(matchedTags)],
    coverPath: null,
    baseServings: input.draft.baseServings,
    prepMinutes: input.draft.prepMinutes,
    cookMinutes: input.draft.cookMinutes,
    personalNotes: [input.draft.personalNotes, warnings].filter(Boolean).join("\n\n") || null,
    ingredients: input.draft.ingredients.map((ingredient, index) => ({
      recipeIngredientId: recipeIngredientIds[index]!,
      name: ingredient.name,
      quantity: ingredient.quantity,
      quantityText: asNullable(ingredient.quantityText),
      unit: asNullable(ingredient.unit),
      preparationNote: asNullable(ingredient.preparationNote),
      groupType: ingredient.groupType,
      sortOrder: index,
    })),
    steps: input.draft.steps.map((step, index) => ({
      stepId: createId(),
      instruction: step.instruction,
      imagePath: null,
      timerSeconds: step.timerSeconds,
      heatLevel: asNullable(step.heatLevel),
      sortOrder: index,
      ingredientLinks: [...new Set(step.ingredientNames.flatMap((name) => {
        const recipeIngredientId = ingredientByName.get(normalize(name));
        return recipeIngredientId ? [{ recipeIngredientId, quantityOverride: null, quantityTextOverride: null, note: null }] : [];
      }))],
    })),
    preparations: input.draft.preparations.map((item, index) => ({
      preparationId: createId(),
      recipeIngredientId: item.ingredientName
        ? ingredientByName.get(normalize(item.ingredientName)) ?? null
        : null,
      instruction: item.instruction,
      leadTimeMinutes: item.leadTimeMinutes,
      timingText: asNullable(item.timingText),
      sortOrder: index,
    })),
  };

  return {
    value,
    unmatchedCategoryName: category ? null : input.draft.suggestedCategoryName,
    unmatchedTagNames,
  };
}
