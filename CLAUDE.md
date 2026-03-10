# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3001
npm run build    # Production build
npm run start    # Start production server on port 3001
npm run lint     # Lint
```

> `next` must be invoked via `node node_modules/next/dist/bin/next` (the `.bin/next` shim is broken with Node v25). The scripts in `package.json` already handle this.

The backend (clann-server) must be running on `http://localhost:3000`. After rebuilding the backend, always restart the running process — the old binary continues serving until killed.

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Flow (`@xyflow/react`) · `html-to-image`

**API proxy:** `next.config.ts` rewrites `/api/*` → `http://localhost:3000/api/*` so browser fetches never hit CORS. The API client (`src/lib/api.ts`) uses relative paths in the browser and the absolute backend URL server-side.

**Key files:**
- `src/lib/types.ts` — all TypeScript types mirroring the OpenAPI schema
- `src/lib/api.ts` — typed fetch wrappers for every backend endpoint
- `src/components/FamilyTreeView.tsx` — React Flow graph; loaded via `dynamic(..., { ssr: false })`. Shows 2-generation ancestors, direct children, and spouses for the root person. Supports vertical/horizontal orientation toggle and JPEG/JSON export.
- `src/components/PersonForm.tsx` — shared create/edit form
- `src/components/AddRelationshipModal.tsx` — modal for linking Father / Mother / Sibling / Spouse. When adding a sibling, automatically inherits the root person's parents.
- `src/components/PersonCard.tsx` — card used on the list page; includes inline delete
- `src/components/PersonAvatar.tsx` — circular photo with emoji fallback
- `src/components/ImageUpload.tsx` — drag-and-drop image uploader (JPEG/PNG ≤ 3 MB)

**Routes:**
| Route | Description |
|---|---|
| `/` | List all persons with search |
| `/persons/new` | Create person |
| `/persons/[id]` | Person detail: family tree tab + relationships tab |
| `/persons/[id]/edit` | Edit person |

**ID handling:** The backend stores IDs as `person:<ulid>` (e.g. `person:01jd4a8xyz`). URLs use just the ULID (no prefix, no encoding). `api.ts` exposes a `rawId()` helper that strips the `person:` prefix before building request paths.

**Backend API base URL:** Set via `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:3000`).

## Family Tree graph

`FamilyTreeView` uses React Flow with a custom `PersonNode` type. Key design decisions:

- **Node roles & colours:** `root` (emerald) · `father` (blue) · `mother` (rose) · `child` (amber) · `spouse` (violet). Defined in `ROLE_STYLES` — one source of truth for borders, backgrounds, handle colours, and minimap dots.
- **Four explicit handles per node** with IDs `main-s` / `main-t` (ancestor↔child axis) and `sp-s` / `sp-t` (perpendicular spouse axis). All edges must specify `sourceHandle` / `targetHandle`.
- **Orientation:** vertical (ancestors up, children down, spouses right) or horizontal (ancestors right, children left, spouses below).
- **Node `width: 148, height: 120`** must be set on each node object so the MiniMap can render them before DOM measurement.
- `nodeTypes` is defined outside the component to avoid React Flow re-renders.

## Relationship types

| UI label | Backend table | Notes |
|---|---|---|
| Father | `has_father` | child → father |
| Mother | `has_mother` | child → mother |
| Sibling | `has_sibling` | one direction; queried bidirectionally |
| Spouse | `has_spouse` | added **bidirectionally** (A→B and B→A); deleted with `OR` clause covering both directions |
