import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole, type Profile, type Role } from "@/lib/types";

// getUser() validates the JWT with the Auth server on every call — never
// trust getSession() alone for authorization decisions.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  // Opt into request-time rendering before the Supabase client reads the clock,
  // so the session check never runs during a static prerender pass.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
});

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