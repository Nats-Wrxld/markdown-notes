import type { NextRequest } from "next/server";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation";
import { AppError } from "@/lib/domain/errors";
import { idSchema } from "@/lib/contracts/common";

export const JSON_BODY_LIMIT = 256 * 1024;
export const IMPORT_BODY_LIMIT = 2 * 1024 * 1024;
export const AVATAR_BODY_LIMIT = 2 * 1024 * 1024;

function invalid(message: string, details?: unknown): AppError {
  return new AppError("validation_error", message, details);
}

function assertSize(request: NextRequest, limit: number): void {
  const header = request.headers.get("content-length");
  if (header) {
    const length = Number(header);
    if (Number.isFinite(length) && length > limit) {
      throw new AppError("payload_too_large", "The request body is too large.");
    }
  }
}

export async function readJson<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  limit = JSON_BODY_LIMIT,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AppError(
      "unsupported_media_type",
      "Send the request as application/json.",
    );
  }
  assertSize(request, limit);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limit) {
    throw new AppError("payload_too_large", "The request body is too large.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw invalid("The request body is not valid JSON.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw invalid("The request body is invalid.", {
      fieldErrors: fieldErrors(parsed.error),
    });
  }
  return parsed.data;
}

export async function readFormData(
  request: NextRequest,
  limit = AVATAR_BODY_LIMIT,
): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new AppError(
      "unsupported_media_type",
      "Send the file as multipart/form-data.",
    );
  }
  assertSize(request, limit);
  try {
    return await request.formData();
  } catch {
    throw invalid("The uploaded form could not be read.");
  }
}

export function parseQuery<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): T {
  const entries: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    entries[key] = value;
  });

  const parsed = schema.safeParse(entries);
  if (!parsed.success) {
    throw invalid("The query parameters are invalid.", {
      fieldErrors: fieldErrors(parsed.error),
    });
  }
  return parsed.data;
}

export function parseId(value: string): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw invalid("Invalid identifier.", {
      fieldErrors: { id: ["Use a valid id."] },
    });
  }
  return parsed.data;
}

export function requestOrigin(request: NextRequest): string {
  return request.nextUrl.origin;
}
