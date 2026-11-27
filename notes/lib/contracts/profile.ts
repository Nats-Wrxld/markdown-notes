import { z } from "zod";
import { displayNameSchema } from "@/lib/validation";
import type { Role, AccountStatus } from "./common";

/** Wire shape for a profile. Providers store snake_case; routes serialise. */
export type ProfileDto = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export const updateProfileSchema = z
  .strictObject({
    displayName: displayNameSchema,
  })
  .describe("A display name only — identity fields are never client-writable.");

export const changePasswordSchema = z.strictObject({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});
