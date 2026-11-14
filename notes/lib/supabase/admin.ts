import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Trusted server-side client for account provisioning (Supabase Admin API).
// The service-role key must never reach the browser: this module is guarded
// by `server-only` and the key has no NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}