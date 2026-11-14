"use client";

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Enter } from "@/components/motion";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      {...props}
      className={`ui-button ui-button-${variant} ${className}`}
    />
  );
}

export function SubmitButton({
  children,
  pendingText,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-4" label={pendingText ?? "Working"} />
          <span>{pendingText ?? "Working…"}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

export function Input({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return <input {...props} className={`ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${className}`} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="ui-text-secondary mb-2 block text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="ui-text-muted mt-2 text-xs">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="ui-text-error mt-2 text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`ui-alert ui-alert-${tone} rounded-xl border px-4 py-3 text-sm`}>
      {children}
    </p>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "accent";
  children: ReactNode;
}) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function Spinner({ label = "Loading", className = "size-5" }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={`ui-spinner inline-block ${className} animate-spin rounded-full border-2 border-current border-t-transparent`} />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Enter className="ui-surface-panel flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center">
      {icon && (
        <span className="empty-float ui-surface-subtle mb-4 flex size-12 items-center justify-center rounded-2xl">
          {icon}
        </span>
      )}
      <h3 className="ui-text-secondary text-sm font-semibold">{title}</h3>
      <p className="ui-text-muted mt-2 max-w-xs text-xs leading-5">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Enter>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ui-skeleton rounded-xl ${className}`} />;
}

// Client-rendered so the clock read never blocks a cached prerender: the server
// snapshot is empty, the live year is read only on the client after hydration.
const subscribeNoop = () => () => {};
const getYearSnapshot = () => new Date().getFullYear();
const getYearServerSnapshot = () => null;

export function CurrentYear() {
  const year = useSyncExternalStore(subscribeNoop, getYearSnapshot, getYearServerSnapshot);
  return <>{year}</>;
}