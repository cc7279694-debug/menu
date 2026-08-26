import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Reuse the authenticated Supabase client and user during one RSC request.
 * React scopes `cache` to the current server render, so auth state is never
 * shared between different users or requests.
 */
export const getServerAuthContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    supabase,
    user: data.user,
    error,
  };
});
