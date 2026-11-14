export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein1",
  "welcome1",
  "iloveyou",
  "admin123",
  "abc12345",
  "monkey123",
  "dragon123",
  "sunshine1",
  "princess1",
  "football1",
  "baseball1",
  "trustno1",
]);

const LABELS: Record<PasswordStrength["score"], string> = {
  0: "Too short",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: "" };
  }
  if (password.length < 8) {
    return { score: 0, label: LABELS[0] };
  }

  const normalized = password.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized) || /^(.)\1+$/.test(password)) {
    return { score: 1, label: LABELS[1] };
  }

  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^a-zA-Z0-9]/.test(password)) classes += 1;

  let score = 1;
  if (classes >= 2) score += 1;
  if (classes >= 3) score += 1;
  if (password.length >= 12) score += 1;

  const capped = Math.min(score, 4) as PasswordStrength["score"];
  return { score: capped, label: LABELS[capped] };
}