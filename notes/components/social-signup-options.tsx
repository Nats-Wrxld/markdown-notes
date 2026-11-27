import { serverApi } from "@/lib/api-client/server";
import { EmailDivider, SocialAuthButtons } from "@/components/social-auth-buttons";

// Social sign-up follows the owner's public-registration switch.
// Existing users can always sign in with a provider from the login page.
export default async function SocialSignupOptions() {
  const settings = await serverApi.settings.public();
  if (!settings.allowPublicSignup) return null;

  return (
    <>
      <SocialAuthButtons />
      <EmailDivider />
    </>
  );
}