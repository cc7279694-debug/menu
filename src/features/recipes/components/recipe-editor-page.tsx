"use client";

import { useRouter } from "next/navigation";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

type RecipeEditorPageProps = {
  mode: "create" | "edit";
  userId: string;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  initialValue?: RecipeSaveInput;
  coverPreviewUrl?: string | null;
  stepPreviewUrls?: Record<string, string | null>;
};

export function RecipeEditorPage(props: RecipeEditorPageProps) {
  const router = useRouter();
  return <RecipeEditor {...props} onSaved={(recipeId) => router.push(`/recipes/${recipeId}`)} />;
}
