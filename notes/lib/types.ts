import type { JSONContent } from "@tiptap/core";

export type Role = "owner" | "admin" | "tutor";
export type AccountStatus = "active" | "suspended";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  body: unknown;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type DashboardNote = {
  id: string;
  title: string;
  body: JSONContent;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type UserPreferences = {
  user_id: string;
  theme: "light" | "dark";
  background_id: string | null;
  updated_at: string;
};

export const STAFF_ROLES: Role[] = ["owner", "admin"];

export function isStaff(role: Role): boolean {
  return role === "owner" || role === "admin";
}

export function dashboardPathForRole(role: Role): string {
  return isStaff(role) ? "/admin" : "/dashboard";
}