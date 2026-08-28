"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { emailSchema, nextPathSchema, type AuthActionState } from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getRequestOrigin(headerStore: Headers): string | null {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";

  return `${protocol}://${host}`;
}

export async function requestEmailMagicLink(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));

  if (!parsedEmail.success) {
    return { status: "error", message: parsedEmail.error.issues[0]?.message };
  }

  const nextPath = nextPathSchema.parse(formData.get("next")?.toString());
  const origin = getRequestOrigin(await headers());

  if (!origin) {
    return { status: "error", message: "登录链接发送失败，请稍后重试" };
  }

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsedEmail.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { status: "error", message: "登录链接发送失败，请稍后重试" };
  }

  return {
    status: "link-sent",
    email: parsedEmail.data,
    message: "登录链接已发送，请检查邮箱",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
