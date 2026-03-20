# Clann – Family Tree Web App

A responsive, localised family tree management application built with Next.js, backed by [clann-server](https://github.com/colinmanning/clann-server) (Rust · Axum · SurrealDB).

## Features

- **Person management** — create, edit, delete people with name, sex, birth/death dates and places, optional biography (up to 1000 characters), and identity-verified flag
- **Photo upload** — JPEG/PNG photos (≤ 3 MB) shown on cards, detail pages, and in the family tree graph
- **Relationships** — link people as Father, Mother, Sibling (Brother/Sister), or Spouse. Adding a sibling automatically inherits the root person's parents. Spouse relationships carry optional **from** and **to** dates, editable inline in the Relationships tab.
- **Interactive family tree graph** — powered by React Flow
  - 2-generation ancestor view plus direct children and spouses for the root person
  - Colour-coded by role: emerald (you) · blue (paternal) · rose (maternal) · amber (children) · violet (spouse)
  - Toggle between **vertical** (ancestors up) and **horizontal** (ancestors right) layout
  - Pan, zoom, and minimap navigation
  - Click any node to navigate to that person's profile
  - Hover over any node to see a tooltip with date of birth, place of birth, and biography
- **Export** — download the tree as a **JPEG image** or **JSON file**
- **Family Members list** — card or list view with sort (family name, date of birth, place of birth), name search, and **pagination** (5–30 per page, default 10)
- **Authentication** — login, registration with **email verification**, and **email-based password reset** via ullav-user-management; the webapp passes the correct locale-aware callback URL (`app_url`) directly in each auth API request so no static `APP_BASE_URL` is needed in the auth service config; family data is gated behind login; ownership filter enforced server-side; all password fields have a show/hide toggle
- **Localisation** — English (default), German, and Irish (Gaeilge); language switcher in the nav bar

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

Open [http://localhost:3001](http://localhost:3001). The middleware will detect your browser language and redirect to the appropriate locale prefix (e.g. `/en/`, `/de/`, `/ga/`).

> **Node v25 note:** the `.bin/next` symlink is broken on Node v25. The npm scripts already work around this by invoking `node node_modules/next/dist/bin/next` directly.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Graph | React Flow (`@xyflow/react`) |
| Image export | `html-to-image` |
| i18n | next-intl v4 |
| Backend | clann-server (Rust · Axum · SurrealDB) |
| Auth | ullav-user-management (Rust · Actix-web · PostgreSQL) |

## Project structure

```
messages/
  en.json                   # English translations (base)
  de.json                   # German translations
  ga.json                   # Irish (Gaeilge) translations
src/
  app/
    layout.tsx              # Root layout (pass-through for locale layout)
    [locale]/
      layout.tsx            # Locale layout: <html lang>, providers, Nav
      page.tsx              # Landing page
      login/page.tsx        # Sign in / register / forgot password
      auth/
        confirm-email/
          page.tsx          # Handles email verification link (?token=)
        password-reset/
          page.tsx          # Handles password reset link (?token=)
      family/page.tsx       # Person list (card/list, sort, search, pagination)
      persons/
        new/page.tsx        # Create person
        [id]/
          page.tsx          # Person detail (tree + relationships tabs)
          edit/page.tsx     # Edit person
  components/
    FamilyTreeView.tsx      # React Flow graph (SSR-disabled)
    PersonForm.tsx          # Shared create/edit form
    AddRelationshipModal.tsx # Link relationships
    PersonCard.tsx          # Card on list page
    PersonAvatar.tsx        # Circular photo with fallback emoji
    ImageUpload.tsx         # Drag-and-drop uploader
    PasswordInput.tsx       # Password field with show/hide toggle
    LocaleSwitcher.tsx      # Language selector dropdown
    Nav.tsx                 # Top navigation bar
  contexts/
    AuthContext.tsx         # JWT auth state (localStorage)
  hooks/
    useApi.ts               # API hook; binds created_by=username on every call
  i18n/
    routing.ts              # Supported locales and default locale
    request.ts              # Server-side locale/message loader
  lib/
    types.ts                # TypeScript types (mirrors OpenAPI schema)
    api.ts                  # Typed fetch wrappers
    auth-api.ts             # Auth service fetch wrappers
    persons.ts              # Pure sort/filter/pagination helpers (tested)
  middleware.ts             # Locale detection and URL prefix routing
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

Every API call includes `created_by=<username>` (applied automatically by `useApi`). The backend enforces ownership server-side and grants admin access when the username matches the `ADMIN_USERNAME` environment variable.
