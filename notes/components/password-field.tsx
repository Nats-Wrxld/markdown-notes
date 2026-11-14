"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { getPasswordStrength } from "@/lib/password-strength";

const SEGMENT_COLORS = [
  "var(--text-error)",
  "var(--text-error)",
  "var(--text-accent)",
  "var(--accent-lavender)",
  "var(--text-success)",
];

export function PasswordField({
  id,
  name,
  label,
  autoComplete = "new-password",
  error,
  hint,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const handleReset = () => setValue("");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  const strength = getPasswordStrength(value);
  const describedBy =
    [error ? `${id}-error` : null, value ? `${id}-strength` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Field label={label} htmlFor={id} error={error} hint={value ? undefined : hint}>
      <PasswordInput
        ref={inputRef}
        id={id}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        maxLength={72}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      {value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    index < strength.score
                      ? SEGMENT_COLORS[strength.score]
                      : "var(--border-soft)",
                }}
              />
            ))}
          </div>
          <p
            id={`${id}-strength`}
            className="mt-1.5 text-xs font-medium"
            style={{ color: SEGMENT_COLORS[strength.score] }}
          >
            {strength.score === 0
              ? "Too short — use at least 8 characters"
              : strength.score === 1
                ? "Weak — mix letters, numbers and symbols"
                : strength.label}
          </p>
        </div>
      )}
    </Field>
  );
}