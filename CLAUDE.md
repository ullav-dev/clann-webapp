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

The backend (clann-server) must be running on `http://localhost:3000`.

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Flow (`@xyflow/react`)

**API proxy:** `next.config.ts` rewrites `/api/*` → `http://localhost:3000/api/*` so browser fetches never hit CORS. The API client (`src/lib/api.ts`) uses relative paths in the browser and the absolute backend URL server-side.

**Key files:**
- `src/lib/types.ts` — all TypeScript types mirroring the OpenAPI schema
- `src/lib/api.ts` — typed fetch wrappers for every backend endpoint
- `src/components/FamilyTreeView.tsx` — React Flow graph; loaded via `dynamic(..., { ssr: false })` because it needs browser APIs. Currently renders the 2-generation ancestor tree from `GET /api/persons/{id}/family-tree`. Designed to support interactive editing in the future (drag-to-reposition, click to navigate).
- `src/components/PersonForm.tsx` — shared create/edit form
- `src/components/AddRelationshipModal.tsx` — modal for linking Father / Mother / Brother / Sister

**Routes:**
| Route | Description |
|---|---|
| `/` | List all persons |
| `/persons/new` | Create person |
| `/persons/[id]` | Person detail: family tree tab + relationships tab |
| `/persons/[id]/edit` | Edit person |

**ID handling:** The backend stores IDs as `person:<ulid>` (e.g. `person:01jd4a8xyz`). URLs encode the full ID with `encodeURIComponent`. `api.ts` exposes a `rawId()` helper that strips the `person:` prefix before building request paths.

**Backend API base URL:** Set via `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:3000`).
