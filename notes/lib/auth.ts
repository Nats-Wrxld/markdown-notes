import "server-only";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/domain/session";
import { dashboardPathForRole, type Profile, type Role } from "@/lib/types";

// Session access now lives behind the provider boundary; the public helper
// names (and their redirect behaviour) are unchanged for every caller.
export { getCurrentProfile };

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.account_status === "suspended") {
    redirect("/suspended");
  }
  return profile;
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireUser();
  if (!roles.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role));
  }
  return profile;
}

export async function requireOwner(): Promise<Profile> {
  return requireRole(["owner"]);
}

export async function requireStaff(): Promise<Profile> {
  return requireRole(["owner", "admin"]);
}