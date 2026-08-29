import { NextResponse } from "next/server";

import { processRecipeImport, RecipeImportProcessError } from "@/features/recipe-imports/process";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ importId: string }> };

function validImportId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { importId } = await context.params;
  if (!validImportId(importId)) return NextResponse.json({ message: "请求参数无效" }, { status: 400 });
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) return NextResponse.json({ message: "请先登录后再导入菜谱" }, { status: 401 });
  const result = await supabase.from("recipe_import_jobs").select("status, error_code").eq("id", importId).eq("user_id", user.id).maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ message: "导入任务不存在" }, { status: 404 });
  return NextResponse.json({ status: result.data.status, errorCode: result.data.error_code ?? null });
}

export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { importId } = await context.params;
  if (!validImportId(importId)) return NextResponse.json({ ok: false, code: "invalid_request", message: "请求参数无效" }, { status: 400 });
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) return NextResponse.json({ ok: false, code: "unauthorized", message: "请先登录后再导入菜谱" }, { status: 401 });
  try {
    const result = await processRecipeImport(importId, { supabase, userId: user.id });
    return NextResponse.json({ ok: true, status: result.status });
  } catch (caught) {
    const errorResult = caught instanceof RecipeImportProcessError ? caught : new RecipeImportProcessError("processing_failed", "菜谱导入失败，请稍后重试");
    const status = errorResult.code === "conflict" ? 409 : errorResult.code === "not_found" ? 404 : 422;
    return NextResponse.json({ ok: false, code: errorResult.code, message: errorResult.message }, { status });
  }
}
