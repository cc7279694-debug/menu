"use client";

import { useActionState, useEffect, useState } from "react";

import { requestEmailOtp, verifyEmailOtp } from "@/features/auth/actions";
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
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(
    requestEmailOtp,
    INITIAL_AUTH_STATE,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailOtp,
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
      <form action={requestAction} className="space-y-4">
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
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {requestState.message ?? initialMessage}
        </p>
        <Button className="w-full" disabled={requestPending} type="submit">
          {requestPending ? "正在发送…" : "发送验证码"}
        </Button>
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
    </form>
  );
}
