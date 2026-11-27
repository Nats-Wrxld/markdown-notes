import { NextResponse } from "next/server";
import { AppError } from "@/lib/domain/errors";
import { apiHeaders } from "./response";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

export function errorResponse(
  error: unknown,
  requestId: string,
  context: { method: string; path: string },
): NextResponse {
  if (error instanceof AppError) {
    return build(error.code, error.message, error.status, requestId, error.details);
  }

  // Never leak provider/internal text; log it with the correlation id instead.
  console.error("api request failed", {
    requestId,
    method: context.method,
    path: context.path,
    error: error instanceof Error ? error.message : "unknown error",
  });
  return build(
    "internal_error",
    "Something went wrong. Please try again.",
    500,
    requestId,
  );
}

function build(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: unknown,
): NextResponse {
  const body: ErrorBody = { error: { code, message, requestId } };
  if (details !== undefined && status < 500) {
    body.error.details = details;
  }

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      ...apiHeaders(requestId),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
