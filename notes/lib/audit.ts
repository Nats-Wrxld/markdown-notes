import "server-only";

import { createClient } from "@/lib/supabase/server";

type AuditEntry = {
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

// Append-only audit trail. A failed write is logged server-side but never
// breaks the user operation; RLS restricts reads to staff.
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
    if (error) {
      console.error("audit log write failed", error.message);
    }
  } catch (error) {
    console.error("audit log write failed", error);
  }
}