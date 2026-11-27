import type { NextRequest } from "next/server";
import type { AppContext } from "@/lib/ports";
import { isStaff } from "@/lib/types";
import { AppError } from "@/lib/domain/errors";

export function requireActive(context: AppContext): AppContext {
  if (context.profile.account_status === "suspended") {
    throw new AppError(
      "account_suspended",
      "Your account is suspended.",
    );
  }
  return context;
}

export function requireStaff(context: AppContext): AppContext {
  requireActive(context);
  if (!isStaff(context.profile.role)) {
    throw new AppError("forbidden", "You don’t have access to this area.");
  }
  return context;
}

export function requireOwner(context: AppContext): AppContext {
  requireActive(context);
  if (context.profile.role !== "owner") {
    throw new AppError("forbidden", "Only the platform owner can do that.");
  }
  return context;
}

/**
 * Cookie-authenticated mutations must come from our own origin. Bearer
 * requests (scripts/Postman) are exempt because they carry no ambient cookie.
 * A missing Origin is allowed so non-browser clients with a cookie jar work.
 */
export function assertSameOrigin(request: NextRequest, context: AppContext): void {
  if (context.via === "bearer") return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  const expected = request.nextUrl.origin;
  if (origin !== expected) {
    throw new AppError(
      "csrf_origin_mismatch",
      "This request did not come from the application origin.",
    );
  }
}
