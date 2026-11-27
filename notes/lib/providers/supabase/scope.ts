import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
import type {
  AppScope,
  AuditInput,
  NotePageOptions,
  PlatformSettings,
  ProfilePatch,
  StoredNote,
} from "@/lib/ports";
import { PortError } from "@/lib/ports/errors";
import type { AuditLog, Page, Profile, TutorOption } from "@/lib/types";
import type { AccountStatus, Role } from "@/lib/contracts/common";
import {
  AUDIT_COLUMNS,
  NOTE_COLUMNS,
  NOTE_SUMMARY_COLUMNS,
  PROFILE_COLUMNS,
  toAuditLog,
  toPage,
  toPlatformSettings,
  toProfile,
  toStoredNote,
  type AuditRow,
  type NoteRow,
  type ProfileRow,
} from "./mappers";
import { asPortError, translateError } from "./errors";
import {
  createAdminClient,
  createAnonClient,
  createCookieClient,
  createTokenClient,
} from "./client";

const AVATAR_BUCKET = "avatars";
const AVATAR_MARKER = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
const AVATAR_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/** PostgREST uses commas/parens as filter syntax. */
function searchPattern(query: string): string {
  return query.trim().replace(/[,()%]/g, "");
}

function fail(error: Parameters<typeof translateError>[0]): PortError {
  return translateError(error) ?? new PortError("unknown", "The data service request failed.");
}

function avatarObjectPath(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const index = publicUrl.indexOf(AVATAR_MARKER);
  if (index === -1) return null;
  return publicUrl.slice(index + AVATAR_MARKER.length);
}

function createScope(client: SupabaseClient, bearerToken?: string): AppScope {
  const findProfile = async (id: string): Promise<Profile | null> => {
    const { data, error } = await client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw fail(error);
    return data ? toProfile(data as ProfileRow) : null;
  };

  const countNotes = async (iso?: string): Promise<number> => {
    let request = client
      .from("notes")
      .select("id", { count: "exact", head: true });
    if (iso) request = request.gte("created_at", iso);
    const { count, error } = await request;
    if (error) throw fail(error);
    return count ?? 0;
  };

  return {
    session: {
      async getUser() {
        const { data, error } = bearerToken
          ? await client.auth.getUser(bearerToken)
          : await client.auth.getUser();
        if (error || !data.user) return null;
        return { id: data.user.id, email: data.user.email ?? null };
      },
      async updatePassword(password: string) {
        const { error } = await client.auth.updateUser({ password });
        if (error) {
          throw new PortError("unknown", "The password could not be updated.", error.code);
        }
      },
    },

    profiles: {
      findById: findProfile,

      async findByIds(ids: string[]) {
        const unique = [...new Set(ids.filter(Boolean))];
        if (unique.length === 0) return [];
        const { data, error } = await client
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .in("id", unique);
        if (error) throw fail(error);
        return ((data ?? []) as ProfileRow[]).map(toProfile);
      },

      async findTutor(id: string) {
        const { data, error } = await client
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", id)
          .eq("role", "tutor")
          .maybeSingle();
        if (error) throw fail(error);
        return data ? toProfile(data as ProfileRow) : null;
      },

      async update(id: string, patch: ProfilePatch) {
        const payload: Record<string, unknown> = {};
        if (patch.displayName !== undefined) payload.display_name = patch.displayName;
        if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
        if (patch.accountStatus !== undefined) payload.account_status = patch.accountStatus;
        if (patch.role !== undefined) payload.role = patch.role;

        const { data, error } = await client
          .from("profiles")
          .update(payload)
          .eq("id", id)
          .select(PROFILE_COLUMNS)
          .maybeSingle();
        if (error) throw fail(error);
        if (!data) throw new PortError("not_found", "That account could not be found.");
        return toProfile(data as ProfileRow);
      },

      async listTutors(options): Promise<Page<Profile>> {
        let request = client
          .from("profiles")
          .select(PROFILE_COLUMNS, { count: "exact" })
          .eq("role", "tutor");

        const pattern = searchPattern(options.query ?? "");
        if (pattern) {
          request = request.or(
            `display_name.ilike.%${pattern}%,email.ilike.%${pattern}%`,
          );
        }
        if (options.status === "active" || options.status === "suspended") {
          request = request.eq("account_status", options.status);
        }

        const from = (options.page - 1) * options.pageSize;
        const { data, count, error } = await request
          .order("created_at", { ascending: false })
          .range(from, from + options.pageSize - 1);
        if (error) throw fail(error);

        return toPage(
          ((data ?? []) as ProfileRow[]).map(toProfile),
          count ?? 0,
          options.page,
          options.pageSize,
        );
      },

      async listAdmins(): Promise<Profile[]> {
        const { data, error } = await client
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("role", "admin")
          .order("created_at", { ascending: false });
        if (error) throw fail(error);
        return ((data ?? []) as ProfileRow[]).map(toProfile);
      },

      async listTutorOptions(): Promise<TutorOption[]> {
        const { data, error } = await client
          .from("profiles")
          .select("id,display_name,email")
          .eq("role", "tutor")
          .order("display_name")
          .limit(200);
        if (error) throw fail(error);
        return (data ?? []) as TutorOption[];
      },

      async countByRole(role: Role, status?: AccountStatus) {
        let request = client
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", role);
        if (status) request = request.eq("account_status", status);
        const { count, error } = await request;
        if (error) throw fail(error);
        return count ?? 0;
      },
    },

    notes: {
      async listByOwner(ownerId: string, options: NotePageOptions) {
        let request = client
          .from("notes")
          .select(NOTE_COLUMNS, { count: "exact" })
          .eq("user_id", ownerId);

        const pattern = searchPattern(options.q ?? "");
        if (pattern) request = request.ilike("title", `%${pattern}%`);
        if (options.tag) request = request.contains("tags", [options.tag]);

        const from = (options.page - 1) * options.pageSize;
        const { data, count, error } = await request
          .order("created_at", { ascending: false })
          .range(from, from + options.pageSize - 1);
        if (error) throw fail(error);

        return toPage(
          ((data ?? []) as NoteRow[]).map(toStoredNote),
          count ?? 0,
          options.page,
          options.pageSize,
        );
      },

      async findOwned(id: string, ownerId: string) {
        const { data, error } = await client
          .from("notes")
          .select(NOTE_COLUMNS)
          .eq("id", id)
          .eq("user_id", ownerId)
          .maybeSingle();
        if (error) throw fail(error);
        return data ? toStoredNote(data as NoteRow) : null;
      },

      async findById(id: string) {
        const { data, error } = await client
          .from("notes")
          .select(NOTE_COLUMNS)
          .eq("id", id)
          .maybeSingle();
        if (error) throw fail(error);
        return data ? toStoredNote(data as NoteRow) : null;
      },

      async create(input) {
        const { data, error } = await client
          .from("notes")
          .insert({
            user_id: input.ownerId,
            title: input.title,
            body: input.body,
            tags: input.tags,
          })
          .select(NOTE_COLUMNS)
          .single();
        if (error) throw fail(error);
        return toStoredNote(data as NoteRow);
      },

      async createMany(inputs) {
        if (inputs.length === 0) return 0;
        const { error } = await client.from("notes").insert(
          inputs.map((input) => ({
            user_id: input.ownerId,
            title: input.title,
            body: input.body,
            tags: input.tags,
          })),
        );
        if (error) throw fail(error);
        return inputs.length;
      },

      async update(id, patch) {
        return updateNote(client, id, undefined, patch);
      },

      async updateOwned(id, ownerId, patch) {
        return updateNote(client, id, ownerId, patch);
      },

      async deleteOwned(id, ownerId) {
        const { data, error } = await client
          .from("notes")
          .delete()
          .eq("id", id)
          .eq("user_id", ownerId)
          .select("id")
          .maybeSingle();
        if (error) throw fail(error);
        return Boolean(data);
      },

      async delete(id) {
        const { data, error } = await client
          .from("notes")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw fail(error);
        return Boolean(data);
      },

      async listAll(options) {
        let request = client
          .from("notes")
          .select(NOTE_COLUMNS, { count: "exact" });

        const pattern = searchPattern(options.q ?? "");
        if (pattern) request = request.ilike("title", `%${pattern}%`);
        if (options.tutorId) request = request.eq("user_id", options.tutorId);

        const from = (options.page - 1) * options.pageSize;
        const { data, count, error } = await request
          .order("created_at", { ascending: false })
          .range(from, from + options.pageSize - 1);
        if (error) throw fail(error);

        return toPage(
          ((data ?? []) as NoteRow[]).map(toStoredNote),
          count ?? 0,
          options.page,
          options.pageSize,
        );
      },

      async listByTutor(tutorId, page, pageSize) {
        const from = (page - 1) * pageSize;
        const { data, count, error } = await client
          .from("notes")
          .select(NOTE_COLUMNS, { count: "exact" })
          .eq("user_id", tutorId)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw fail(error);

        return toPage(
          ((data ?? []) as NoteRow[]).map(toStoredNote),
          count ?? 0,
          page,
          pageSize,
        );
      },

      async recent(limit) {
        const { data, error } = await client
          .from("notes")
          .select(NOTE_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw fail(error);
        return ((data ?? []) as NoteRow[]).map(toStoredNote);
      },

      countAll() {
        return countNotes();
      },

      countSince(iso) {
        return countNotes(iso);
      },

      async summaryByOwner(ownerId) {
        const weekAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const [weekResult, tagsResult] = await Promise.all([
          client
            .from("notes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", ownerId)
            .gte("created_at", weekAgo),
          client
            .from("notes")
            .select(NOTE_SUMMARY_COLUMNS)
            .eq("user_id", ownerId)
            .limit(2000),
        ]);

        if (weekResult.error) throw fail(weekResult.error);
        if (tagsResult.error) throw fail(tagsResult.error);
        const thisWeek = weekResult.count ?? 0;
        const tagCount = new Set(
          ((tagsResult.data ?? []) as { tags: string[] | null }[]).flatMap(
            (row) => (Array.isArray(row.tags) ? row.tags : []),
          ),
        ).size;

        return { thisWeek, tagCount };
      },
    },

    settings: {
      async getPublic(): Promise<PlatformSettings> {
        const { data, error } = await client
          .from("platform_settings")
          .select("key,value")
          .in("key", ["allow_public_signup", "platform_notice"]);
        if (error) throw fail(error);
        return toPlatformSettings(
          (data ?? []) as { key: string; value: unknown }[],
        );
      },

      async update(settings, actorId) {
        const { error } = await client.from("platform_settings").upsert(
          [
            {
              key: "allow_public_signup",
              value: settings.allowPublicSignup,
              updated_by: actorId,
            },
            {
              key: "platform_notice",
              value: settings.platformNotice,
              updated_by: actorId,
            },
          ],
          { onConflict: "key" },
        );
        if (error) throw fail(error);
        return settings;
      },
    },

    audit: {
      async append(entry: AuditInput) {
        const { error } = await client.from("audit_logs").insert({
          actor_id: entry.actorId,
          action: entry.action,
          target_type: entry.targetType ?? null,
          target_id: entry.targetId ?? null,
          details: entry.details ?? {},
        });
        if (error) throw fail(error);
      },

      async recent(limit) {
        const { data, error } = await client
          .from("audit_logs")
          .select(AUDIT_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw fail(error);
        return ((data ?? []) as AuditRow[]).map(toAuditLog);
      },

      async list(page, pageSize): Promise<Page<AuditLog>> {
        const from = (page - 1) * pageSize;
        const { data, count, error } = await client
          .from("audit_logs")
          .select(AUDIT_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw fail(error);
        return toPage(
          ((data ?? []) as AuditRow[]).map(toAuditLog),
          count ?? 0,
          page,
          pageSize,
        );
      },
    },

    storage: {
      async uploadAvatar(profileId, file) {
        const extension = AVATAR_EXTENSIONS.get(file.type);
        if (!extension) {
          throw new PortError("conflict", "Use a JPEG, PNG, or WebP image.");
        }
        const path = `${profileId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage
          .from(AVATAR_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          throw new PortError("unknown", "The image could not be uploaded.", error.name);
        }
        const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        return data.publicUrl;
      },

      async removeAvatarByUrl(url) {
        const path = avatarObjectPath(url);
        if (!path) return;
        // Best-effort cleanup: a failed delete must not fail the profile update.
        await client.storage.from(AVATAR_BUCKET).remove([path]);
      },
    },

    accounts: {
      async createUser(input) {
        const admin = createAdminClient();
        if (!admin) {
          throw new PortError(
            "unavailable",
            "Account provisioning isn’t configured yet. The server needs the Supabase service-role key in its environment.",
          );
        }
        const { data, error } = await admin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          app_metadata: { role: input.role },
          user_metadata: { display_name: input.displayName },
        });
        if (error || !data.user) {
          if (error?.message.toLowerCase().includes("already")) {
            throw new PortError("conflict", "An account with that email already exists.");
          }
          throw new PortError("unknown", "The account couldn’t be created. Please try again.");
        }
        return { id: data.user.id };
      },

      async sendReset(email, redirectTo) {
        // Existing behaviour: delivery failures are not surfaced, to avoid
        // revealing whether an address exists.
        await client.auth.resetPasswordForEmail(email, { redirectTo });
      },
    },
  };
}

async function updateNote(
  client: SupabaseClient,
  id: string,
  ownerId: string | undefined,
  patch: { title?: string; body?: JSONContent; tags?: string[] },
): Promise<StoredNote | null> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.body !== undefined) payload.body = patch.body;
  if (patch.tags !== undefined) payload.tags = patch.tags;

  let request = client.from("notes").update(payload).eq("id", id);
  if (ownerId) request = request.eq("user_id", ownerId);

  const { data, error } = await request
    .select(NOTE_COLUMNS)
    .maybeSingle();
  if (error) throw fail(error);
  return data ? toStoredNote(data as NoteRow) : null;
}

function parseBearer(header: string | null): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

/** Request-scoped scope: cookie session by default, bearer token when present. */
export async function createSupabaseScope(
  authorizationHeader: string | null,
): Promise<AppScope> {
  const token = parseBearer(authorizationHeader);
  try {
    const client = token
      ? createTokenClient(token)
      : await createCookieClient();
    return createScope(client, token);
  } catch (error) {
    throw asPortError(error);
  }
}

/** Cookie-free scope for cacheable public reads. */
export function createPublicScope(): AppScope {
  return createScope(createAnonClient());
}
