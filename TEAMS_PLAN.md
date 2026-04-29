# Teams Feature — Implementation Plan

## Context Summary

- `ullav-user-management` already has a full Teams API (CRUD, invitation tokens, member roles). Teams are gated by the `teams:create` permission.
- The JWT contains `subscriptions.clann.tier` (`individual | family | professional | enterprise`) and `permissions[]` — clann-webapp currently stores only `roles`, not these fields.
- `clann-server` has no concept of teams or tree sharing yet. Trees have a single `owner` field. This is the biggest new work.
- The portal's `TeamsPanel.tsx` is admin-only; Clann needs a **user-facing** flow.

---

## Cross-Service Changes Required

| Repo | Change | Notes |
|---|---|---|
| `ullav-user-management` | Include `teams: [{ id, role }]` in JWT payload | So clann-server can verify membership without a network call |
| `ullav-user-management` | Grant `teams:create` to active Family/Professional/Enterprise Clann subscribers | Currently only `admin` has it |
| `clann-server` | Add `team_id` to `family_tree`, new endpoints for team-tree linking, read access for team members | New SurrealQL migrations + handlers |
| `clann-webapp` | All UI, API client additions, subscription decoding | Feature branch here |

---

## Phase 1 — JWT Enrichment (ullav-user-management)

**Why first:** Everything downstream depends on the token carrying subscription tier, permissions, and team memberships.

1. Add `teams: [{ id: UUID, role: "owner"|"leader"|"member" }]` to the JWT claims struct — populated from `team_members` rows with `status = 'active'`
2. Auto-grant `teams:create` permission to any user whose `subscriptions.clann.status` is `active` or `trialing` with tier `family | professional | enterprise` — either at token-issue time or as a DB-driven permission

---

## Phase 2 — clann-server: Team Tree Association

New SurrealQL migration + Rust handlers.

**Schema change:**
```
family_tree.team_id  Option<String>  -- UUID from ullav-user-management teams table
```

**New endpoints:**

| Method | Path | Auth | Notes |
|---|---|---|---|
| `PATCH` | `/api/trees/{name}/team` | Owner only | `{ team_id: string \| null }` — links or unlinks |
| `GET` | `/api/trees?team_id={uuid}` | Active team member (via JWT `teams[]`) | Returns trees linked to that team; clann-server checks `claims.teams.contains(team_id)` |

**Modified endpoint:**
- `GET /api/trees?owner={username}` — unchanged (still returns owned trees only)

**Access rule for team trees:** A person, relationship, or tree read is permitted if `tree.owner == claims.sub` **OR** `tree.team_id ∈ claims.teams[*].id`. Write access remains owner-only for this phase.

---

## Phase 3 — clann-webapp: Foundation

**Feature branch:** `feat/teams`

### 3a. Subscription + Permission Decoding in `AuthContext`

Extend the stored session to include `permissions: string[]` and the decoded `clannSub: { tier, status, isActive }` alongside `roles`. Add `decodeClannSubscription(token)` (port from ullav-portal's `auth-api.ts`).

Helper: `canCreateTeam = clannSub.isActive && ["family","professional","enterprise"].includes(clannSub.tier)`

### 3b. Teams API Client — `src/lib/teams-api.ts`

Typed wrappers calling `/auth-api/teams/*` (proxied through `next.config.ts` — already handled by the existing `/auth-api/*` rewrite):

```typescript
getMyTeams(token): TeamSummary[]
getTeam(token, id): Team
createTeam(token, payload): Team
updateTeam(token, id, patch): Team
deleteTeam(token, id): void
inviteMember(token, teamId, email, appUrl): void
removeMember(token, teamId, userId): void
acceptInvitation(token): void   // called from /auth/team-invite page
```

### Types to Add in `src/lib/types.ts`

```typescript
TeamUserRef        // { id, username, email, first_name, last_name }
TeamMember         // { id, user: TeamUserRef, status, role, invited_at, joined_at }
Team               // { id, name, description, purpose, avatar_url, owner, leader, members[], created_at, updated_at }
TeamSummary        // { id, name, description, avatar_url, owner, leader, member_count, created_at, updated_at }
ClannTier          // "individual" | "family" | "professional" | "enterprise" | null
ClannSubscription  // { tier: ClannTier, status: string | null, isActive: boolean }
```

### 3c. clann-server API Additions in `src/lib/api.ts`

```typescript
linkTreeToTeam(treeName, teamId, token): FamilyTree
unlinkTreeFromTeam(treeName, token): FamilyTree
listTeamTrees(teamId, token): FamilyTree[]
```

---

## Phase 4 — clann-webapp: Team Management UI

**New route:** `/[locale]/team`

Accessible from the nav (new "Team" link, shown only to users who own a team or are a team member).

### Components

| Component | Location | Purpose |
|---|---|---|
| `TeamPage.tsx` | `src/app/[locale]/team/page.tsx` | Root: owner view (full management) or member view (read-only) |
| `CreateTeamModal.tsx` | `src/components/` | Name, description, purpose (markdown editor), avatar (DAM picker). Shown when user has `canCreateTeam` but no team yet |
| `TeamSettingsPanel.tsx` | `src/components/` | Edit name/description/purpose/avatar. Owner only |
| `TeamMemberList.tsx` | `src/components/` | Member cards with role badge (owner/leader/member) + status (active/invited). Remove button for owner |
| `InviteMemberModal.tsx` | `src/components/` | Email input + optional message. Passes `app_url = origin/locale` |
| `LinkedTreesList.tsx` | `src/components/` | Trees currently linked to team. "Link a tree" opens picker of owned trees |
| `LinkTreeModal.tsx` | `src/components/` | Shows owned trees not yet linked; select → call `linkTreeToTeam` |
| `TeamAvatar.tsx` | `src/components/` | Circular avatar with initials fallback |

### Owner View Sections

1. Team header (avatar, name, description) with Edit button
2. Purpose tab (rendered as markdown prose)
3. Members tab (member list + Invite button)
4. Linked Trees tab (linked trees list + Link button + unlink per tree)

### Member View

Read-only — team name, description, and a list of linked trees with a "View" button that selects that tree and navigates to `/family`.

---

## Phase 5 — clann-webapp: Tree Selector Integration

### `TreeContext.tsx` gains:

- `teamTrees: FamilyTree[]` — fetched via `listTeamTrees` for each team the user is a member of (not owner)
- `isTeamTree(treeName): boolean` — helper for read-only enforcement

### `TreeSelector.tsx` — nav dropdown splits into two sections:

```
── My Trees ─────────────────
  ● My Main Tree  (primary)
  + My Second Tree
── Shared with me ───────────
  👥 Smith Family  (Team: "Smith Family")
```

Team trees show a group icon and are labelled with the team name. They cannot be set as primary, deleted, or created from this dropdown. Selecting one sets it as `activeTree` with a `readOnly: true` flag propagated through context.

### Read-Only Enforcement in the UI

When `activeTree.readOnly`, hide:
- "New Person" button
- Edit/Delete on person cards
- "Add Relationship" button
- "Import Tree" option in TreeSelector

Show a subtle banner: _"You are viewing a shared tree — changes are not permitted"_

---

## Phase 6 — Invitation Acceptance Page

**New route:** `/[locale]/auth/team-invite`

Reads `?token=` from the URL, calls `POST /auth-api/teams/invitations/{token}/accept` (user must be logged in — redirect to login if not, then return here). On success, reloads teams and redirects to `/team`.

This is the page linked from the invitation email (`app_url` points here).

---

## Phase 7 — i18n

New namespace `team` in `messages/{en,de,ga}.json` covering all strings for the above components.

---

## Out of Scope for This Branch

- Team members suggesting changes to trees they don't own
- Merging trees across team members
- Multiple teams per user (Professional tier — architecture supports it; UI gates to 1 team for Family)
- Admin panel in Clann (Teams are user-managed; admin access via ullav-portal)

---

## Implementation Order

1. `ullav-user-management`: JWT claims + permission grant (unblocks everything)
2. `clann-server`: migration + team-tree endpoints
3. `clann-webapp` Phase 3 (foundation — no UI, unblocks testing)
4. `clann-webapp` Phase 4 (Team page)
5. `clann-webapp` Phase 5 (TreeSelector integration)
6. `clann-webapp` Phase 6 (invite acceptance page)
7. `clann-webapp` Phase 7 (i18n)

---

## Decisions

1. **JWT teams claim** — mock in clann-webapp UI while ullav-user-management work proceeds in parallel; all work done in same session.
2. **Branch name** — `feat/teams` in all three repos.
3. **`teams:create` permission** — granted at token-issue time in ullav-user-management (clean approach); frontend checks tier for UX, backend enforces permission.
4. **1-team limit** — frontend-only for Family tier.
