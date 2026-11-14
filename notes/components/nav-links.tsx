"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { dashboardPathForRole, isStaff, type Profile } from "@/lib/types";

type NavItem = { href: string; label: string };

export default function NavLinks({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const homeHref = dashboardPathForRole(profile.role);

  const items: NavItem[] = [
    { href: homeHref, label: isStaff(profile.role) ? "Overview" : "Notebook" },
    ...(isStaff(profile.role)
      ? [
          { href: "/admin/tutors", label: "Tutors" },
          { href: "/admin/notes", label: "Notes" },
          { href: "/admin/activity", label: "Activity" },
          ...(profile.role === "owner"
            ? [{ href: "/admin/settings", label: "Settings" }]
            : []),
        ]
      : []),
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== homeHref && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nav-link rounded-full border px-4 py-2 text-xs font-semibold ${
              active ? "nav-link-active" : "ui-surface-control"
            }`}
          >
            {active && !reduce && (
              <motion.span
                layoutId="nav-pill"
                className="nav-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}