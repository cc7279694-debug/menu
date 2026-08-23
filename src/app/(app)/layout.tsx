import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
