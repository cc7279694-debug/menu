"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateShoppingListAction,
  previewShoppingListAction,
  searchShoppingRecipesAction,
} from "@/features/shopping/actions";
import { isValidTargetServings, parseTargetServings } from "@/features/ingredients/quantities";
import { mergeShoppingContributions } from "@/features/shopping/merge";
import { GenerationPreview } from "@/features/shopping/components/generation-preview";
import {
  RecipeSelectionList,
  type SelectedShoppingRecipe,
} from "@/features/shopping/components/recipe-selection-list";
import type {
  ShoppingContribution,
  ShoppingGenerationInput,
  ShoppingRecipeOption,
} from "@/features/shopping/types";

const SERVINGS_ERROR = "请输入 0.25 到 1000 之间且最多两位小数的份数。";
const MAX_SELECTED_RECIPES = 20;

type ShoppingGeneratorProps = {
  disabled?: boolean;
  initialRecipes: ShoppingRecipeOption[];
  onGenerated?: () => void;
};

type Step = "select" | "review";

function buildRecipeSelectionInput(selectedRecipes: SelectedShoppingRecipe[]): ShoppingGenerationInput["selections"] {
  return selectedRecipes.map(({ recipe, servings }) => ({
    recipeId: recipe.id,
    selectedServings: parseTargetServings(servings, recipe.baseServings),
  }));
}

export function ShoppingGenerator({ disabled = false, initialRecipes, onGenerated }: ShoppingGeneratorProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);
  const previewRequestRef = useRef(0);
  const searchRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [selectedById, setSelectedById] = useState<Record<string, SelectedShoppingRecipe>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContributions, setPreviewContributions] = useState<ShoppingContribution[]>([]);
  const [excludedRecipeIngredientIds, setExcludedRecipeIngredientIds] = useState<Set<string>>(() => new Set());

  const selectedRecipes = useMemo(() => Object.values(selectedById), [selectedById]);
  const selectedIds = useMemo(() => new Set(Object.keys(selectedById)), [selectedById]);
  const maxReached = selectedRecipes.length >= MAX_SELECTED_RECIPES;
  const servingErrors = useMemo(() => {
    const errors = new Map<string, string>();
    for (const { recipe, servings } of selectedRecipes) {
      if (!isValidTargetServings(servings)) errors.set(recipe.id, SERVINGS_ERROR);
    }
    return errors;
  }, [selectedRecipes]);
  const canPreview = selectedRecipes.length > 0
    && selectedRecipes.length <= MAX_SELECTED_RECIPES
    && servingErrors.size === 0
    && !isPreviewing;
  const previewItems = useMemo(
    () => mergeShoppingContributions(previewContributions, excludedRecipeIngredientIds),
    [excludedRecipeIngredientIds, previewContributions],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function resetFlow() {
    setStep("select");
    setRecipes(initialRecipes);
    setSelectedById({});
    setSearchQuery("");
    setStatusMessage(null);
    setIsSearching(false);
    setIsPreviewing(false);
    setIsGenerating(false);
    setPreviewContributions([]);
    setExcludedRecipeIngredientIds(new Set());
    generatingRef.current = false;
    previewRequestRef.current += 1;
    searchRequestRef.current += 1;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (disabled && nextOpen) return;
    if (!nextOpen && generatingRef.current) return;
    setOpen(nextOpen);
    if (!nextOpen) resetFlow();
  }

  function toggleRecipe(recipe: ShoppingRecipeOption) {
    setStatusMessage(null);
    setSelectedById((current) => {
      if (current[recipe.id]) {
        const next = { ...current };
        delete next[recipe.id];
        return next;
      }
      if (Object.keys(current).length >= MAX_SELECTED_RECIPES) {
        return current;
      }
      return {
        ...current,
        [recipe.id]: { recipe, servings: String(recipe.baseServings) },
      };
    });
  }

  function updateServings(recipeId: string, value: string) {
    setStatusMessage(null);
    setSelectedById((current) => {
      const selected = current[recipeId];
      if (!selected) return current;
      return {
        ...current,
        [recipeId]: { ...selected, servings: value },
      };
    });
  }

  async function handleSearch() {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsSearching(true);
    setStatusMessage(null);
    const result = await searchShoppingRecipesAction(searchQuery);
    if (requestId !== searchRequestRef.current) return;
    setIsSearching(false);
    if (result.ok) {
      setRecipes(result.data);
      return;
    }
    setStatusMessage(result.message);
  }

  async function handlePreview() {
    if (!canPreview) return;
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setStatusMessage(null);
    setIsPreviewing(true);
    const input: ShoppingGenerationInput = {
      selections: buildRecipeSelectionInput(selectedRecipes),
      excludedRecipeIngredientIds: [],
    };
    const result = await previewShoppingListAction(input);
    if (requestId !== previewRequestRef.current) return;
    setIsPreviewing(false);
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }
    setPreviewContributions(result.data.contributions);
    setExcludedRecipeIngredientIds(new Set());
    setStep("review");
  }

  function toggleExcluded(recipeIngredientId: string) {
    setStatusMessage(null);
    setExcludedRecipeIngredientIds((current) => {
      const next = new Set(current);
      if (next.has(recipeIngredientId)) {
        next.delete(recipeIngredientId);
      } else {
        next.add(recipeIngredientId);
      }
      return next;
    });
  }

  async function handleGenerate() {
    if (generatingRef.current || previewItems.length === 0) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setStatusMessage(null);
    const input: ShoppingGenerationInput = {
      selections: buildRecipeSelectionInput(selectedRecipes),
      excludedRecipeIngredientIds: [...excludedRecipeIngredientIds],
    };
    const result = await generateShoppingListAction(input);
    setIsGenerating(false);
    generatingRef.current = false;
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }
    onGenerated?.();
    router.refresh();
    setOpen(false);
    resetFlow();
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger render={<Button className="min-h-11" disabled={disabled} type="button" />}>
        生成购物清单
      </DialogTrigger>
      <DialogContent className="max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>生成购物清单</DialogTitle>
          <DialogDescription>
            选择菜谱和目标份数后，先预览合并结果再生成购物清单。
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="shopping-recipe-search">搜索菜谱</Label>
                <Input
                  className="min-h-11"
                  id="shopping-recipe-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                  placeholder="输入菜名"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                />
              </div>
              <Button className="min-h-11 sm:mt-6" disabled={isSearching} onClick={handleSearch} type="button" variant="outline">
                {isSearching ? "搜索中..." : "搜索"}
              </Button>
            </div>

            {statusMessage && (
              <p aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
                {statusMessage}
              </p>
            )}

            <RecipeSelectionList
              disabled={isPreviewing}
              maxReached={maxReached}
              onServingsChange={updateServings}
              onToggleRecipe={toggleRecipe}
              recipes={recipes}
              selectedIds={selectedIds}
              selectedRecipes={selectedRecipes}
              servingErrors={servingErrors}
            />

            {isPreviewing && (
              <p aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
                预览购物清单中...
              </p>
            )}

            <div className="flex justify-end">
              <Button className="min-h-11" disabled={!canPreview} onClick={handlePreview} type="button">
                预览购物清单
              </Button>
            </div>
          </div>
        ) : (
          <GenerationPreview
            excludedRecipeIngredientIds={excludedRecipeIngredientIds}
            isGenerating={isGenerating}
            items={previewItems}
            onBack={() => {
              setStatusMessage(null);
              setStep("select");
            }}
            onGenerate={handleGenerate}
            onToggleExcluded={toggleExcluded}
            statusMessage={statusMessage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
