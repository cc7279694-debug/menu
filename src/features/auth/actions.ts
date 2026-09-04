"use server";

import { redirect } from "next/navigation";

import {
  emailSchema,
  nextPathSchema,
  otpSchema,
  passwordSchema,
  type PasswordActionState,
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

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const parsedPassword = passwordSchema.safeParse(formData.get("password"));
  const nextPath = nextPathSchema.parse(formData.get("next")?.toString());

  if (!parsedEmail.success || !parsedPassword.success) {
    return { status: "error", message: "邮箱或密码格式不正确" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedEmail.data,
    password: parsedPassword.data,
  });

  if (error) {
    return { status: "error", message: "邮箱或密码不正确，请重试" };
  }

  redirect(nextPath);
}

export async function setPassword(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsedPassword = passwordSchema.safeParse(formData.get("password"));
  const parsedConfirmation = passwordSchema.safeParse(
    formData.get("confirmPassword"),
  );

  if (!parsedPassword.success || !parsedConfirmation.success) {
    return { status: "error", message: "密码至少需要 6 位" };
  }

  if (parsedPassword.data !== parsedConfirmation.data) {
    return { status: "error", message: "两次输入的密码不一致" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsedPassword.data,
  });

  if (error) {
    return { status: "error", message: "密码保存失败，请稍后重试" };
  }

  return { status: "success", message: "密码已保存，现在可以用密码登录" };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
