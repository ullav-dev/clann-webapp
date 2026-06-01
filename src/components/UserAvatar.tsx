"use client";

import { useState } from "react";
import type { AuthUser } from "@/lib/auth-api";

export function userDisplayName(u: AuthUser): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return full || u.username;
}

const SIZE: Record<string, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-6 h-6 text-[10px]",
};

interface Props {
  user: AuthUser;
  size?: keyof typeof SIZE;
  className?: string;
}

export default function UserAvatar({ user, size = "sm", className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const label = userDisplayName(user);
  const initials = (
    `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`
  ).toUpperCase() || user.username.charAt(0).toUpperCase();
  const dim = SIZE[size] ?? SIZE.sm;

  if (user.avatar_url && !broken) {
    return (
      <img
        src={user.avatar_url}
        alt={label}
        title={label}
        className={`${dim} rounded-full object-cover shrink-0 ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      title={label}
      className={`${dim} rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center select-none shrink-0 ${className}`}
    >
      {initials}
    </span>
  );
}
