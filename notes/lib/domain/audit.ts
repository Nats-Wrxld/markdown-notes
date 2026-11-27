import "server-only";

import type { AppContext, AuditInput } from "@/lib/ports";

/**
 * Best-effort audit trail, matching existing behaviour: a failed write is
 * logged server-side but never fails the user operation.
 */
export async function audit(
  context: AppContext,
  entry: Omit<AuditInput, "actorId">,
): Promise<void> {
  try {
    await context.scope.audit.append({
      actorId: context.profile.id,
      ...entry,
    });
  } catch (error) {
    console.error(
      "audit log write failed",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}
