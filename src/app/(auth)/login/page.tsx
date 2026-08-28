import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { nextPathSchema } from "@/features/auth/schemas";
import { PROJECT_META } from "@/lib/project-meta";

export const metadata: Metadata = { title: `登录 · ${PROJECT_META.name}` };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const nextPath = nextPathSchema.parse(next);
  const initialMessage =
    error === "auth_callback"
      ? "登录链接无效或已过期，请重新发送"
      : undefined;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登录{PROJECT_META.name}</CardTitle>
          <CardDescription>使用邮箱验证码同步你的个人菜谱。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialMessage={initialMessage} nextPath={nextPath} />
        </CardContent>
      </Card>
    </main>
  );
}
