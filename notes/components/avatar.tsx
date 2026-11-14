import Image from "next/image";

type AvatarProfile = {
  display_name: string;
  email: string;
  avatar_url: string | null;
};

export default function Avatar({
  profile,
  size = 40,
}: {
  profile: AvatarProfile;
  size?: number;
}) {
  const initial = (profile.display_name || profile.email || "U")
    .charAt(0)
    .toUpperCase();

  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="ui-surface-selected flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}