import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("请输入有效邮箱地址");

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
  status: "idle" | "link-sent" | "error";
  message?: string;
  email?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = { status: "idle" };
