import "server-only";

import type { AppContext } from "@/lib/ports";
import type {
  AuditEntry,
  Page,
  Profile,
  TutorOption,
} from "@/lib/types";
import type { AccountStatus, Role } from "@/lib/contracts/common";
import { requireOwner, requireStaff } from "@/lib/api/policies";
import { AppError, fromPortError } from "./errors";
import { audit } from "./audit";

export const ADMIN_PAGE_SIZE = 20;

async function resolveTarget(
  context: AppContext,
  targetId: string,
): Promise<Profile> {
  const target = await context.scope.profiles.findById(targetId);
  if (!target) {
    throw new AppError("not_found", "That account could not be found.");
  }
  if (target.role === "owner") {
    throw new AppError("forbidden", "The owner account can’t be modified.");
  }
  if (target.id === context.profile.id) {
    throw new AppError("forbidden", "You can’t modify your own account here.");
  }
  if (context.profile.role === "admin" && target.role !== "tutor") {
    throw new AppError(
      "forbidden",
      "Administrators can only manage tutor accounts.",
    );
  }
  return target;
}

export async function listTutors(
  context: AppContext,
  options: { page: number; pageSize: number; q?: string; status?: string },
): Promise<Page<Profile>> {
  requireStaff(context);
  try {
    return await context.scope.profiles.listTutors({
      page: options.page,
      pageSize: options.pageSize,
      query: options.q,
      status: options.status,
    });
  } catch (error) {
    throw fromPortError(error as never, "Tutors could not be loaded.");
  }
}

export async function getTutor(
  context: AppContext,
  id: string,
): Promise<Profile> {
  requireStaff(context);
  const tutor = await context.scope.profiles.findTutor(id);
  if (!tutor) {
    throw new AppError("not_found", "That account could not be found.");
  }
  return tutor;
}

export async function setTutorStatus(
  context: AppContext,
  targetId: string,
  status: AccountStatus,
): Promise<Profile> {
  requireStaff(context);
  const target = await resolveTarget(context, targetId);

  try {
    const updated = await context.scope.profiles.update(target.id, {
      accountStatus: status,
    });
    await audit(context, {
      action: status === "suspended" ? "account.suspended" : "account.reactivated",
      targetType: "profile",
      targetId: target.id,
      details: { role: target.role },
    });
    return updated;
  } catch (error) {
    throw fromPortError(error as never, "The account status couldn’t be updated. Please try again.");
  }
}

export async function renameTutor(
  context: AppContext,
  targetId: string,
  displayName: string,
): Promise<Profile> {
  requireStaff(context);
  const target = await resolveTarget(context, targetId);

  try {
    const updated = await context.scope.profiles.update(target.id, {
      displayName,
    });
    await audit(context, {
      action: "account.renamed",
      targetType: "profile",
      targetId: target.id,
    });
    return updated;
  } catch (error) {
    throw fromPortError(error as never, "The name couldn’t be updated. Please try again.");
  }
}

export async function createAccount(
  context: AppContext,
  input: {
    displayName: string;
    email: string;
    password: string;
    role: "admin" | "tutor";
  },
): Promise<{ id: string }> {
  requireStaff(context);

  if (context.profile.role !== "owner" && input.role !== "tutor") {
    throw new AppError(
      "forbidden",
      "Administrators can only create tutor accounts.",
    );
  }

  try {
    const created = await context.scope.accounts.createUser(input);
    await audit(context, {
      action: "account.created",
      targetType: "profile",
      targetId: created.id,
      details: { role: input.role },
    });
    return created;
  } catch (error) {
    throw fromPortError(error as never, "The account couldn’t be created. Please try again.");
  }
}

export async function sendResetLink(
  context: AppContext,
  targetId: string,
  origin: string,
): Promise<string> {
  requireStaff(context);
  const target = await resolveTarget(context, targetId);

  try {
    await context.scope.accounts.sendReset(
      target.email,
      `${origin}/auth/confirm?next=/reset-password`,
    );
  } catch (error) {
    throw fromPortError(error as never, "The reset link couldn’t be sent. Please try again.");
  }

  await audit(context, {
    action: "account.reset_requested",
    targetType: "profile",
    targetId: target.id,
  });
  return target.email;
}

export async function listAdmins(context: AppContext): Promise<Profile[]> {
  requireOwner(context);
  try {
    return await context.scope.profiles.listAdmins();
  } catch (error) {
    throw fromPortError(error as never, "Administrators could not be loaded.");
  }
}

export async function updateAccountRole(
  context: AppContext,
  targetId: string,
  role: Exclude<Role, "owner">,
): Promise<Profile> {
  requireOwner(context);

  const target = await context.scope.profiles.findById(targetId);
  if (!target) {
    throw new AppError("not_found", "That account could not be found.");
  }
  if (target.role === "owner") {
    throw new AppError("forbidden", "The owner account can’t be modified.");
  }
  if (target.id === context.profile.id) {
    throw new AppError("forbidden", "You can’t change your own role.");
  }

  try {
    const updated = await context.scope.profiles.update(target.id, { role });
    await audit(context, {
      action: "account.role_changed",
      targetType: "profile",
      targetId: target.id,
      details: { from: target.role, to: role },
    });
    return updated;
  } catch (error) {
    throw fromPortError(error as never, "The role couldn’t be updated. Please try again.");
  }
}

export async function listActivity(
  context: AppContext,
  page: number,
  pageSize: number,
): Promise<Page<AuditEntry>> {
  requireStaff(context);

  try {
    const result = await context.scope.audit.list(page, pageSize);
    const actors = await context.scope.profiles.findByIds(
      result.rows
        .map((entry) => entry.actor_id)
        .filter((id): id is string => Boolean(id)),
    );
    const byId = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      ...result,
      rows: result.rows.map((entry) => {
        const actor = entry.actor_id ? byId.get(entry.actor_id) : undefined;
        return {
          ...entry,
          actor: actor
            ? {
                id: actor.id,
                display_name: actor.display_name,
                email: actor.email,
              }
            : null,
        };
      }),
    };
  } catch (error) {
    throw fromPortError(error as never, "Activity could not be loaded.");
  }
}

export async function listTutorOptions(
  context: AppContext,
): Promise<TutorOption[]> {
  requireStaff(context);
  try {
    return await context.scope.profiles.listTutorOptions();
  } catch (error) {
    throw fromPortError(error as never, "Tutors could not be loaded.");
  }
}
