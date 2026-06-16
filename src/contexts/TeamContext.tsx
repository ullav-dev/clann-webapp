"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { FamilyTree, Team, TeamSummary, TreeAccessRole } from "@/lib/types";
import {
  getMyTeams,
  getTeam,
  createTeam as apiCreateTeam,
  updateTeam as apiUpdateTeam,
  deleteTeam as apiDeleteTeam,
  type CreateTeamPayload,
  type UpdateTeamPayload,
} from "@/lib/teams-api";
import { getMyTreeAccess, listTeamTrees, setTreeTeam } from "@/lib/api";
import { useAuth } from "./AuthContext";

const ACTIVE_TEAM_KEY = "clann_active_team_id";

interface TeamState {
  /** All teams the user belongs to (owner or member). */
  teams: TeamSummary[];
  /** Trees shared with the user via team membership (not owned by the user). */
  teamTrees: FamilyTree[];
  /** The currently selected team workspace (null = Personal). */
  activeTeam: TeamSummary | null;
  /** Switch the active team context (null = Personal). */
  setActiveTeam: (team: TeamSummary | null) => void;
  /** true while the initial teams load is in flight. */
  isLoading: boolean;
  /** Reload teams + team trees from the server. */
  reload: () => Promise<void>;
  /** Create a new team; the calling user becomes owner. */
  createTeam: (payload: CreateTeamPayload) => Promise<Team>;
  /** Update a team's metadata. */
  updateTeam: (id: string, patch: UpdateTeamPayload) => Promise<Team>;
  /** Delete a team. */
  deleteTeam: (id: string) => Promise<void>;
  /** Get full team detail (members etc.). */
  getTeamDetail: (id: string) => Promise<Team>;
  /** Link or unlink one of the user's owned trees from a team. */
  setTreeTeam: (treeName: string, teamId: string | null) => Promise<FamilyTree>;
  /** Returns true if treeName belongs to a team (not owned by the current user). */
  isTeamTree: (treeName: string) => boolean;
  /** Find which team a tree belongs to, if any. */
  treeTeamName: (treeName: string) => string | undefined;
  /** The caller's access role for a shared tree: "owner" | "editor" | "viewer". */
  myTreeRole: (treeName: string) => TreeAccessRole;
  /** Returns true when the caller has editor (or owner) write access to a shared tree. */
  isEditorOf: (treeName: string) => boolean;
}

const TeamContext = createContext<TeamState>({
  teams: [],
  teamTrees: [],
  activeTeam: null,
  setActiveTeam: () => {},
  isLoading: false,
  reload: async () => {},
  createTeam: async () => { throw new Error("TeamProvider not mounted"); },
  updateTeam: async () => { throw new Error("TeamProvider not mounted"); },
  deleteTeam: async () => {},
  getTeamDetail: async () => { throw new Error("TeamProvider not mounted"); },
  setTreeTeam: async () => { throw new Error("TeamProvider not mounted"); },
  isTeamTree: () => false,
  treeTeamName: () => undefined,
  myTreeRole: () => "viewer",
  isEditorOf: () => false,
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamTrees, setTeamTrees] = useState<FamilyTree[]>([]);
  const [activeTeam, setActiveTeamState] = useState<TeamSummary | null>(null);
  // treeName → access role for shared trees
  const [treeRoles, setTreeRoles] = useState<Record<string, TreeAccessRole>>({});
  const [isLoading, setIsLoading] = useState(false);

  const setActiveTeam = useCallback((team: TeamSummary | null) => {
    setActiveTeamState(team);
    try {
      if (team) {
        localStorage.setItem(ACTIVE_TEAM_KEY, team.id);
      } else {
        localStorage.removeItem(ACTIVE_TEAM_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const reload = useCallback(async () => {
    if (!token || !user) return;
    setIsLoading(true);
    try {
      const myTeams = await getMyTeams(token);
      setTeams(myTeams);

      // Restore persisted active team, validating it's still in the teams list.
      try {
        const savedId = localStorage.getItem(ACTIVE_TEAM_KEY);
        if (savedId) {
          const match = myTeams.find((t) => t.id === savedId);
          setActiveTeamState(match ?? null);
          if (!match) localStorage.removeItem(ACTIVE_TEAM_KEY);
        }
      } catch { /* ignore */ }

      // Fetch trees for teams where the user is a member (not the owner).
      const memberTeams = myTeams.filter((t) => t.owner.username !== user.username);
      const treeArrays = await Promise.all(
        memberTeams.map((t) => listTeamTrees(t.id).catch(() => [] as FamilyTree[]))
      );
      const flat = treeArrays.flat();
      setTeamTrees(flat);

      // Fetch per-tree access role for each shared tree.
      const roles = await Promise.all(
        flat.map((t) =>
          getMyTreeAccess(t.name)
            .then((r) => [t.name, r.role] as [string, TreeAccessRole])
            .catch(() => [t.name, "viewer"] as [string, TreeAccessRole])
        )
      );
      setTreeRoles(Object.fromEntries(roles));
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      reload();
    } else {
      setTeams([]);
      setTeamTrees([]);
      setTreeRoles({});
      setActiveTeamState(null);
    }
  }, [token, user, reload]);

  const createTeam = useCallback(
    async (payload: CreateTeamPayload): Promise<Team> => {
      const team = await apiCreateTeam(token!, payload);
      await reload();
      return team;
    },
    [token, reload]
  );

  const updateTeam = useCallback(
    async (id: string, patch: UpdateTeamPayload): Promise<Team> => {
      const team = await apiUpdateTeam(token!, id, patch);
      await reload();
      return team;
    },
    [token, reload]
  );

  const deleteTeam = useCallback(
    async (id: string): Promise<void> => {
      await apiDeleteTeam(token!, id);
      await reload();
    },
    [token, reload]
  );

  const getTeamDetail = useCallback(
    (id: string): Promise<Team> => getTeam(token!, id),
    [token]
  );

  const handleSetTreeTeam = useCallback(
    async (treeName: string, teamId: string | null): Promise<FamilyTree> => {
      const updated = await setTreeTeam(treeName, teamId);
      await reload();
      return updated;
    },
    [reload]
  );

  // A tree is a "team tree" only when it appears in a team's shared trees
  // AND is not owned by the current user (owners can always edit their own trees).
  const isTeamTree = useCallback(
    (treeName: string) =>
      teamTrees.some((t) => t.name === treeName && t.owner !== user?.username),
    [teamTrees, user]
  );

  const treeTeamName = useCallback(
    (treeName: string): string | undefined => {
      const tree = teamTrees.find((t) => t.name === treeName);
      if (!tree?.team_id) return undefined;
      return teams.find((t) => t.id === tree.team_id)?.name;
    },
    [teamTrees, teams]
  );

  const myTreeRole = useCallback(
    (treeName: string): TreeAccessRole => treeRoles[treeName] ?? "viewer",
    [treeRoles]
  );

  const isEditorOf = useCallback(
    (treeName: string): boolean => {
      const role = treeRoles[treeName];
      return role === "editor" || role === "owner";
    },
    [treeRoles]
  );

  return (
    <TeamContext.Provider
      value={{
        teams,
        teamTrees,
        activeTeam,
        setActiveTeam,
        isLoading,
        reload,
        createTeam,
        updateTeam,
        deleteTeam,
        getTeamDetail,
        setTreeTeam: handleSetTreeTeam,
        isTeamTree,
        treeTeamName,
        myTreeRole,
        isEditorOf,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
