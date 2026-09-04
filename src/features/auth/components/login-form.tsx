"use client";

import { useActionState, useEffect, useState } from "react";

import {
  requestEmailOtp,
  signInWithPassword,
  verifyEmailOtp,
} from "@/features/auth/actions";
import { INITIAL_AUTH_STATE } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LoginFormProps = {
  initialMessage?: string;
  nextPath?: string;
};

export function LoginForm({
  initialMessage,
  nextPath = "/recipes",
}: LoginFormProps) {
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(
    requestEmailOtp,
    INITIAL_AUTH_STATE,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailOtp,
    INITIAL_AUTH_STATE,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    INITIAL_AUTH_STATE,
  );

  useEffect(() => {
    if (requestState.status === "code-sent" && requestState.email) {
      setVerifiedEmail(requestState.email);
      setPhase("otp");
    }
  }, [requestState]);

  if (phase === "email") {
    return (
      <form
        action={mode === "otp" ? requestAction : passwordAction}
        className="space-y-4"
      >
        {mode === "password" && (
          <input name="next" type="hidden" value={nextPath} />
        )}
        <div className="space-y-2">
          <Label htmlFor="email">邮箱地址</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        {mode === "password" && (
          <div className="space-y-2">
            <Label htmlFor="password">登录密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>
        )}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {(mode === "otp" ? requestState.message : passwordState.message) ??
            initialMessage}
        </p>
        <Button
          className="w-full"
          disabled={mode === "otp" ? requestPending : passwordPending}
          type="submit"
        >
          {mode === "otp"
            ? requestPending
              ? "正在发送…"
              : "发送验证码"
            : passwordPending
              ? "正在登录…"
              : "密码登录"}
        </Button>
        <Button
          className="w-full"
          onClick={() => setMode(mode === "otp" ? "password" : "otp")}
          type="button"
          variant="ghost"
        >
          {mode === "otp" ? "改用密码登录" : "使用邮箱验证码"}
        </Button>
        {mode === "password" && (
          <p className="text-xs text-muted-foreground">
            还没有设置密码？先用验证码登录，再到“设置”中保存密码。
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input name="email" type="hidden" value={verifiedEmail} />
      <input name="next" type="hidden" value={nextPath} />
      <div className="space-y-2">
        <Label htmlFor="token">6 位验证码</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {verifyState.message ?? requestState.message}
      </p>
      <Button className="w-full" disabled={verifyPending} type="submit">
        {verifyPending ? "正在验证…" : "验证并登录"}
      </Button>
      <Button
        className="w-full"
        onClick={() => setPhase("email")}
        type="button"
        variant="ghost"
      >
        更换邮箱
      </Button>
      <Button
        className="w-full"
        onClick={() => {
          setPhase("email");
          setMode("password");
        }}
        type="button"
        variant="ghost"
      >
        改用密码登录
      </Button>
    </form>
  );
}
