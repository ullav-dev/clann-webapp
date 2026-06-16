"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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

// Extracts the DAM asset UUID from any URL format the services use:
// - http://localhost:3003/dam-api/assets/{UUID}/download  (portal proxy)
// - /api/dam/assets/{UUID}/thumbnail                      (clann-webapp proxy)
function extractAssetId(url: string): string | null {
  const m = url.match(/\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

export default function TeamAvatar({ team, size = "md" }: Props) {
  const { token } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const assetId = team.avatar_url ? extractAssetId(team.avatar_url) : null;

  useEffect(() => {
    if (!assetId || !token) {
      setSrc(null);
      return;
    }
    setSrc(null);
    setFailed(false);
    let objectUrl: string | null = null;
    fetch(`/api/dam/assets/${assetId}/thumbnail`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId, token]);

  const initials = team.name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (assetId && src && !failed) {
    return (
      <img
        src={src}
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
