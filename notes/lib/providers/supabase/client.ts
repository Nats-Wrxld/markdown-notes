import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function env() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** Cookie-bound client. Reads the existing Supabase session; proxy.ts keeps it
 * refreshed. This is the same behaviour the app used before the API layer. */
export async function createCookieClient(): Promise<SupabaseClient> {
  const { url, key } = env();
  if (!url || !key) {
    throw new Error("Supabase environment is not configured.");
  }
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes instead.
        }
      },
    },
  });
}

/** Bearer client for scripts/Postman. RLS still applies because every query
 * carries the caller's access token. */
export function createTokenClient(token: string): SupabaseClient {
  const { url, key } = env();
  if (!url || !key) {
    throw new Error("Supabase environment is not configured.");
  }
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Cookie-free client for cacheable public reads (platform settings). */
export function createAnonClient(): SupabaseClient {
  const { url, key } = env();
  if (!url || !key) {
    throw new Error("Supabase environment is not configured.");
  }
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/** Service-role client, used only for account provisioning. Guarded by
 * `server-only` here; the key has no NEXT_PUBLIC_ prefix. */
export function createAdminClient(): SupabaseClient | null {
  const { url } = env();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
