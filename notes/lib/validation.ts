import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address.")
  .max(254, "Email is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(60, "Display name must be at most 60 characters.");

export const signupSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const noteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a title before saving.")
    .max(200, "Title must be at most 200 characters."),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
});

export const profileSchema = z.object({
  displayName: displayNameSchema,
});

export const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const createAccountSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["admin", "tutor"]),
});

export const platformSettingsSchema = z.object({
  allowPublicSignup: z.boolean(),
  platformNotice: z.string().max(500),
});

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type FieldErrors = Record<string, string[]>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}