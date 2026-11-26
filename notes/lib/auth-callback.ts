import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  // Password recovery must land on the reset form while the session is fresh.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Profiles are normally created by the auth.users trigger. Repair a missing
  // profile for this verified user with the server-only service-role client.
  // Never upsert: a repeated login must not overwrite an existing role/status.
  let { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle<Pick<Profile, "role" | "account_status">>();

  if (!profile) {
    const admin = createAdminClient();
    const email = user.email;
    if (!admin || !email) {
      return NextResponse.redirect(`${origin}/login?error=profile`);
    }

    const metadata = user.user_metadata ?? {};
    const displayName =
      (typeof metadata.display_name === "string" && metadata.display_name) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      email.split("@")[0];

    const avatarUrl =
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : null;

    const { error: createProfileError } = await admin.from("profiles").insert({
      id: user.id,
      email,
      display_name: displayName.slice(0, 60),
      avatar_url: avatarUrl,
      role: "tutor",
      account_status: "active",
    });

    // A concurrent callback may have created the row first. Re-read below;
    // any other provisioning failure is handled by the missing-profile check.
    if (createProfileError && createProfileError.code !== "23505") {
      return NextResponse.redirect(`${origin}/login?error=profile`);
    }

    const { data: repairedProfile } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "role" | "account_status">>();

    profile = repairedProfile;
  }

  if (!profile) {
    return NextResponse.redirect(`${origin}/login?error=profile`);
  }

  const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email";
  await logAudit({
    action: "auth.login",
    details: { method: provider === "email" ? "email_link" : "oauth", provider },
  });

  if (profile.account_status === "suspended") {
    return NextResponse.redirect(`${origin}/suspended`);
  }

  return NextResponse.redirect(`${origin}${dashboardPathForRole(profile.role)}`);
}
