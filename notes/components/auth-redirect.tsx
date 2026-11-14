import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/types";

// Rendered inside <Suspense> on the public auth pages so signed-in visitors
// are sent to their workspace instead of seeing the login/signup form.
export default async function AuthRedirect() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  redirect(
    profile.account_status === "suspended"
      ? "/suspended"
      : dashboardPathForRole(profile.role),
  );
}