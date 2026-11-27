/**
 * Compatibility shim. The implementation now lives behind the provider
 * boundary; the login/OAuth flow keeps importing this path unchanged.
 */
export { createCookieClient as createClient } from "@/lib/providers/supabase/client";
