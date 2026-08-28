import { NextResponse } from "next/server";

import { nextPathSchema } from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function buildLoginErrorRedirect(request: Request): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth_callback");
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return buildLoginErrorRedirect(request);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return buildLoginErrorRedirect(request);
  }

  const nextPath = nextPathSchema.parse(requestUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(nextPath, request.url));
}
