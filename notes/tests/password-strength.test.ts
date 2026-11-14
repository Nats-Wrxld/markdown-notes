import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "@/lib/password-strength";

describe("getPasswordStrength", () => {
  it("returns an empty label for an empty password", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "" });
  });

  it("scores anything under 8 characters as too short", () => {
    expect(getPasswordStrength("Ab1!xyz").score).toBe(0);
    expect(getPasswordStrength("Ab1!xyz").label).toBe("Too short");
    expect(getPasswordStrength("Ab1!xyz9").score).toBeGreaterThan(0);
  });

  it("caps common and repeated passwords at weak", () => {
    expect(getPasswordStrength("password123").score).toBe(1);
    expect(getPasswordStrength("PASSWORD123").score).toBe(1);
    expect(getPasswordStrength("aaaaaaaaaa").score).toBe(1);
    expect(getPasswordStrength("12345678").score).toBe(1);
  });

  it("rewards character variety and length", () => {
    expect(getPasswordStrength("abcdefghij").score).toBe(1);
    expect(getPasswordStrength("abcd1234ef").score).toBe(2);
    expect(getPasswordStrength("Abcd1234ef").score).toBe(3);
    expect(getPasswordStrength("Abcd1234efgh").score).toBe(4);
    expect(getPasswordStrength("Ab1!efghijkl").score).toBe(4);
  });

  it("never exceeds score 4", () => {
    expect(getPasswordStrength("Ab1!".repeat(10)).score).toBe(4);
  });
});