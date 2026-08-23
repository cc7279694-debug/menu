import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          退出登录
        </Button>
      </form>
    </section>
  );
}
