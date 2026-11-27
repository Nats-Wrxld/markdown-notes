import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { readJson } from "@/lib/api/request";
import { adminSettingsSchema } from "@/lib/contracts/admin";
import {
  getAdminSettings,
  updatePlatformSettings,
} from "@/lib/domain/settings";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context }) =>
    ok(await getAdminSettings(requireContext(context))),
  );
}

export async function PUT(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const settings = await readJson(req, adminSettingsSchema);
    return ok(
      await updatePlatformSettings(requireContext(context), settings),
    );
  });
}
