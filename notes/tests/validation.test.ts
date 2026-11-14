import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createAccountSchema,
  displayNameSchema,
  emailSchema,
  noteInputSchema,
  passwordSchema,
  platformSettingsSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation";

describe("passwordSchema", () => {
  it("enforces the 8–72 character bounds", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts valid addresses and rejects malformed ones", () => {
    expect(emailSchema.safeParse("tutor@example.com").success).toBe(true);
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse(`${"a".repeat(250)}@example.com`).success).toBe(false);
  });
});

describe("displayNameSchema", () => {
  it("trims and enforces 1–60 characters", () => {
    expect(displayNameSchema.parse("  Ada  ")).toBe("Ada");
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
    expect(displayNameSchema.safeParse("a".repeat(60)).success).toBe(true);
    expect(displayNameSchema.safeParse("a".repeat(61)).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    displayName: "Ada",
    email: "ada@example.com",
    password: "password123",
    confirmPassword: "password123",
  };

  it("requires name, email, and a strong-enough password", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("flags a confirm-password mismatch on confirmPassword", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "password124" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      expect(result.error.issues[0].message).toBe("Passwords do not match.");
    }
    expect(
      signupSchema.safeParse({ displayName: "Ada", email: "ada@example.com", password: "password123" }).success,
    ).toBe(false);
  });
});

describe("noteInputSchema", () => {
  it("requires a non-empty title up to 200 characters", () => {
    expect(noteInputSchema.safeParse({ title: "  ", tags: [] }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: "A".repeat(200), tags: [] }).success).toBe(true);
    expect(noteInputSchema.safeParse({ title: "A".repeat(201), tags: [] }).success).toBe(false);
  });

  it("limits tags to 10 entries of 30 characters", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    expect(noteInputSchema.safeParse({ title: "x", tags }).success).toBe(true);
    expect(noteInputSchema.safeParse({ title: "x", tags: [...tags, "extra"] }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: "x", tags: ["a".repeat(31)] }).success).toBe(false);
  });
});

describe("createAccountSchema", () => {
  const base = { displayName: "Ada", email: "ada@example.com", password: "password123" };

  it("allows only admin and tutor roles — never owner", () => {
    expect(createAccountSchema.safeParse({ ...base, role: "tutor" }).success).toBe(true);
    expect(createAccountSchema.safeParse({ ...base, role: "admin" }).success).toBe(true);
    expect(createAccountSchema.safeParse({ ...base, role: "owner" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...base, role: "superuser" }).success).toBe(false);
    expect(createAccountSchema.safeParse(base).success).toBe(false);
  });
});

describe("password confirmation schemas", () => {
  it("flags mismatches on confirmPassword", () => {
    const mismatch = { password: "password123", confirmPassword: "password124" };
    for (const schema of [changePasswordSchema, resetPasswordSchema]) {
      const result = schema.safeParse(mismatch);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      }
    }
    expect(
      changePasswordSchema.safeParse({ password: "password123", confirmPassword: "password123" }).success,
    ).toBe(true);
  });
});

describe("platformSettingsSchema", () => {
  it("caps the notice at 500 characters", () => {
    expect(
      platformSettingsSchema.safeParse({ allowPublicSignup: true, platformNotice: "a".repeat(500) }).success,
    ).toBe(true);
    expect(
      platformSettingsSchema.safeParse({ allowPublicSignup: false, platformNotice: "a".repeat(501) }).success,
    ).toBe(false);
  });
});