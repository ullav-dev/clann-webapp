"use client";

import type { TeamSummary, Team } from "@/lib/types";

interface Props {
  team: Pick<Team | TeamSummary, "name" | "avatar_url">;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
};

export default function TeamAvatar({ team, size = "md" }: Props) {
  const initials = team.name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (team.avatar_url) {
    return (
      <img
        src={team.avatar_url}
        alt={team.name}
        className={`${SIZE[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${SIZE[size]} rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center shrink-0 select-none`}
    >
      {initials || "T"}
    </div>
  );
}
