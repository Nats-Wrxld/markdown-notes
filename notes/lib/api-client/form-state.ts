import type { NoteDto } from "@/lib/contracts/note";

export type NoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  note?: NoteDto;
  importedCount?: number;
};

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  avatarUrl?: string | null;
};

export type AdminFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};
