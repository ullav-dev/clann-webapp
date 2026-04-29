// Typed wrappers for the Teams endpoints on ullav-user-management.
// All requests go via the existing /auth-api/* Next.js rewrite (no CORS).

import type { Team, TeamSummary } from "./types";

const BASE =
  typeof window === "undefined"
    ? (process.env.AUTH_URL ?? "http://localhost:8081")
    : "/auth-api";

async function teamsRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    ...init,
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return undefined as T;
  }
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
  return data as T;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  purpose?: string;
  avatar_url?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
  purpose?: string;
  avatar_url?: string;
}

export const getMyTeams = (token: string): Promise<TeamSummary[]> =>
  teamsRequest("/teams", token);

export const getTeam = (token: string, id: string): Promise<Team> =>
  teamsRequest(`/teams/${id}`, token);

export const createTeam = (
  token: string,
  payload: CreateTeamPayload
): Promise<Team> =>
  teamsRequest("/teams", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTeam = (
  token: string,
  id: string,
  patch: UpdateTeamPayload
): Promise<Team> =>
  teamsRequest(`/teams/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deleteTeam = (token: string, id: string): Promise<void> =>
  teamsRequest(`/teams/${id}`, token, { method: "DELETE" });

export const inviteMember = (
  token: string,
  teamId: string,
  email: string,
  appUrl?: string
): Promise<void> =>
  teamsRequest(`/teams/${teamId}/invitations`, token, {
    method: "POST",
    body: JSON.stringify({ email, ...(appUrl ? { app_url: appUrl } : {}) }),
  });

export const removeMember = (
  token: string,
  teamId: string,
  userId: string
): Promise<void> =>
  teamsRequest(`/teams/${teamId}/members/${userId}`, token, {
    method: "DELETE",
  });

export const acceptInvitation = (
  token: string,
  inviteToken: string
): Promise<void> =>
  teamsRequest(`/teams/invitations/${inviteToken}/accept`, token, {
    method: "POST",
  });

export const declineInvitation = (
  token: string,
  inviteToken: string
): Promise<void> =>
  teamsRequest(`/teams/invitations/${inviteToken}/decline`, token, {
    method: "POST",
  });
