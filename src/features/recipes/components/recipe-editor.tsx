"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch, type Control, type UseFormSetValue } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCategoryAction, createTagAction, saveRecipeAction } from "@/features/recipes/actions";
import { recipeSaveInputSchema, type RecipeSaveInput } from "@/features/recipes/schemas";
import { getObsoleteRecipeMediaPaths, uploadRecipeMedia, removeRecipeMediaPaths } from "@/features/media/upload-recipe-media";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { ActionResult } from "@/features/recipes/types";
import { ImagePicker } from "@/features/recipes/components/image-picker";
import { combineTimerParts, splitTimerSeconds } from "@/features/recipes/timer-input";

type TaxonomyOption = { id: string; name: string };

type RecipeEditorProps = {
  mode: "create" | "edit";
  userId: string;
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
  initialValue?: RecipeSaveInput;
  coverPreviewUrl?: string | null;
  stepPreviewUrls?: Record<string, string | null>;
  onSaved: (recipeId: string) => void;
  saveRecipe?: (input: unknown) => Promise<ActionResult<{ recipeId: string }>>;
};

function StepTimerFields({
  control,
  index,
  setValue,
}: {
  control: Control<RecipeSaveInput>;
  index: number;
  setValue: UseFormSetValue<RecipeSaveInput>;
}) {
  const timerSeconds = useWatch({ control, name: `steps.${index}.timerSeconds` });
  const parts = splitTimerSeconds(timerSeconds ?? null);
  const updateTimer = (minutes: string, seconds: string) => {
    setValue(`steps.${index}.timerSeconds`, combineTimerParts(minutes, seconds), { shouldDirty: true });
  };

  return (
    <div className="space-y-1">
      <Label>计时（可选）</Label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
        <Input
          aria-label={`第 ${index + 1} 步计时分钟`}
          inputMode="numeric"
          min={0}
          onChange={(event) => updateTimer(event.target.value, parts.seconds)}
          step={1}
          type="number"
          value={parts.minutes}
        />
        <span className="text-sm text-muted-foreground">分</span>
        <Input
          aria-label={`第 ${index + 1} 步计时秒`}
          inputMode="numeric"
          max={59}
          min={0}
          onChange={(event) => updateTimer(parts.minutes, event.target.value)}
          step={1}
          type="number"
          value={parts.seconds}
        />
        <span className="text-sm text-muted-foreground">秒</span>
      </div>
    </div>
  );
}

function StepIngredientLinks({
  control,
  stepIndex,
  onToggle,
}: {
  control: Control<RecipeSaveInput>;
  stepIndex: number;
  onToggle: (stepIndex: number, ingredientId: string, checked: boolean) => void;
}) {
  const ingredients = useWatch({ control, name: "ingredients" }) ?? [];
  const links = useWatch({ control, name: `steps.${stepIndex}.ingredientLinks` }) ?? [];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">本步骤使用的食材</p>
      <div className="flex flex-wrap gap-3">
        {ingredients.map((ingredient, ingredientIndex) => ingredient.recipeIngredientId && (
          <label className="flex items-center gap-2 text-sm" key={ingredient.recipeIngredientId}>
            <input
              checked={links.some((link) => link.recipeIngredientId === ingredient.recipeIngredientId)}
              onChange={(event) => onToggle(stepIndex, ingredient.recipeIngredientId, event.target.checked)}
              type="checkbox"
            />
            {ingredient.name || `食材 ${ingredientIndex + 1}`}
          </label>
        ))}
      </div>
    </div>
  );
}

function createEmptyRecipe(): RecipeSaveInput {
  return {
    recipeId: crypto.randomUUID(),
    title: "",
    description: null,
    categoryId: null,
    tagIds: [],
    coverPath: null,
    baseServings: 2,
    prepMinutes: null,
    cookMinutes: null,
    personalNotes: null,
    ingredients: [{
      recipeIngredientId: crypto.randomUUID(),
      name: "",
      quantity: null,
      quantityText: null,
      unit: null,
      preparationNote: null,
      sortOrder: 0,
    }],
    steps: [{
      stepId: crypto.randomUUID(),
      instruction: "",
      imagePath: null,
      timerSeconds: null,
      sortOrder: 0,
      ingredientLinks: [],
    }],
  };
}

export function RecipeEditor({
  mode,
  userId,
  categories: initialCategories,
  tags: initialTags,
  initialValue,
  coverPreviewUrl = null,
  stepPreviewUrls = {},
  onSaved,
  saveRecipe = saveRecipeAction,
}: RecipeEditorProps) {
  const defaultValues = useMemo(() => initialValue ?? createEmptyRecipe(), [initialValue]);
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [stepFiles, setStepFiles] = useState<Record<string, File | null>>({});
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [removedStepIds, setRemovedStepIds] = useState<Set<string>>(new Set());
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<RecipeSaveInput>({ defaultValues });
  const ingredientFields = useFieldArray({ control, name: "ingredients", keyName: "fieldKey" });
  const stepFields = useFieldArray({ control, name: "steps", keyName: "fieldKey" });
  const selectedTags = useWatch({ control, name: "tagIds" }) ?? [];

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty && !isSaving) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSaving]);

  const onSubmit = async (rawValue: RecipeSaveInput) => {
    setServerMessage(null);
    const parsed = recipeSaveInputSchema.safeParse(rawValue);
    if (!parsed.success) {
      setServerMessage("请检查菜谱内容后再保存");
      setError("title", { message: "请先填写菜谱名称" });
      return;
    }

    setIsSaving(true);
    let uploadedPaths: string[] = [];
    try {
      const hasMedia = Boolean(coverFile) || Object.values(stepFiles).some(Boolean);
      let media: { coverPath: string | null; stepPaths: Record<string, string>; uploadedPaths: string[] } = {
        coverPath: null,
        stepPaths: {},
        uploadedPaths: [],
      };
      if (hasMedia) {
        const bucket = getBrowserSupabaseClient().storage.from("recipe-media");
        media = await uploadRecipeMedia({
          userId,
          recipeId: parsed.data.recipeId,
          cover: coverFile,
          steps: stepFiles,
          bucket,
        });
        uploadedPaths = media.uploadedPaths;
      }

      const payload: RecipeSaveInput = {
        ...parsed.data,
        coverPath: coverRemoved ? null : media.coverPath ?? parsed.data.coverPath,
        steps: parsed.data.steps.map((step) => ({
          ...step,
          imagePath: removedStepIds.has(step.stepId) ? null : media.stepPaths[step.stepId] ?? step.imagePath,
        })),
      };
      const result = await saveRecipe(payload);
      if (!result.ok) {
        if (uploadedPaths.length > 0) {
          await removeRecipeMediaPaths(
            getBrowserSupabaseClient().storage.from("recipe-media"),
            userId,
            parsed.data.recipeId,
            uploadedPaths,
          );
        }
        setServerMessage(result.message);
        return;
      }
      const previousMedia = {
        coverPath: initialValue?.coverPath ?? null,
        stepPaths: Object.fromEntries((initialValue?.steps ?? []).flatMap((step) => step.imagePath ? [[step.stepId, step.imagePath]] : [])),
      };
      const nextMedia = {
        coverPath: payload.coverPath,
        stepPaths: Object.fromEntries(payload.steps.flatMap((step) => step.imagePath ? [[step.stepId, step.imagePath]] : [])),
      };
      const obsoletePaths = getObsoleteRecipeMediaPaths(previousMedia, nextMedia);
      if (obsoletePaths.length > 0) {
        await removeRecipeMediaPaths(
          getBrowserSupabaseClient().storage.from("recipe-media"),
          userId,
          parsed.data.recipeId,
          obsoletePaths,
        );
      }
      onSaved(result.data.recipeId);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "菜谱保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  async function addCategory() {
    const result = await createCategoryAction(newCategory);
    if (result.ok) {
      setCategories((current) => [...current.filter((item) => item.id !== result.data.id), result.data]);
      setValue("categoryId", result.data.id, { shouldDirty: true });
      setNewCategory("");
    } else {
      setServerMessage(result.message);
    }
  }

  async function addTag() {
    const result = await createTagAction(newTag);
    if (result.ok) {
      setTags((current) => [...current.filter((item) => item.id !== result.data.id), result.data]);
      setValue("tagIds", [...new Set([...selectedTags, result.data.id])], { shouldDirty: true });
      setNewTag("");
    } else {
      setServerMessage(result.message);
    }
  }

  const toggleStepIngredient = (stepIndex: number, ingredientId: string, checked: boolean) => {
    const links = getValues(`steps.${stepIndex}.ingredientLinks`) ?? [];
    if (checked) {
      setValue(`steps.${stepIndex}.ingredientLinks`, [
        ...links,
        { recipeIngredientId: ingredientId, quantityOverride: null, quantityTextOverride: null, note: null },
      ], { shouldDirty: true });
    } else {
      setValue(`steps.${stepIndex}.ingredientLinks`, links.filter((link) => link.recipeIngredientId !== ingredientId), { shouldDirty: true });
    }
  };

  const removeIngredient = (index: number) => {
    const ingredients = getValues("ingredients");
    const id = ingredients[index]?.recipeIngredientId;
    ingredientFields.remove(index);
    if (id) {
      getValues("steps").forEach((step, stepIndex) => {
        setValue(`steps.${stepIndex}.ingredientLinks`, step.ingredientLinks.filter((link) => link.recipeIngredientId !== id), { shouldDirty: true });
      });
    }
  };

  const moveIngredient = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;
    if (nextIndex >= 0 && nextIndex < ingredientFields.fields.length) {
      ingredientFields.move(index, nextIndex);
    }
  };

  const moveStep = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;
    if (nextIndex >= 0 && nextIndex < stepFields.fields.length) {
      stepFields.move(index, nextIndex);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit, () => setServerMessage("请检查菜谱内容后再保存"))}>
      <div
        aria-label="菜谱编辑操作"
        className="sticky top-2 z-20 flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-background/95 p-3 shadow-sm md:static md:z-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        role="region"
      >
        <div>
          <p className="text-sm text-muted-foreground">个人菜谱</p>
          <h1 className="text-3xl font-semibold tracking-tight">{mode === "create" ? "新建菜谱" : "编辑菜谱"}</h1>
        </div>
        <Button className="w-full sm:w-auto" disabled={isSaving} type="submit">
          {isSaving ? "保存中…" : "保存菜谱"}
        </Button>
      </div>

      {serverMessage && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{serverMessage}</p>}

      <section className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="recipe-title">菜名</Label>
          <Input id="recipe-title" {...register("title", { required: "请先填写菜谱名称" })} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="recipe-description">简介</Label>
          <Textarea id="recipe-description" {...register("description")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-servings">基础份数</Label>
          <Input id="recipe-servings" min={0.1} step={0.1} type="number" {...register("baseServings", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-prep">准备时间（分钟）</Label>
          <Input id="recipe-prep" min={0} type="number" {...register("prepMinutes", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-cook">烹饪时间（分钟）</Label>
          <Input id="recipe-cook" min={0} type="number" {...register("cookMinutes", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-category">分类</Label>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" id="recipe-category" {...register("categoryId")}>
            <option value="">未分类</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="新分类名称" onChange={(event) => setNewCategory(event.target.value)} value={newCategory} /><Button className="w-full sm:w-auto" onClick={addCategory} type="button" variant="outline">新建分类</Button></div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>标签</Label>
          <div className="flex flex-wrap gap-3">{tags.map((tag) => <label className="flex items-center gap-2 text-sm" key={tag.id}><input checked={selectedTags.includes(tag.id)} onChange={(event) => setValue("tagIds", event.target.checked ? [...selectedTags, tag.id] : selectedTags.filter((id) => id !== tag.id), { shouldDirty: true })} type="checkbox" />{tag.name}</label>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="新标签名称" onChange={(event) => setNewTag(event.target.value)} value={newTag} /><Button className="w-full sm:w-auto" onClick={addTag} type="button" variant="outline">新建标签</Button></div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="recipe-notes">个人调整备注</Label>
          <Textarea id="recipe-notes" {...register("personalNotes")} />
        </div>
        <div className="md:col-span-2"><ImagePicker label="菜谱封面" onChange={(file) => { setCoverFile(file); setCoverRemoved(!file); }} previewUrl={coverRemoved ? null : coverPreviewUrl} value={coverFile} /></div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">食材</h2><p className="text-sm text-muted-foreground">数字用量和“少许”等文字用量都可以保留。</p></div><Button onClick={() => ingredientFields.append({ recipeIngredientId: crypto.randomUUID(), name: "", quantity: null, quantityText: null, unit: null, preparationNote: null, sortOrder: ingredientFields.fields.length })} type="button" variant="outline">添加食材</Button></div>
        <div className="space-y-4">{ingredientFields.fields.map((field, index) => <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.5fr_0.7fr_0.7fr_1fr_auto]" key={field.fieldKey}><div className="space-y-1"><Label htmlFor={`ingredient-${index}`}>食材名称</Label><Input id={`ingredient-${index}`} {...register(`ingredients.${index}.name`, { required: "请先填写食材名称" })} />{errors.ingredients?.[index]?.name && <p className="text-sm text-destructive">{errors.ingredients[index]?.name?.message}</p>}</div><div className="space-y-1"><Label htmlFor={`quantity-${index}`}>数量</Label><Input id={`quantity-${index}`} min={0} step={0.001} type="number" {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })} /></div><div className="space-y-1"><Label htmlFor={`quantity-text-${index}`}>文字用量</Label><Input id={`quantity-text-${index}`} {...register(`ingredients.${index}.quantityText`)} /></div><div className="space-y-1"><Label htmlFor={`unit-${index}`}>单位/备注</Label><Input id={`unit-${index}`} {...register(`ingredients.${index}.unit`)} /></div><div className="flex items-end gap-1"><Button aria-label={`上移食材 ${index + 1}`} className="px-2" disabled={index === 0} onClick={() => moveIngredient(index, -1)} type="button" variant="ghost">↑</Button><Button aria-label={`下移食材 ${index + 1}`} className="px-2" disabled={index === ingredientFields.fields.length - 1} onClick={() => moveIngredient(index, 1)} type="button" variant="ghost">↓</Button><Button aria-label={`移除食材 ${index + 1}`} className="px-2" onClick={() => removeIngredient(index)} type="button" variant="ghost">移除</Button></div></div>)}</div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">步骤</h2><p className="text-sm text-muted-foreground">每一步可以关联当前要用的食材并设置计时。</p></div><Button onClick={() => stepFields.append({ stepId: crypto.randomUUID(), instruction: "", imagePath: null, timerSeconds: null, sortOrder: stepFields.fields.length, ingredientLinks: [] })} type="button" variant="outline">添加步骤</Button></div>
        <div className="space-y-4">
          {stepFields.fields.map((field, index) => (
            <div className="space-y-4 rounded-xl border p-4" key={field.fieldKey}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">第 {index + 1} 步</h3><div className="flex items-center gap-1"><Button aria-label={`上移步骤 ${index + 1}`} className="px-2" disabled={index === 0} onClick={() => moveStep(index, -1)} type="button" variant="ghost">↑</Button><Button aria-label={`下移步骤 ${index + 1}`} className="px-2" disabled={index === stepFields.fields.length - 1} onClick={() => moveStep(index, 1)} type="button" variant="ghost">↓</Button><Button aria-label={`移除步骤 ${index + 1}`} onClick={() => stepFields.remove(index)} type="button" variant="ghost">移除</Button></div></div>
              <div className="space-y-1"><Label htmlFor={`step-${index}`}>步骤说明</Label><Textarea id={`step-${index}`} {...register(`steps.${index}.instruction`, { required: "请先填写步骤说明" })} />{errors.steps?.[index]?.instruction && <p className="text-sm text-destructive">{errors.steps[index]?.instruction?.message}</p>}</div>
              <div className="grid gap-3 md:grid-cols-2"><StepTimerFields control={control} index={index} setValue={setValue} /><ImagePicker label={`第 ${index + 1} 步图片`} onChange={(file) => { setStepFiles((current) => ({ ...current, [field.stepId]: file })); setRemovedStepIds((current) => { const next = new Set(current); if (file) next.delete(field.stepId); else next.add(field.stepId); return next; }); }} value={stepFiles[field.stepId]} previewUrl={removedStepIds.has(field.stepId) ? null : stepPreviewUrls[field.stepId] ?? null} /></div>
              <StepIngredientLinks control={control} onToggle={toggleStepIngredient} stepIndex={index} />
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
