import { redirect } from "next/navigation";

import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user } = await getServerAuthContext();

  redirect(user ? "/recipes" : "/login");
}
