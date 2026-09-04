import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("请输入有效邮箱地址");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "请输入 6 位验证码");

export const passwordSchema = z
  .string()
  .min(6, "密码至少需要 6 位");

export const nextPathSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/recipes";
    }

    return value;
  });

export type AuthActionState = {
  status: "idle" | "code-sent" | "success" | "error";
  message?: string;
  email?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = { status: "idle" };

export type PasswordActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_PASSWORD_STATE: PasswordActionState = { status: "idle" };
