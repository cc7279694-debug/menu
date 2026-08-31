"use client";

import { useState } from "react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecipeSaveInput } from "@/features/recipes/schemas";
import {
  toLeadTimeMinutes,
  toPreparationTimeParts,
  type PreparationTimeUnit,
} from "@/features/recipes/preparation-time";

type RecipePreparationsEditorProps = {
  control: Control<RecipeSaveInput>;
  register: UseFormRegister<RecipeSaveInput>;
  setValue: UseFormSetValue<RecipeSaveInput>;
  errors: FieldErrors<RecipeSaveInput>;
};

const units: Array<{ value: PreparationTimeUnit; label: string }> = [
  { value: "minute", label: "分钟" },
  { value: "hour", label: "小时" },
  { value: "day", label: "天" },
];

export function RecipePreparationsEditor({
  control,
  register,
  setValue,
  errors,
}: RecipePreparationsEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "preparations", keyName: "fieldKey" });
  const preparations = useWatch({ control, name: "preparations" }) ?? [];
  const ingredients = useWatch({ control, name: "ingredients" }) ?? [];
  const [selectedUnits, setSelectedUnits] = useState<Record<string, PreparationTimeUnit>>({});

  const addPreparation = () => {
    append({
      preparationId: crypto.randomUUID(),
      recipeIngredientId: null,
      instruction: "",
      leadTimeMinutes: null,
      timingText: null,
      sortOrder: fields.length,
    });
  };

  const updateTime = (index: number, fieldId: string, rawValue: string, unit: PreparationTimeUnit) => {
    const value = rawValue === "" ? Number.NaN : Number(rawValue);
    setValue(`preparations.${index}.leadTimeMinutes`, toLeadTimeMinutes(value, unit), { shouldDirty: true, shouldValidate: true });
    setSelectedUnits((current) => ({ ...current, [fieldId]: unit }));
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="recipe-preparations-editor-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" id="recipe-preparations-editor-heading">提前准备</h2>
          <p className="text-sm text-muted-foreground">把腌制、浸泡、解冻、醒发等需要等待的事项单独列出来。</p>
        </div>
        <Button onClick={addPreparation} type="button" variant="outline">添加提前准备</Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">暂无提前准备事项，可按需添加。</p>
      ) : (
        <ol className="space-y-4">
          {fields.map((field, index) => {
            const item = preparations[index];
            const defaultParts = toPreparationTimeParts(item?.leadTimeMinutes ?? null);
            const unit = selectedUnits[field.preparationId] ?? defaultParts.unit;
            const parts = unit === defaultParts.unit ? defaultParts : {
              value: item?.leadTimeMinutes === null || item?.leadTimeMinutes === undefined
                ? null
                : unit === "day" ? item.leadTimeMinutes / 1440 : unit === "hour" ? item.leadTimeMinutes / 60 : item.leadTimeMinutes,
              unit,
            };
            const preparationError = errors.preparations?.[index];
            return (
              <li className="space-y-3 rounded-xl border p-4" key={field.fieldKey}>
                <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
                  <div className="space-y-1">
                    <Label htmlFor={`preparation-ingredient-${index}`}>关联食材 {index + 1}</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" id={`preparation-ingredient-${index}`} {...register(`preparations.${index}.recipeIngredientId`)}>
                      <option value="">不关联具体食材</option>
                      {ingredients.map((ingredient) => <option key={ingredient.recipeIngredientId} value={ingredient.recipeIngredientId}>{ingredient.name || "未命名食材"}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`preparation-instruction-${index}`}>准备说明 {index + 1}</Label>
                    <Input id={`preparation-instruction-${index}`} placeholder="例如：加入生抽和淀粉抓匀腌制" {...register(`preparations.${index}.instruction`, { required: "请填写准备说明" })} />
                    {preparationError?.instruction && <p className="text-sm text-destructive">{preparationError.instruction.message}</p>}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                  <div className="space-y-1">
                    <Label htmlFor={`preparation-time-${index}`}>提前时间 {index + 1}</Label>
                    <Input id={`preparation-time-${index}`} inputMode="decimal" min={0} onChange={(event) => updateTime(index, field.preparationId, event.target.value, unit)} step="any" type="number" value={parts.value ?? ""} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`preparation-unit-${index}`}>时间单位 {index + 1}</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" id={`preparation-unit-${index}`} onChange={(event) => {
                      const nextUnit = event.target.value as PreparationTimeUnit;
                      setSelectedUnits((current) => ({ ...current, [field.preparationId]: nextUnit }));
                    }} value={unit}>
                      {units.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`preparation-timing-text-${index}`}>文字时间 {index + 1}</Label>
                    <Input id={`preparation-timing-text-${index}`} placeholder="例如：提前一晚、泡至变软" {...register(`preparations.${index}.timingText`)} />
                  </div>
                </div>
                {preparationError?.leadTimeMinutes && <p className="text-sm text-destructive">请填写提前时间或文字时间</p>}
                <div className="flex flex-wrap gap-2">
                  <Button aria-label={`上移提前准备 ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)} type="button" variant="ghost">↑</Button>
                  <Button aria-label={`下移提前准备 ${index + 1}`} disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} type="button" variant="ghost">↓</Button>
                  <Button aria-label={`移除提前准备 ${index + 1}`} onClick={() => remove(index)} type="button" variant="ghost">移除</Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
