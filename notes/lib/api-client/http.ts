/** Browser-side HTTP client. Cookies are sent same-origin; no provider SDK. */

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export const API_BASE = "/api/v1";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: T;
        error?: {
          code?: string;
          message?: string;
          details?: unknown;
          requestId?: string;
        };
      }
    | null;

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiClientError(
      error?.code ?? "internal_error",
      error?.message ?? "Something went wrong. Please try again.",
      response.status,
      error?.details,
      error?.requestId,
    );
  }

  return payload?.data as T;
}

export function apiJson<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function fieldErrorsOf(
  error: unknown,
): Record<string, string[]> | null {
  if (!(error instanceof ApiClientError)) return null;
  const details = error.details as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  if (details?.fieldErrors) return details.fieldErrors;
  const direct = error.details as Record<string, string[]> | undefined;
  if (direct && typeof direct === "object") return direct;
  return null;
}

export function messageFor(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "You need to be logged in to do that.";
    if (error.code === "account_suspended") return "Your account is suspended.";
    if (error.status === 413) return "That file is too large.";
    if (error.status === 415) return "That file type isn’t supported.";
    if (error.status >= 500) return fallback;
    return error.message;
  }
  return fallback;
}
