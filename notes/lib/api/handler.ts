import "server-only";

import type { NextRequest } from "next/server";
import type { AppContext } from "@/lib/ports";
import {
  authenticateRequest,
  requireRequestContext,
} from "@/lib/domain/context";
import { AppError } from "@/lib/domain/errors";
import { assertSameOrigin, requireActive } from "./policies";
import { jsonResponse, type ApiOutcome } from "./response";
import { errorResponse } from "./errors";

export { ok, created, noContent } from "./response";

type AuthMode = "required" | "optional" | "none";

type HandlerOptions = {
  auth?: AuthMode;
  /** Cookie-auth mutations are checked against the application origin. */
  mutation?: boolean;
  /** Session probes must still describe a suspended account. */
  allowSuspended?: boolean;
};

type HandlerInput = {
  request: NextRequest;
  context: AppContext | null;
  requestId: string;
};

type Handler = (input: HandlerInput) => Promise<ApiOutcome<unknown>>;

export function requireContext(context: AppContext | null): AppContext {
  if (!context) {
    throw new AppError("unauthenticated", "Sign in to continue.");
  }
  return context;
}

function requestIdFor(request: NextRequest): string {
  const supplied = request.headers.get("x-request-id");
  if (supplied && supplied.length > 0 && supplied.length <= 64) {
    return supplied;
  }
  return crypto.randomUUID();
}

/**
 * One wrapper for every endpoint: request id, authentication, suspension,
 * origin policy, error mapping, envelope and cache headers.
 */
export async function handle(
  request: NextRequest,
  options: HandlerOptions,
  handler: Handler,
): Promise<Response> {
  const requestId = requestIdFor(request);
  const auth = options.auth ?? "required";

  try {
    const context =
      auth === "none" ? null : await requireOrRead(request, auth);
    if (context && !options.allowSuspended) {
      requireActive(context);
    }
    if (options.mutation && context) {
      assertSameOrigin(request, context);
    }

    const outcome = await handler({ request, context, requestId });
    return jsonResponse(outcome, requestId);
  } catch (error) {
    return errorResponse(error, requestId, {
      method: request.method,
      path: request.nextUrl.pathname,
    });
  }
}

async function requireOrRead(
  request: NextRequest,
  mode: Exclude<AuthMode, "none">,
): Promise<AppContext | null> {
  if (mode === "optional") {
    return authenticateRequest(request);
  }
  return requireRequestContext(request);
}
