"use client";

import { useState, type ReactNode } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Spinner } from "@/components/ui";

const PROVIDERS: { id: Provider; label: string; icon: ReactNode }[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z" />
        <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.04 11.04 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    ),
  },
  {
    id: "azure",
    label: "Microsoft",
    icon: (
      <svg viewBox="0 0 23 23" className="size-[18px] shrink-0" aria-hidden="true">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M12 1h10v10H12z" />
        <path fill="#00A4EF" d="M1 12h10v10H1z" />
        <path fill="#FFB900" d="M12 12h10v10H12z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0" aria-hidden="true">
        <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0" aria-hidden="true">
        <path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.95 3.6 2.89 1.45-.06 2-.93 3.74-.93 1.74 0 2.23.93 3.76.9 1.56-.03 2.54-1.42 3.49-2.81 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.02-1.16-3.05-4.6ZM14.16 4.06c.79-.96 1.32-2.29 1.18-3.62-1.14.05-2.52.76-3.34 1.72-.73.85-1.38 2.21-1.21 3.51 1.27.1 2.58-.65 3.37-1.61Z" />
      </svg>
    ),
  },
];

export function SocialAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startOAuth(provider: Provider, label: string) {
    setPending(provider);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setPending(null);
      setError(`Could not start ${label} sign-in. Try again, or use email.`);
    }
    // On success the browser navigates to the provider; keep the button pending.
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            className="w-full gap-2 px-3 text-[13px] whitespace-nowrap"
            disabled={pending !== null}
            onClick={() => startOAuth(provider.id, provider.label)}
          >
            {pending === provider.id ? (
              <Spinner label={`Connecting to ${provider.label}`} />
            ) : (
              provider.icon
            )}
            {provider.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function EmailDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--border-soft)]" aria-hidden="true" />
      <span className="ui-text-muted text-xs font-medium">Or continue with email</span>
      <span className="h-px flex-1 bg-[var(--border-soft)]" aria-hidden="true" />
    </div>
  );
}