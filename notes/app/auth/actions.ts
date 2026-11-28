"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { dashboardPathForRole, type Profile } from "@/lib/types";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type FieldErrors,
} from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  success?: string;
  redirectTo?: string;
};

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data: setting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "allow_public_signup")
    .maybeSingle();
  if (setting && setting.value === false) {
    return { error: "Public registration is currently disabled by the platform owner." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    // Do not reveal whether the email is already registered.
    return { error: "Could not create the account. Try again, or log in if you already have one." };
  }

  // With email confirmation enabled, Supabase returns an obfuscated user
  // (empty identities) for already-registered emails — same generic response.
  if (data.session) {
    await logAudit({ action: "auth.signup", details: { method: "password" } });
    return { redirectTo: "/dashboard" };
  }

  return {
    success:
      "Account created. Check your email for a confirmation link to finish setting up your space.",
  };
}

export async function logIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email address before logging in. Check your inbox for the link." };
    }
    return { error: "Wrong email or password" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user?.id ?? "")
    .single<Pick<Profile, "role" | "account_status">>();

  await logAudit({ action: "auth.login", details: { method: "password" } });

  if (!profile) {
    return { error: "Wrong email or password" };
  }
  if (profile.account_status === "suspended") {
    return { redirectTo: "/suspended" };
  }
  return { redirectTo: dashboardPathForRole(profile.role) };
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await logAudit({ action: "auth.logout" });
  // Revokes the refresh token and clears the session cookies.
  await supabase.auth.signOut();
  // Drop every cached authenticated render so the browser cannot show a stale
  // signed-in page (header, dashboard) after the session is gone.
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });

  // Identical response whether or not the account exists.
  return {
    success: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Could not update the password. Request a new reset link and try again." };
  }

  await logAudit({ action: "auth.password_reset" });
  await supabase.auth.signOut();
  return { redirectTo: "/login?reset=1" };
}