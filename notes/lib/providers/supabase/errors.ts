import type { PostgrestError } from "@supabase/supabase-js";
import { PortError } from "@/lib/ports/errors";

/** Raw provider messages never reach a response; the code is kept for logs. */
export function translateError(error: PostgrestError | null): PortError | null {
  if (!error) return null;

  if (error.code === "PGRST116") {
    return new PortError("not_found", "The record could not be found.", error.code);
  }
  if (error.code === "23505") {
    return new PortError("conflict", "That record already exists.", error.code);
  }
  if (error.code === "23503" || error.code === "23514") {
    return new PortError("conflict", "The change conflicts with the current record.", error.code);
  }
  if (error.code?.startsWith("42") || error.code?.startsWith("PGRST")) {
    return new PortError("unavailable", "The data service rejected the request.", error.code);
  }
  return new PortError("unknown", "The data service request failed.", error.code);
}

export function asPortError(error: unknown): PortError {
  if (error instanceof PortError) return error;
  if (error instanceof Error) {
    return new PortError("unknown", "The data service request failed.", error.name);
  }
  return new PortError("unknown", "The data service request failed.");
}
