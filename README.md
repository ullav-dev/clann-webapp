# Clann – Family Tree Web App

A responsive family tree management application built with Next.js, backed by [clann-server](https://github.com/colinmanning/clann-server) (Rust · Axum · SurrealDB).

## Features

- **Person management** — create, edit, delete people with name, sex, birth/death dates and places
- **Photo upload** — JPEG/PNG photos (≤ 3 MB) shown on cards, detail pages, and in the family tree graph
- **Relationships** — link people as Father, Mother, Sibling (Brother/Sister), or Spouse. Adding a sibling automatically inherits the root person's parents. Spouse relationships carry optional **from** and **to** dates, editable inline in the Relationships tab.
- **Interactive family tree graph** — powered by React Flow
  - 2-generation ancestor view plus direct children and spouses for the root person
  - Colour-coded by role: emerald (you) · blue (paternal) · rose (maternal) · amber (children) · violet (spouse)
  - Toggle between **vertical** (ancestors up) and **horizontal** (ancestors right) layout
  - Pan, zoom, and minimap navigation
  - Click any node to navigate to that person's profile
- **Export** — download the tree as a **JPEG image** or **JSON file**
- **Family Members list** — card or list view with sort (family name, date of birth, place of birth), name search, and **pagination** (5–30 per page, default 10)
- **Authentication** — login, registration, and password reset via ullav-user-management; family data is gated behind login

## Prerequisites

- Node.js ≥ 18 (tested on v25; see note below)
- [clann-server](https://github.com/colinmanning/clann-server) running on `http://localhost:3000`
- [ullav-user-management](https://github.com/colinmanning/ullav-user-management) running on `http://localhost:8081` (auth service)

## Setup

```bash
# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Start the development server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

> **Node v25 note:** the `.bin/next` symlink is broken on Node v25. The npm scripts already work around this by invoking `node node_modules/next/dist/bin/next` directly.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Graph | React Flow (`@xyflow/react`) |
| Image export | `html-to-image` |
| Backend | clann-server (Rust · Axum · SurrealDB) |
| Auth | ullav-user-management (Rust · Actix-web · PostgreSQL) |

## Project structure

```
src/
  app/
    page.tsx                  # Landing page
    login/page.tsx            # Sign in / register / password reset
    family/page.tsx           # Person list (card/list, sort, search, pagination)
    persons/
      new/page.tsx            # Create person
      [id]/
        page.tsx              # Person detail (tree + relationships tabs)
        edit/page.tsx         # Edit person
  components/
    FamilyTreeView.tsx        # React Flow graph (SSR-disabled)
    PersonForm.tsx            # Shared create/edit form
    AddRelationshipModal.tsx  # Link relationships
    PersonCard.tsx            # Card on list page
    PersonAvatar.tsx          # Circular photo with fallback emoji
    ImageUpload.tsx           # Drag-and-drop uploader
    Nav.tsx                   # Top navigation bar
  contexts/
    AuthContext.tsx           # JWT auth state (localStorage)
  lib/
    types.ts                  # TypeScript types (mirrors OpenAPI schema)
    api.ts                    # Typed fetch wrappers
    auth-api.ts               # Auth service fetch wrappers
    persons.ts                # Pure sort/filter/pagination helpers (tested)
```

## Testing

Tests use [Vitest](https://vitest.dev/) and cover the pure utility functions.

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

| Test file | Coverage |
|---|---|
| `src/lib/persons.test.ts` | Sort, filter, and pagination helpers |
| `src/lib/api.test.ts` | `rawId` helper |
| `src/components/PersonCard.test.ts` | `fullName`, `personIcon` helpers |

## API

All requests go through the Next.js rewrite proxy (`/api/*` → `http://localhost:3000/api/*`), so there are no CORS issues. The backend base URL is configured via `NEXT_PUBLIC_API_URL` in `.env.local`.
