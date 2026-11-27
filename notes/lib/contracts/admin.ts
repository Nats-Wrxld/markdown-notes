import { z } from "zod";
import {
  createAccountSchema,
  displayNameSchema,
  platformSettingsSchema,
} from "@/lib/validation";
import {
  accountStatusSchema,
  idSchema,
  paginationSchema,
  roleSchema,
} from "./common";

export const adminTutorsQuerySchema = z
  .object({
    page: paginationSchema.shape.page,
    pageSize: paginationSchema.shape.pageSize,
    q: z.string().trim().max(100).optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .strict();

export const updateTutorSchema = z
  .strictObject({
    displayName: displayNameSchema.optional(),
    accountStatus: accountStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.displayName !== undefined || value.accountStatus !== undefined,
    { message: "Send a display name or an account status." },
  );

export const adminNotesQuerySchema = z
  .object({
    page: paginationSchema.shape.page,
    pageSize: paginationSchema.shape.pageSize,
    q: z.string().trim().max(100).optional(),
    tutorId: idSchema.optional(),
  })
  .strict();

export const createAdminAccountSchema = createAccountSchema;

export const accountRoleSchema = z.strictObject({
  role: roleSchema.exclude(["owner"]),
});

export const adminSettingsSchema = platformSettingsSchema;
