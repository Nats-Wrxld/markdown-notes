import type {
  AdminNote,
  AdminStats,
  AuditEntry,
  DashboardNote,
  Profile,
  TutorOption,
} from "@/lib/types";
import type { ProfileDto } from "@/lib/contracts/profile";
import type { NoteDto } from "@/lib/contracts/note";

export function toProfileDto(profile: Profile): ProfileDto {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    accountStatus: profile.account_status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function toNoteDto(note: DashboardNote): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function toAdminNoteDto(note: AdminNote) {
  return {
    ...toNoteDto(note),
    owner: {
      id: note.owner.id,
      displayName: note.owner.display_name,
      email: note.owner.email,
      avatarUrl: note.owner.avatar_url,
    },
  };
}

export function toAuditEntryDto(entry: AuditEntry) {
  return {
    id: entry.id,
    action: entry.action,
    targetType: entry.target_type,
    targetId: entry.target_id,
    details: entry.details,
    createdAt: entry.created_at,
    actor: entry.actor
      ? {
          id: entry.actor.id,
          displayName: entry.actor.display_name,
          email: entry.actor.email,
        }
      : null,
  };
}

export function toTutorOptionDto(option: TutorOption) {
  return {
    id: option.id,
    displayName: option.display_name,
    email: option.email,
  };
}

export function toAdminStatsDto(stats: AdminStats) {
  return {
    tutorTotal: stats.tutorTotal,
    tutorActive: stats.tutorActive,
    tutorSuspended: stats.tutorSuspended,
    adminTotal: stats.adminTotal,
    noteTotal: stats.noteTotal,
    notesThisWeek: stats.notesThisWeek,
    recentNotes: stats.recentNotes.map(toAdminNoteDto),
    recentActivity: stats.recentActivity.map(toAuditEntryDto),
  };
}
