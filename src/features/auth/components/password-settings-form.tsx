"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword } from "@/features/auth/actions";
import {
  INITIAL_PASSWORD_STATE,
} from "@/features/auth/schemas";

export function PasswordSettingsForm() {
  const [state, action, pending] = useActionState(
    setPassword,
    INITIAL_PASSWORD_STATE,
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">登录密码</h2>
        <p className="text-sm text-muted-foreground">
          设置一次后，下次可以直接用邮箱和密码登录。
        </p>
      </div>
      <form action={action} className="max-w-sm space-y-3">
        <div className="space-y-2">
          <Label htmlFor="settings-password">新密码</Label>
          <Input
            id="settings-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-confirm-password">再次输入密码</Label>
          <Input
            id="settings-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground"
          role="status"
        >
          {state.message}
        </p>
        <Button disabled={pending} type="submit">
          {pending ? "保存中…" : "保存登录密码"}
        </Button>
      </form>
    </div>
  );
}
