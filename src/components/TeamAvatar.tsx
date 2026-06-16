"use client";

import { useState } from "react";
import type { TeamSummary, Team } from "@/lib/types";

interface Props {
  team: Pick<Team | TeamSummary, "name" | "avatar_url">;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
};

export default function TeamAvatar({ team, size = "md" }: Props) {
  const [imgError, setImgError] = useState(false);

  const initials = team.name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const showInitials =
    <div
      className={`${SIZE[size]} rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center shrink-0 select-none`}
    >
      {initials || "T"}
    </div>;

  if (team.avatar_url && !imgError) {
    return (
      <img
        src={team.avatar_url}
        alt={team.name}
        className={`${SIZE[size]} rounded-full object-cover shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  return showInitials;
}
