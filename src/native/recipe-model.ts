import { z } from "zod";
import type { RecipeName } from "./recipe-store";

export const localImagePath = z
  .string()
  .regex(/^images\/(?:[a-f0-9-]+|generation-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{64})\.(png|jpg|webp|avif)$/i, "图片路径无效");
const text = z.string().trim().min(1).max(10000);
const minutes = z.number().int().min(1).max(525600).nullable();
export const recipeDetailsSchema = z
  .object({
    title: z.string().trim().min(1, "请输入菜名").max(120),
    totalMinutes: minutes,
    servings: z.number().min(0.1).max(10000).nullable(),
    caloriesPerServing: z.number().min(0).max(100000).nullable(),
    coverPath: localImagePath.nullable(),
    notes: z.string().trim().max(20000),
    ingredients: z
      .array(z.object({ name: text, amount: z.string().trim().max(500) }))
      .max(300),
    steps: z
      .array(
        z.object({ instruction: text, imagePath: localImagePath.nullable() }),
      )
      .max(300),
    preparations: z
      .array(
        z.object({
          instruction: text,
          minutes,
          timingText: z.string().trim().max(500).nullable(),
        }),
      )
      .max(100),
    keyTips: z
      .array(
        z.object({
          instruction: text,
          stepNumber: z.number().int().min(1).nullable(),
        }),
      )
      .max(100),
  })
  .superRefine((value, ctx) => {
    value.keyTips.forEach((tip, index) => {
      if (tip.stepNumber !== null && tip.stepNumber > value.steps.length)
        ctx.addIssue({
          code: "custom",
          path: ["keyTips", index, "stepNumber"],
          message: "关键事项关联的步骤不存在",
        });
    });
  });
export type RecipeDetailsInput = z.infer<typeof recipeDetailsSchema>;
export type RecipeDetails = RecipeDetailsInput & RecipeName;
export type DurationFilter = "all" | "short" | "medium" | "long";
export function emptyDetails(title = ""): RecipeDetailsInput {
  return {
    title,
    totalMinutes: null,
    servings: null,
    caloriesPerServing: null,
    coverPath: null,
    notes: "",
    ingredients: [],
    steps: [],
    preparations: [],
    keyTips: [],
  };
}
export function matchesDuration(
  minutes: number | null,
  filter: DurationFilter,
): boolean {
  if (filter === "all") return true;
  if (minutes === null) return false;
  return filter === "short"
    ? minutes <= 30
    : filter === "medium"
      ? minutes > 30 && minutes <= 60
      : minutes > 60;
}
export interface RecipeLibrary {
  list(
    search?: string,
    limit?: number,
    offset?: number,
    filter?: DurationFilter,
  ): Promise<RecipeName[]>;
  create(title: string): Promise<RecipeName>;
  createDetails(input: RecipeDetailsInput): Promise<RecipeDetails>;
  getDetails(id: string): Promise<RecipeDetails | null>;
  saveDetails(id: string, input: RecipeDetailsInput): Promise<void>;
  remove(id: string): Promise<number>;
  undo(id: string): Promise<boolean>;
  purgeExpired(): Promise<void>;
}
