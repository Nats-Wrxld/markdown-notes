import "server-only";

import type { AppContext } from "@/lib/ports";
import { createSupabaseScope } from "@/lib/providers/supabase/scope";
import { AppError, fromPortError } from "./errors";
import { getCurrentProfile } from "./session";

function bearer(header: string | null): boolean {
  return Boolean(header?.match(/^Bearer\s+.+$/i));
}

/** Validates a cookie session or bearer token for an API request. */
export async function authenticateRequest(
  request: Request,
): Promise<AppContext | null> {
  const authorization = request.headers.get("authorization");
  try {
    const scope = await createSupabaseScope(authorization);
    const user = await scope.session.getUser();
    if (!user) return null;

    const profile = await scope.profiles.findById(user.id);
    if (!profile) return null;

    return {
      profile,
      scope,
      via: bearer(authorization) ? "bearer" : "cookie",
    };
  } catch (error) {
    throw fromPortError(error as never, "Your session could not be verified.");
  }
}

export async function requireRequestContext(
  request: Request,
): Promise<AppContext> {
  const context = await authenticateRequest(request);
  if (!context) {
    throw new AppError("unauthenticated", "Sign in to continue.");
  }
  return context;
}

/**
 * In-process context for Server Components. Profile resolution is already
 * cached per request, so this adds no second auth round-trip.
 */
export async function getServerContext(): Promise<AppContext> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new AppError("unauthenticated", "Sign in to continue.");
  }
  const scope = await createSupabaseScope(null);
  return { profile, scope, via: "cookie" };
}
