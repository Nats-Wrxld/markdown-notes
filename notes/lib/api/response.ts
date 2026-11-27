import { NextResponse } from "next/server";

export type ApiMeta = Record<string, unknown>;

export type ApiOutcome<T = unknown> = {
  data: T | null;
  status?: number;
  meta?: ApiMeta;
  location?: string;
};

const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
} as const;

export function apiHeaders(requestId: string): HeadersInit {
  return { ...BASE_HEADERS, "X-Request-Id": requestId };
}

export function jsonResponse<T>(
  outcome: ApiOutcome<T>,
  requestId: string,
): NextResponse {
  const status = outcome.status ?? 200;
  const headers = new Headers(apiHeaders(requestId));
  if (outcome.location) headers.set("Location", outcome.location);

  if (status === 204) {
    headers.delete("Content-Type");
    return new NextResponse(null, { status, headers });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  const body: Record<string, unknown> = { data: outcome.data };
  if (outcome.meta) body.meta = outcome.meta;
  return new NextResponse(JSON.stringify(body), { status, headers });
}

export function ok<T>(data: T, meta?: ApiMeta): ApiOutcome<T> {
  return { data, meta };
}

export function created<T>(data: T, location?: string): ApiOutcome<T> {
  return { data, status: 201, location };
}

export function noContent(): ApiOutcome<null> {
  return { data: null, status: 204 };
}
