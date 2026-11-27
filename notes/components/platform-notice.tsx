import { serverApi } from "@/lib/api-client/server";

export default async function PlatformNotice() {
  const settings = await serverApi.settings.public();
  if (!settings.platformNotice.trim()) return null;

  return (
    <p role="status" className="ui-alert ui-alert-info rounded-xl border px-4 py-3 text-sm">
      {settings.platformNotice}
    </p>
  );
}