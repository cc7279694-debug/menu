"use server";

import { redirect } from "next/navigation";

import {
  emailSchema,
  nextPathSchema,
  otpSchema,
  type AuthActionState,
} from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requestEmailOtp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));

  if (!parsedEmail.success) {
    return { status: "error", message: parsedEmail.error.issues[0]?.message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsedEmail.data,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { status: "error", message: "验证码发送失败，请稍后重试" };
  }

  return {
    status: "code-sent",
    email: parsedEmail.data,
    message: "验证码已发送，请检查邮箱",
  };
}

export async function verifyEmailOtp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const parsedOtp = otpSchema.safeParse(formData.get("token"));
  const nextPath = nextPathSchema.parse(formData.get("next")?.toString());

  if (!parsedEmail.success || !parsedOtp.success) {
    return { status: "error", message: "邮箱或验证码格式不正确" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsedEmail.data,
    token: parsedOtp.data,
    type: "email",
  });

  if (error) {
    return {
      status: "error",
      email: parsedEmail.data,
      message: "验证码无效或已过期",
    };
  }

  redirect(nextPath);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
