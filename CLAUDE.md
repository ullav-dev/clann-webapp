# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 3001 (webpack; --webpack flag avoids Turbopack crashes on Node v25)
npm run build      # Production build
npm run start      # Start production server on port 3001
npm run lint       # Lint
npm test           # Run tests (vitest)
npm run test:watch # Run tests in watch mode
```

> `next` must be invoked via `node node_modules/next/dist/bin/next` (the `.bin/next` shim is broken with Node v25). The scripts in `package.json` already handle this.

The backend (clann-server) must be running on `http://localhost:3000`. After rebuilding the backend, always restart the running process — the old binary continues serving until killed.

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Flow (`@xyflow/react`) · `html-to-image` · next-intl v4

**API proxy:** `next.config.ts` rewrites `/api/*` → `http://localhost:3000/api/*` so browser fetches never hit CORS. The API client (`src/lib/api.ts`) uses relative paths in the browser and the absolute backend URL server-side.

**Key files:**
- `src/lib/types.ts` — all TypeScript types mirroring the OpenAPI schema
- `src/lib/api.ts` — typed fetch wrappers for every backend endpoint
- `src/lib/persons.ts` — pure utility functions (`sortPersons`, `filterPersons`, `totalPages`, `pageSlice`) extracted for testability
- `src/hooks/useApi.ts` — binds all API calls with `created_by=username` so the backend ownership filter is always applied
- `src/components/FamilyTreeView.tsx` — React Flow graph; loaded via `dynamic(..., { ssr: false })`. Shows 2-generation ancestors, direct children, and spouses for the root person. Supports vertical/horizontal orientation toggle and JPEG/JSON export.
- `src/components/PersonForm.tsx` — shared create/edit form; fields: name, sex, birth/death, identity (nickname/username/email/verified), biography (textarea, max 1000 chars)
- `src/components/AddRelationshipModal.tsx` — modal for linking Father / Mother / Sibling / Spouse. When adding a sibling, automatically inherits the root person's parents.
- `src/components/PersonCard.tsx` — card used on the list page; includes inline delete
- `src/components/PersonAvatar.tsx` — circular photo with emoji fallback
- `src/components/ImageUpload.tsx` — drag-and-drop image uploader (JPEG/PNG ≤ 3 MB)
- `src/components/PasswordInput.tsx` — password field with show/hide toggle (eye icon button); used on all password inputs in the app
- `src/components/LocaleSwitcher.tsx` — language selector dropdown in the nav
- `src/components/TreeSelector.tsx` — dropdown in the nav for selecting, creating, deleting, and setting the primary family tree; also opens `ImportTreeModal`
- `src/components/ImportTreeModal.tsx` — 3-step modal (upload → name/preview → progress → done) for importing a tree from a Clann JSON export
- `src/contexts/TreeContext.tsx` — holds the list of trees, the active tree, and tree CRUD actions; persists active selection in localStorage (`clann_active_tree`)
- `src/lib/tree-import.ts` — pure parser for the Clann JSON export format; deduplicates persons and relationships

**Auth proxy:** `next.config.ts` also rewrites `/auth-api/*` → `http://localhost:8081/*` for the ullav-user-management service. Auth state is managed by `src/contexts/AuthContext.tsx` (localStorage key `clann_auth`, JWT Bearer token).

**Email flows:** The auth service sends transactional emails when SMTP is configured (`SMTP_HOST` in its `.env`). The webapp passes an `app_url` parameter in each relevant API call so the auth service constructs locale-aware links without needing `APP_BASE_URL` in its own config.
- **Email verification:** registration triggers a confirmation email; `app_url` is set to `{origin}/{locale}` (the auth service appends its own path); user clicks link → `POST /auth/confirm-email`
- **Password reset:** forgot-password form → `POST /auth/password-reset/request` with `app_url` set to `{origin}/{locale}` → reset email sent; user clicks link → `POST /auth/password-reset/confirm`

Both pages use `useSearchParams()` inside a `<Suspense>` boundary (required by Next.js App Router to avoid "Missing html and body tags" errors).

**Routes:** All routes are locale-prefixed (e.g. `/en/family`, `/de/family`). The middleware in `src/middleware.ts` detects the locale from the `Accept-Language` header and redirects bare paths.

| Route | Description |
|---|---|
| `/[locale]` | Landing page (hero + feature cards) |
| `/[locale]/help` | In-app documentation (getting started, people, relationships, family tree, family list) |
| `/[locale]/login` | Sign in / create account / forgot password |
| `/[locale]/auth/confirm-email` | Handles email verification link clicks (`?token=`); activates account |
| `/[locale]/auth/password-reset` | Handles password reset link clicks (`?token=`); new-password form |
| `/[locale]/family` | List all persons — card/list toggle, sort, search, **pagination** |
| `/[locale]/persons/new` | Create person |
| `/[locale]/persons/[id]` | Person detail: family tree tab + relationships tab |
| `/[locale]/persons/[id]/edit` | Edit person |

**ID handling:** The backend stores IDs as `person:<ulid>` (e.g. `person:01jd4a8xyz`). URLs use just the ULID (no prefix, no encoding). `api.ts` exposes a `rawId()` helper that strips the `person:` prefix before building request paths. **Always use `rawId(person.id)` when constructing links or `router.push` calls** — never `encodeURIComponent(person.id)`, which embeds the prefix in the URL and causes 404s.

**Backend API base URL:** Set via `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:3000`).

## Multiple family trees

Each user can own multiple family trees. One tree per user is designated **primary** (the default on first login).

**Context:** `TreeContext` / `useTree()` provides:
- `trees` — all trees owned by the current user
- `activeTree` — the currently selected tree (persisted in `localStorage` under `clann_active_tree`)
- `createTree(name, displayName)` — first tree created is automatically primary
- `deleteTree(name)` — falls back to primary/first remaining tree
- `setPrimaryTree(name)` — calls `PATCH /api/trees/{name}/set-primary`; updates `is_primary` in the local list

**API endpoints:**
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/trees?owner=<username>` | List trees for a user |
| `POST` | `/api/trees` | Create; pass `is_primary: true` to make it primary (clears others) |
| `GET` | `/api/trees/{name}` | Get a single tree |
| `DELETE` | `/api/trees/{name}` | Cascade-deletes all persons and relationships |
| `PATCH` | `/api/trees/{name}/set-primary` | Promote a tree to primary (clears others for same owner) |

**Scoping:** `useApi.listPersons` and `useApi.createPerson` automatically inject `tree=activeTree.name`. Always use `useApi` rather than calling `api.*` directly when tree-scoping is needed.

**JSON export format:** The exported file includes `tree_name`, `tree_display_name`, `exported_at`, and `root` (the full `FamilyTreeNode`). Related persons are serialized as slim nodes — `father`/`mother`/`spouse` as `{id, first_name, family_name}` and `siblings` as `{id, first_name, family_name, sibling_type}`. Children are serialized recursively with the same slim rules applied to their sub-relationships.

**Import:** `ImportTreeModal` reads the exported JSON via `parseTreeExport` (in `src/lib/tree-import.ts`), creates a new tree, imports persons sequentially (building an `originalId → newId` map), then adds relationships using the mapped IDs. `sibling_type` is taken directly from the export; if absent it falls back to derivation from the sibling's `sex`.

## i18n

**Library:** next-intl v4. Supported locales: `en` (default), `de`, `ga`. Defined in `src/i18n/routing.ts`.

- Translation files live in `messages/{locale}.json`, organised by namespace (`nav`, `family`, `personDetail`, `personForm`, `addRelationship`, `imageUpload`, `familyTree`, etc.)
- Server components use `await getTranslations("namespace")` (from `next-intl/server`)
- Client components use `useTranslations("namespace")` (React hook)
- Do **not** use `t.rich(...)` with `{placeholder}` syntax — use separate keys or XML-style tags (`<b>text</b>`) instead. The `{br}` self-closing placeholder is not supported; split into two keys and insert `<br />` manually.
- The `LocaleSwitcher` component replaces the locale segment in the current pathname and calls `router.push`.
- **JSON string safety:** never use unescaped ASCII `"` (U+0022) inside translation string values — use `'single quotes'` or `\"escaped\"` instead. Typographic opening quotes like `„` (U+201E) are fine but their matching closing quote must not be a plain `"` or the JSON parser will terminate the string early.

## Family Members page

`/family` (card/list/pagination):
- **Card view** (default): responsive grid of `PersonCard` components
- **List view**: sortable table (family name, date of birth, place of birth); empty values sort last
- **Pagination**: default 10 per page; page size selector (5/10/15/20/25/30); page resets to 1 on search, sort, or page-size change; ellipsised page number buttons

## Family Tree graph

`FamilyTreeView` uses React Flow with a custom `PersonNode` type. Key design decisions:

- **Node roles & colours:** `root` (emerald) · `father` (blue) · `mother` (rose) · `child` (amber) · `spouse` (violet). Defined in `ROLE_STYLES` — one source of truth for borders, backgrounds, handle colours, and minimap dots.
- **Four explicit handles per node** with IDs `main-s` / `main-t` (ancestor↔child axis) and `sp-s` / `sp-t` (perpendicular spouse axis). All edges must specify `sourceHandle` / `targetHandle`.
- **Orientation:** vertical (ancestors up, children down, spouses right) or horizontal (ancestors right, children left, spouses below).
- **Node `width: 148, height: 120`** must be set on each node object so the MiniMap can render them before DOM measurement.
- `nodeTypes` is defined outside the component to avoid React Flow re-renders.
- **Hover tooltip:** each node shows a dark tooltip above it on hover with `date_of_birth`, `place_of_birth`, and `biography` (biography capped at 4 lines). Only rendered when at least one field is non-null.

## Tests

**Framework:** Vitest (`vitest.config.ts`). Tests live alongside source files as `*.test.ts`.

| Test file | What it covers |
|---|---|
| `src/lib/persons.test.ts` | `sortPersons` (asc/desc, null-last, immutability), `filterPersons`, `totalPages`, `pageSlice` |
| `src/lib/api.test.ts` | `rawId` |
| `src/components/PersonCard.test.ts` | `fullName`, `personIcon` |

## Relationship types

| UI label | Backend table | Notes |
|---|---|---|
| Father | `has_father` | child → father |
| Mother | `has_mother` | child → mother |
| Sibling | `has_sibling` | one direction; queried bidirectionally |
| Spouse | `has_spouse` | added **bidirectionally** (A→B and B→A); deleted with `OR` clause covering both directions; edge carries `spouse_from` / `spouse_to` date strings |

**Spouse dates:** The `has_spouse` edge stores optional `spouse_from` and `spouse_to` strings (free-form, e.g. `"1990"` or `"2 June 2001"`). `GET /api/persons/{id}/relationships` returns spouses as `SpouseInfo` (a `Person` with `spouse_from`/`spouse_to` added). Dates are set at creation time via `AddRelationshipRequest` and updated afterwards via `PATCH /api/persons/{id}/spouse-dates/{related_id}` — this updates both edge directions atomically.
