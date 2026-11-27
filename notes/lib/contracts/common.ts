import { z } from "zod";

/** Shared enums and pagination shapes. Provider-free and safe in the browser. */

export const roleSchema = z.enum(["owner", "admin", "tutor"]);
export const accountStatusSchema = z.enum(["active", "suspended"]);

export type Role = z.infer<typeof roleSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const idSchema = z.uuid("Invalid identifier.");

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ApiErrorCode =
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

export const SETTINGS_CACHE_TAG = "platform-settings";

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function pageMeta(
  page: number,
  pageSize: number,
  total: number,
): PageMeta {
  return {
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
