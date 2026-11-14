import { describe, expect, it } from "vitest";
import { dashboardPathForRole, isStaff, STAFF_ROLES } from "@/lib/types";
import { summarizeNotes } from "@/lib/notes";
import type { DashboardNote } from "@/lib/types";

describe("role helpers", () => {
  it("treats owner and admin as staff, tutor as not", () => {
    expect(isStaff("owner")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("tutor")).toBe(false);
    expect(STAFF_ROLES).toEqual(["owner", "admin"]);
  });

  it("routes staff to /admin and tutors to /dashboard", () => {
    expect(dashboardPathForRole("owner")).toBe("/admin");
    expect(dashboardPathForRole("admin")).toBe("/admin");
    expect(dashboardPathForRole("tutor")).toBe("/dashboard");
  });
});

function note(createdAt: string, tags: string[]): DashboardNote {
  return {
    id: crypto.randomUUID(),
    title: "Test",
    body: { type: "doc", content: [{ type: "paragraph" }] },
    tags,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("summarizeNotes", () => {
  it("counts totals, this-week notes, and distinct tags", () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const stats = summarizeNotes([
      note(recent, ["work", "ideas"]),
      note(recent, ["work"]),
      note(old, ["journal"]),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.thisWeek).toBe(2);
    expect(stats.tagCount).toBe(3);
  });

  it("handles an empty notebook", () => {
    expect(summarizeNotes([])).toEqual({ total: 0, thisWeek: 0, tagCount: 0 });
  });
});