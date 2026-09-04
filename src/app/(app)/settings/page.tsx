import { OfflineSettingsControls } from "@/features/offline/components/offline-settings-controls";
import { PasswordSettingsForm } from "@/features/auth/components/password-settings-form";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export default async function SettingsPage() {
  const { user } = await getServerAuthContext();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>
      <PasswordSettingsForm />
      <OfflineSettingsControls />
    </section>
  );
}
