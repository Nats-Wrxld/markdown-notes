import type { JSONContent } from "@tiptap/core";
import type {
  AdminStats,
  AuditEntry,
  AuditLog,
  DashboardNote,
  Page,
  Profile,
  TutorOption,
} from "@/lib/types";
import type { AccountStatus, Role } from "@/lib/contracts/common";

/**
 * Provider-neutral capabilities. Nothing here knows about PostgREST, RLS or
 * Supabase types; adapters translate both directions.
 */

export type AuthUser = { id: string; email: string | null };

export type StoredNote = {
  id: string;
  userId: string;
  title: string;
  body: JSONContent;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type PlatformSettings = {
  allowPublicSignup: boolean;
  platformNotice: string;
};

export type ProfilePatch = {
  displayName?: string;
  avatarUrl?: string | null;
  accountStatus?: AccountStatus;
  role?: Role;
};

export type NotePageOptions = {
  page: number;
  pageSize: number;
  q?: string;
  tag?: string;
};

export type AdminNotePageOptions = {
  page: number;
  pageSize: number;
  q?: string;
  tutorId?: string;
};

export type AuditInput = {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

export interface SessionPort {
  /** Validates the current cookie session or bearer token. */
  getUser(): Promise<AuthUser | null>;
  updatePassword(password: string): Promise<void>;
}

export interface ProfilesPort {
  findById(id: string): Promise<Profile | null>;
  findByIds(ids: string[]): Promise<Profile[]>;
  findTutor(id: string): Promise<Profile | null>;
  update(id: string, patch: ProfilePatch): Promise<Profile>;
  listTutors(options: {
    page: number;
    pageSize: number;
    query?: string;
    status?: string;
  }): Promise<Page<Profile>>;
  listAdmins(): Promise<Profile[]>;
  listTutorOptions(): Promise<TutorOption[]>;
  countByRole(role: Role, status?: AccountStatus): Promise<number>;
}

export interface NotesPort {
  listByOwner(
    ownerId: string,
    options: NotePageOptions,
  ): Promise<Page<StoredNote>>;
  findOwned(id: string, ownerId: string): Promise<StoredNote | null>;
  findById(id: string): Promise<StoredNote | null>;
  create(input: {
    ownerId: string;
    title: string;
    body: JSONContent;
    tags: string[];
  }): Promise<StoredNote>;
  createMany(
    inputs: {
      ownerId: string;
      title: string;
      body: JSONContent;
      tags: string[];
    }[],
  ): Promise<number>;
  update(
    id: string,
    patch: { title?: string; body?: JSONContent; tags?: string[] },
  ): Promise<StoredNote | null>;
  updateOwned(
    id: string,
    ownerId: string,
    patch: { title?: string; body?: JSONContent; tags?: string[] },
  ): Promise<StoredNote | null>;
  deleteOwned(id: string, ownerId: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  listAll(options: AdminNotePageOptions): Promise<Page<StoredNote>>;
  listByTutor(tutorId: string, page: number, pageSize: number): Promise<Page<StoredNote>>;
  recent(limit: number): Promise<StoredNote[]>;
  countAll(): Promise<number>;
  countSince(iso: string): Promise<number>;
  summaryByOwner(ownerId: string): Promise<{ thisWeek: number; tagCount: number }>;
}

export interface SettingsPort {
  getPublic(): Promise<PlatformSettings>;
  update(
    settings: PlatformSettings,
    actorId: string,
  ): Promise<PlatformSettings>;
}

export interface AuditPort {
  append(entry: AuditInput): Promise<void>;
  recent(limit: number): Promise<AuditLog[]>;
  list(page: number, pageSize: number): Promise<Page<AuditLog>>;
}

export interface StoragePort {
  uploadAvatar(profileId: string, file: File): Promise<string>;
  removeAvatarByUrl(url: string | null): Promise<void>;
}

export interface AdminAccountsPort {
  createUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: "admin" | "tutor";
  }): Promise<{ id: string }>;
  sendReset(email: string, redirectTo: string): Promise<void>;
}

export type AppScope = {
  session: SessionPort;
  profiles: ProfilesPort;
  notes: NotesPort;
  settings: SettingsPort;
  audit: AuditPort;
  storage: StoragePort;
  accounts: AdminAccountsPort;
};

export type AppContext = {
  profile: Profile;
  scope: AppScope;
  via: "cookie" | "bearer";
};

/** Re-exported for domain signatures that build admin view models. */
export type { AdminStats, AuditEntry, DashboardNote, Page, Profile, TutorOption };
