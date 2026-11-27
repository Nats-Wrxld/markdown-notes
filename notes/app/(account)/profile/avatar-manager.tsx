"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import { removeAvatar, uploadAvatar } from "@/lib/api-client/profile";
import { AVATAR_MAX_BYTES } from "@/lib/validation";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type AvatarProfile = {
  display_name: string;
  email: string;
  avatar_url: string | null;
};

export default function AvatarManager({ profile }: { profile: AvatarProfile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setMessage({ tone: "error", text: "Use a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setMessage({ tone: "error", text: "Image must be 2 MB or smaller." });
      return;
    }
    setPreview(URL.createObjectURL(file));
    setMessage(null);

    const formData = new FormData();
    formData.set("avatar", file);
    startTransition(async () => {
      const result = await uploadAvatar({}, formData);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      if (result.success) {
        setMessage({ tone: "success", text: result.success });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Upload failed." });
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      setPreview(null);
      if (result.success) {
        setMessage({ tone: "success", text: result.success });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Remove failed." });
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      {preview ? (
        <span
          role="img"
          aria-label="New photo preview"
          className="block size-24 shrink-0 rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${preview})` }}
        />
      ) : (
        <Avatar profile={profile} size={96} />
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <label className="ui-button ui-button-secondary cursor-pointer">
            {isPending ? "Working…" : profile.avatar_url ? "Replace photo" : "Upload photo"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={handleFileChange}
              disabled={isPending}
              className="sr-only"
            />
          </label>
          {profile.avatar_url && !preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="ui-button ui-button-ghost"
            >
              Remove
            </button>
          )}
        </div>
        <p className="ui-text-muted mt-2 text-xs">
          JPEG, PNG, or WebP, up to 2 MB.
        </p>
        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`mt-2 text-xs font-medium ${
              message.tone === "error" ? "ui-text-error" : "ui-text-success"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}