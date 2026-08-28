"use client";

import { useActionState } from "react";

import { requestEmailMagicLink } from "@/features/auth/actions";
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
  const [requestState, requestAction, requestPending] = useActionState(
    requestEmailMagicLink,
    INITIAL_AUTH_STATE,
  );

  return (
    <form action={requestAction} className="space-y-4">
      <input name="next" type="hidden" value={nextPath} />
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
        {requestPending ? "正在发送…" : "发送登录链接"}
      </Button>
    </form>
  );
}
