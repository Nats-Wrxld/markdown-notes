"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/app/theme-provider";
import Avatar from "@/components/avatar";
import NavLinks from "@/components/nav-links";
import { dashboardPathForRole, type Profile } from "@/lib/types";

export default function AppHeader({ profile }: { profile: Profile }) {
  const homeHref = dashboardPathForRole(profile.role);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href={homeHref}
        className="ui-surface-panel flex shrink-0 items-center gap-3 rounded-2xl border px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
        aria-label="UrSpace home"
      >
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[var(--brand-terracotta)] text-white shadow-[0_6px_18px_rgba(158,98,68,0.2)] sm:size-10">
          <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
            <path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M14 4v5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="ui-text-primary hidden text-[21px] font-semibold tracking-[-0.055em] min-[420px]:inline">
          UrS<span className="urspace-flip">p</span>ace
        </span>
      </Link>

      <div ref={menuRef} className="relative flex min-w-0 items-center gap-2">
        <span className="ui-status-pill flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium sm:px-3">
          <Avatar profile={profile} size={24} />
          <span className="max-w-[6.5rem] truncate sm:max-w-[11rem]">
            {profile.display_name || profile.email}
          </span>
        </span>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-controls="app-header-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          title="Menu"
          className="app-header-menu-trigger"
        >
          {isMenuOpen ? (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 12.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M15.3 11.3a1.3 1.3 0 0 0 .3 1.4l.1.1a1.55 1.55 0 1 1-2.2 2.2l-.1-.1a1.3 1.3 0 0 0-1.4-.3 1.3 1.3 0 0 0-.8 1.2v.2a1.55 1.55 0 1 1-3.1 0v-.1a1.3 1.3 0 0 0-.8-1.2 1.3 1.3 0 0 0-1.4.3l-.1.1a1.55 1.55 0 1 1-2.2-2.2l.1-.1a1.3 1.3 0 0 0 .3-1.4 1.3 1.3 0 0 0-1.2-.8H3a1.55 1.55 0 1 1 0-3.1h.1a1.3 1.3 0 0 0 1.2-.8 1.3 1.3 0 0 0-.3-1.4l-.1-.1a1.55 1.55 0 1 1 2.2-2.2l.1.1a1.3 1.3 0 0 0 1.4.3h.1a1.3 1.3 0 0 0 .8-1.2V3a1.55 1.55 0 1 1 3.1 0v.1a1.3 1.3 0 0 0 .8 1.2 1.3 1.3 0 0 0 1.4-.3l.1-.1a1.55 1.55 0 1 1 2.2 2.2l-.1.1a1.3 1.3 0 0 0-.3 1.4v.1a1.3 1.3 0 0 0 1.2.8h.2a1.55 1.55 0 1 1 0 3.1h-.1a1.3 1.3 0 0 0-1.2.8Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {isMenuOpen && (
          <div id="app-header-menu" role="menu" aria-label="Menu" className="app-header-menu-panel">
            <p className="header-menu-eyebrow">Navigate</p>
            <div className="header-menu-links" onClick={() => setIsMenuOpen(false)}>
              <NavLinks profile={profile} layout="menu" />
            </div>
            <div className="header-menu-divider" />
            <ThemeToggle />
            <div className="header-menu-divider" />
            <form action={logOut} onClick={() => setIsMenuOpen(false)}>
              <button type="submit" role="menuitem" className="header-menu-action">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M12.5 6.5V4.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 4.5v11A1.5 1.5 0 0 0 5.5 17H11a1.5 1.5 0 0 0 1.5-1.5v-2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8.5 10h8m0 0-2.5-2.5M16.5 10 14 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Log out</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
