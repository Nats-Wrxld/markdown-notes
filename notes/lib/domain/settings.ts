import "server-only";

import { connection } from "next/server";
import type { AppContext, PlatformSettings } from "@/lib/ports";
import { createPublicScope } from "@/lib/providers/supabase/scope";
import { requireOwner } from "@/lib/api/policies";
import { fromPortError } from "./errors";
import { audit } from "./audit";

/**
 * Public settings change rarely and are read on every landing/signup render.
 * A short, per-instance cache removes the repeated two-row query without ever
 * holding private data. Mutations clear this instance immediately; other
 * instances are bounded by the TTL.
 */
const TTL_MS = 30_000;
let cached: { value: PlatformSettings; expiresAt: number } | null = null;

export async function getPublicSettings(): Promise<PlatformSettings> {
  // Settings are request-time data; opting in before reading the clock keeps
  // Cache Components from treating Date.now() as an unstable prerender value.
  await connection();
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const value = await createPublicScope().settings.getPublic();
    cached = { value, expiresAt: Date.now() + TTL_MS };
    return value;
  } catch (error) {
    throw fromPortError(error as never, "Platform settings could not be loaded.");
  }
}

export function invalidatePublicSettings(): void {
  cached = null;
}

export async function getAdminSettings(
  context: AppContext,
): Promise<PlatformSettings> {
  requireOwner(context);
  try {
    return await context.scope.settings.getPublic();
  } catch (error) {
    throw fromPortError(error as never, "Settings could not be loaded.");
  }
}

export async function updatePlatformSettings(
  context: AppContext,
  settings: PlatformSettings,
): Promise<PlatformSettings> {
  requireOwner(context);
  try {
    const saved = await context.scope.settings.update(
      settings,
      context.profile.id,
    );
    invalidatePublicSettings();
    await audit(context, {
      action: "settings.updated",
      details: { allowPublicSignup: settings.allowPublicSignup },
    });
    return saved;
  } catch (error) {
    throw fromPortError(error as never, "Settings couldn’t be saved. Please try again.");
  }
}
