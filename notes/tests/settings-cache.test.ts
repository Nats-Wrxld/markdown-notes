import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublic } = vi.hoisted(() => ({
  getPublic: vi.fn(async () => ({
    allowPublicSignup: true,
    platformNotice: "",
  })),
}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/lib/providers/supabase/scope", () => ({
  createPublicScope: () => ({ settings: { getPublic } }),
}));

import {
  getPublicSettings,
  invalidatePublicSettings,
} from "@/lib/domain/settings";

beforeEach(() => {
  invalidatePublicSettings();
  getPublic.mockClear();
});

describe("public settings cache", () => {
  it("serves repeated reads from one provider query", async () => {
    await getPublicSettings();
    await getPublicSettings();
    await getPublicSettings();
    expect(getPublic).toHaveBeenCalledTimes(1);
  });

  it("queries again immediately after an admin update invalidates it", async () => {
    await getPublicSettings();
    invalidatePublicSettings();
    await getPublicSettings();
    expect(getPublic).toHaveBeenCalledTimes(2);
  });
});
