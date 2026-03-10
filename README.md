# Clann – Family Tree Web App

A responsive family tree management application built with Next.js, backed by [clann-server](https://github.com/colinmanning/clann-server) (Rust · Axum · SurrealDB).

## Features

- **Person management** — create, edit, delete people with name, sex, birth/death dates and places
- **Photo upload** — JPEG/PNG photos (≤ 3 MB) shown on cards, detail pages, and in the family tree graph
- **Relationships** — link people as Father, Mother, Sibling (Brother/Sister), or Spouse. Adding a sibling automatically inherits the root person's parents.
- **Interactive family tree graph** — powered by React Flow
  - 2-generation ancestor view plus direct children and spouses for the root person
  - Colour-coded by role: emerald (you) · blue (paternal) · rose (maternal) · amber (children) · violet (spouse)
  - Toggle between **vertical** (ancestors up) and **horizontal** (ancestors right) layout
  - Pan, zoom, and minimap navigation
  - Click any node to navigate to that person's profile
- **Export** — download the tree as a **JPEG image** or **JSON file**
- **Search** — filter the person list by name (shown when there are more than 4 people)

## Prerequisites

- Node.js ≥ 18 (tested on v25; see note below)
- [clann-server](https://github.com/colinmanning/clann-server) running on `http://localhost:3000`

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

## Project structure

```
src/
  app/
    page.tsx                  # Person list
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
  lib/
    types.ts                  # TypeScript types (mirrors OpenAPI schema)
    api.ts                    # Typed fetch wrappers
```

## API

All requests go through the Next.js rewrite proxy (`/api/*` → `http://localhost:3000/api/*`), so there are no CORS issues. The backend base URL is configured via `NEXT_PUBLIC_API_URL` in `.env.local`.
