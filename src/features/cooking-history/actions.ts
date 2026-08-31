"use server";

import { revalidatePath } from "next/cache";

import { completeCookingRecordInputSchema } from "@/features/cooking-history/schemas";
import type { CookingRecordActionResult } from "@/features/cooking-history/types";
import { getServerAuthContext } from "@/lib/supabase/server-auth";
import type { Json } from "@/lib/supabase/database.types";

export async function completeCookingRecordAction(
  input: unknown,
): Promise<CookingRecordActionResult<{ cookingRecordId: string }>> {
  const parsed = completeCookingRecordInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请检查本次烹饪记录" };

  const { supabase, user, error: authError } = await getServerAuthContext();
  if (authError || !user) return { ok: false, message: "请先登录后再保存烹饪记录" };

  const { data, error } = await supabase.rpc("complete_cooking_record", {
    p_payload: parsed.data as unknown as Json,
  });
  if (error || !data) {
    console.error("[cooking-history] save record failed", {
      code: error?.code,
      message: error?.message,
      hint: error?.hint,
    });
    return { ok: false, message: "烹饪记录保存失败，请稍后重试" };
  }

  revalidatePath(`/recipes/${parsed.data.recipeId}`);
  revalidatePath("/plan");
  return { ok: true, data: { cookingRecordId: data } };
}
