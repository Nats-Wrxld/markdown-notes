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

  // [OAUTH-DIAG TEMPORARY — remove after diagnosis]
  console.log("[oauth-diag] callback hit", {
    pathname: request.nextUrl.pathname,
    paramKeys: Array.from(searchParams.keys()),
    hasCode: Boolean(code),
    codeLength: code?.length ?? 0,
    error: searchParams.get("error"),
    errorDescription: searchParams.get("error_description"),
    next,
    origin,
  });

  if (searchParams.get("error")) {
    console.log("[oauth-diag] redirect -> /login?error=oauth (error param present)");
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  if (!code) {
    console.log("[oauth-diag] redirect -> /login?error=link (no code)");
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.log("[oauth-diag] redirect -> /login?error=link (exchange failed)", {
      name: error.name,
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    });
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
  console.log("[oauth-diag] exchangeCodeForSession OK");

  // Password recovery must land on the reset form while the session is fresh.
  if (next === "/reset-password") {
    console.log("[oauth-diag] redirect -> /reset-password");
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[oauth-diag] getUser after exchange", {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user?.id ?? "")
    .single<Pick<Profile, "role" | "account_status">>();
  console.log("[oauth-diag] profile lookup", {
    hasProfile: Boolean(profile),
    role: profile?.role ?? null,
    accountStatus: profile?.account_status ?? null,
    profileError: profileError?.message ?? null,
  });

  if (user) {
    const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email";
    await logAudit({
      action: "auth.login",
      details: { method: provider === "email" ? "email_link" : "oauth", provider },
    });
  }

  if (profile?.account_status === "suspended") {
    console.log("[oauth-diag] redirect -> /suspended");
    return NextResponse.redirect(`${origin}/suspended`);
  }
  const target = `${origin}${profile ? dashboardPathForRole(profile.role) : next}`;
  console.log("[oauth-diag] redirect ->", target);
  return NextResponse.redirect(target);
}