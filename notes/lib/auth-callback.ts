import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { dashboardPathForRole, type Profile } from "@/lib/types";

// Shared by /auth/callback (OAuth) and /auth/confirm (email links/recovery).
// Exchanges a Supabase auth code for a session, then continues to a local
// path only — never an open redirect.
export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  // Password recovery must land on the reset form while the session is fresh.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user?.id ?? "")
    .single<Pick<Profile, "role" | "account_status">>();

  if (user) {
    const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email";
    await logAudit({
      action: "auth.login",
      details: { method: provider === "email" ? "email_link" : "oauth", provider },
    });
  }

  if (profile?.account_status === "suspended") {
    return NextResponse.redirect(`${origin}/suspended`);
  }
  const target = `${origin}${profile ? dashboardPathForRole(profile.role) : next}`;
  return NextResponse.redirect(target);
}