import "server-only";

import { PortError } from "@/lib/ports/errors";
import type { PortErrorKind } from "@/lib/ports/errors";

export type AppErrorCode =
  | "validation_error"
  | "unauthenticated"
  | "forbidden"
  | "account_suspended"
  | "csrf_origin_mismatch"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "unavailable"
  | "internal_error";

const STATUS: Record<AppErrorCode, number> = {
  validation_error: 400,
  unauthenticated: 401,
  forbidden: 403,
  account_suspended: 403,
  csrf_origin_mismatch: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  unavailable: 503,
  internal_error: 500,
};

export class AppError extends Error {
  public readonly status: number;

  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown,
    status?: number,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status ?? STATUS[code];
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Map a provider-neutral port failure to a domain error. */
export function fromPortError(
  error: PortError,
  fallbackMessage = "Something went wrong. Please try again.",
): AppError {
  const kind: PortErrorKind = error.kind;
  if (kind === "not_found") {
    return new AppError("not_found", "That item could not be found.");
  }
  if (kind === "conflict") {
    return new AppError("conflict", error.message);
  }
  if (kind === "unavailable") {
    return new AppError("unavailable", error.message);
  }
  return new AppError("internal_error", fallbackMessage);
}
