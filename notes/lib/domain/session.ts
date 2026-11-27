import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { createSupabaseScope } from "@/lib/providers/supabase/scope";
import type { Profile } from "@/lib/types";
import { fromPortError } from "./errors";

/**
 * Resolves the signed-in profile through the provider boundary. The session
 * cookie format and refresh path are unchanged: the adapter reads the same
 * Supabase cookies via `lib/supabase/server`.
 *
 * `getUser()` validates the JWT with the Auth server; `cache` keeps it to one
 * lookup per request/action.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  await connection();
  try {
    const scope = await createSupabaseScope(null);
    const user = await scope.session.getUser();
    if (!user) return null;
    return await scope.profiles.findById(user.id);
  } catch (error) {
    throw fromPortError(error as never, "Your account could not be loaded.");
  }
});
