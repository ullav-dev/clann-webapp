# Clann – Family Tree Web App

A responsive, localised family tree management application built with Next.js, backed by [clann-server](https://github.com/colinmanning/clann-server) (Rust · Axum · SurrealDB).

## Features

- **Person management** — create, edit, delete people with name, sex, birth/death dates and places, optional biography (markdown, rendered in the Life Story tab), and identity-verified flag; the edit form includes a **Forget Changes** button to revert all edits and return to the person detail page
- **Photo upload** — JPEG/PNG profile photos (≤ 2 MB) shown on cards, detail pages, and in the family tree graph; replacing a photo updates the header avatar and all tree nodes immediately without a page reload (cache-busted via a `?v=` timestamp query parameter)
- **Relationships** — link people as Father, Mother, Sibling (Brother/Sister), or Spouse with a smart modal that filters the person list by sex (Father/Brother → males only, Mother/Sister → females only). Adding a **sibling** supports multi-select so several siblings can be linked in one step, and automatically inherits the root person's parents to all new siblings. Setting a **Father or Mother** automatically discovers that parent's other children and links them as siblings — a powerful way to build a comprehensive tree quickly. Spouse relationships carry optional **from** and **to** dates, editable inline in the Relationships tab.
- **Interactive family tree graph** — powered by React Flow
  - 2-generation ancestor view plus direct children and spouses for the root person
  - Colour-coded by role: emerald (you) · blue (paternal) · rose (maternal) · amber (children) · violet (spouse)
  - Toggle between **vertical** (ancestors up) and **horizontal** (ancestors right) layout
  - Pan, zoom, and minimap navigation
  - Click any node to navigate to that person's profile
  - Hover over any node to see a tooltip with date of birth, place of birth, and biography
  - Single **Export** dropdown button — choose JPEG image, flat JSON, or GEDCOM 5.5.1 (`.ged`)
  - **Media Library** shortcut button (visible to users with a DAM subscription or admin role) — opens the Ullav DAM browser in a new tab with automatic single sign-on
- **Multiple family trees** — create and manage multiple trees per account; one tree is designated **primary** (auto-selected on login); switch between trees from the nav bar dropdown; set any tree as primary; delete non-primary trees (cascade-deletes all their people and relationships; the primary tree is protected from deletion)
- **Export** — a single Export dropdown in the family tree toolbar lets you download the tree as a **JPEG image**, a **flat JSON file** (Clann's own format), or a **GEDCOM 5.5.1 file** (`.ged`) compatible with Ancestry, FamilySearch, Gramps, MacFamilyTree, and other genealogy apps
- **Import** — upload a Clann JSON export **or a GEDCOM (.ged) file** to create a new tree; the 3-step modal (upload → name/preview → live progress) auto-detects the format, derives parent/spouse/sibling relationships from FAM records, and shows a warnings panel for any data that could not be fully resolved so you can review before importing
- **Family Members list** — card or list view with sort (family name, date of birth, place of birth), name search, and **pagination** (5–30 per page, default 10)
- **Authentication** — sign in, registration (first name, surname, sex, email, password) with **email verification**, and **email-based password reset** via ullav-user-management; registration requires accepting both a **Disclaimer** and the **Terms & Conditions** (each opens a scrollable modal); on first login the initial family tree and person are created automatically from the registration details; the webapp passes the correct locale-aware callback URL (`app_url`) directly in each auth API request so no static `APP_BASE_URL` is needed in the auth service config; family data is gated behind sign-in; ownership filter enforced server-side; all password fields have a show/hide toggle; **idle session timeout** automatically signs out inactive users after 1 hour (configurable via `NEXT_PUBLIC_IDLE_TIMEOUT_MS`), with a localised 60-second warning modal before sign-out
- **Life Story** — biography field accepts markdown (headings, bold, italic, lists, links); rendered as formatted prose in the dedicated **Life Story** tab on each person's profile page; edited using a toolbar-driven markdown editor in the edit form. Images from the **media library** can be inserted inline: click "Browse media library" to open an inline asset picker, then click an image to insert it at the cursor position, or drag it onto the drop zone below the editor — images are inserted as thumbnails at the current cursor position. An optional **life story image** (JPEG/PNG ≤ 2 MB) can be uploaded directly from the Life Story tab and is displayed top-left alongside the biography text. The tab includes an **Export as PDF** button that opens the browser print dialog; the output is named after the person and includes their name, birth details, life story image, and full biography
- **Life Events** — chronological timeline on each person's profile (📅 Life Events tab); events have a name, date, type (Birth, Death, Marriage, Divorce, Graduation, Military, Immigration, Emigration, Other — or a custom label), a short description, a long-form story (markdown with media library image insertion), an external source URL, source image and source document (each picked from the media library), and a verified flag; events are sorted by date using a fuzzy date parser (undated events sort last); each event type has a distinct icon and colour; a **Details pill** (always visible on cards with story or source content) expands an inline read-only panel showing the full story rendered as formatted markdown, source image as an authenticated inline thumbnail, and source document as a named download link (asset name resolved from DAM metadata); editing opens in a modal without a page reload; edit and delete actions are restricted to the person's owner and admins
- **Research workspace** — dedicated `/research` page (tree-scoped) for capturing genealogical research:
  - **Research notes** — create, edit, and delete markdown notes with a title and short description; notes support inline media library image insertion at the cursor position
  - **Note folders** — organise notes into user-scoped folders; folder sidebar above the note list; notes can be moved between folders or left unfiled (Unfiled Notes shows only your own unassigned notes)
  - **Shared notes** — on team-linked trees, a share toggle in the note editor marks a note visible to all team members. Two virtual folders in the sidebar: 📤 **Shared with team** (notes you have shared) and 👥 **Shared by team** (notes teammates have shared); both auto-refresh every 60 seconds while active
  - **Explore menu** — a 🔍 Explore dropdown in the page header gives access to Wikipedia search and the 1926 Irish Census panel
  - **Wikipedia search** — inline panel using the Wikipedia REST API; search by name, place, or event; select a result to read the article summary; **Save as Note** pre-fills a new note with the article title, URL, and extract. Searches the Wikipedia edition matching the current language setting
  - **1926 Irish Census** — hero panel with a census image, description of record contents, and a search form (surname, forename, county, townland). The search button opens the [National Archives of Ireland](https://nationalarchives.ie/collections/search-the-1926-census/) in a new tab with terms pre-filled. When navigating from a person's profile via the 🤖 Research button, the surname and forename are **automatically pre-filled** with that person's name. Census data published under **CC BY 4.0**
  - **AI Research Assistant** — streaming AI chat panel powered by your choice of Anthropic, OpenAI, or Ollama (BYOK — your API key is AES-256-GCM encrypted before storage, never held in plain text). Works with any family tree — personal ancestry, royal lineages, historical families, or demo trees. Features: person context (pre-load a person's details from their profile), tree context toggle (inject all persons from the active tree), prompt templates (six genealogy categories), **conversation history** (auto-saved per tree; resume any past session from the 🕐 History panel), and **Dig Deeper** (click on any research note to launch the AI chat with the note's content pre-injected as context)
- **Teams and shared trees** — users with an eligible subscription can create a **team**, invite other registered users by email, and share one of their family trees with all active team members. Members see the shared tree in the "Shared with me" section of the tree selector and can navigate the full tree and all person profiles in **read-only mode** (edit, delete, and relationship controls are hidden; a violet banner identifies the shared tree and its team). Team owners can manage membership (invite, remove, resend invites) and update the team name, description, and purpose from the `/team` page
- **In-app help** — `/help` page documenting all features (getting started, people, relationships, family tree, life story, life events, research, list view, multiple trees, teams, GEDCOM exchange), accessible from the nav bar without logging in
- **Localisation** — English (default), German, and Irish (Gaeilge); language switcher in the nav bar

## Prerequisites

- Node.js ≥ 18 (tested on v25; see note below)
- [clann-server](https://github.com/colinmanning/clann-server) running on `http://localhost:3000`
- [ullav-user-management](https://github.com/colinmanning/ullav-user-management) running on `http://localhost:8081` (auth service)
- [ullav-dam-server](https://github.com/colinmanning/ullav-dam-server) running on `http://localhost:8080` (media library; required for biography image insertion and life event source assets)
- [ullav-dam-browser](https://github.com/colinmanning/ullav-dam-browser) running on `http://localhost:3002` (optional; required for the Media Library shortcut in the family tree toolbar)

## Setup

```bash
# Install dependencies
npm install

# Create environment file
printf "API_URL=http://localhost:3000\nAUTH_URL=http://localhost:8081\nDAM_URL=http://localhost:8080\n" > .env.local

# Start the development server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The proxy (`src/proxy.ts`) will detect your browser language and redirect to the appropriate locale prefix (e.g. `/en/`, `/de/`, `/ga/`).

> **Node v25 note:** the `.bin/next` symlink is broken on Node v25. The npm scripts already work around this by invoking `node node_modules/next/dist/bin/next` directly.

## Production deployment (Docker)

The webapp ships as a minimal Docker image built with Next.js standalone output.

### Prerequisites

- Docker with the `ullav-net` external network created:
  ```bash
  docker network create ullav-net
  ```
- clann-server and ullav-user-management already running on `ullav-net` (managed by their own compose files)

### Configuration

Copy `.env.prod` and fill in the internal Docker service addresses:

```bash
# .env.prod (not committed — create on the server)
API_URL=http://clann-server:3001
AUTH_URL=http://ullav-auth:8081
DAM_URL=http://ullav-dam-server:8080
```

> **Note:** Use plain `API_URL` / `AUTH_URL` / `DAM_URL`, **not** `NEXT_PUBLIC_*` variants — plain env vars cannot be set at runtime. The defaults already point to the correct Docker service names, so these vars are only needed if your service names differ. `NEXT_PUBLIC_IDLE_TIMEOUT_MS` is the exception: it **is** a `NEXT_PUBLIC_*` var and must be set at build time if you want a non-default timeout.
>
> **`SETTINGS_ENCRYPTION_KEY`** — required for the AI Research Assistant. Set to a random 32-character string in production. The default (`clann-dev-key-change-in-production!!`) is intentionally weak — always override in `.env.prod`.

### Build and run

```bash
# Build image and start container
docker compose -f docker-compose-prod.yaml up -d --build

# Or pull a pre-built image
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d
```

The webapp has no secrets of its own — sensitive values are managed by the backend services.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Graph | React Flow (`@xyflow/react`) |
| Markdown editor | `@uiw/react-md-editor` |
| Markdown renderer | `react-markdown` + `remark-gfm` |
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
      help/page.tsx         # In-app documentation (server component)
      family/page.tsx       # Person list (card/list, sort, search, pagination)
      research/page.tsx     # Research workspace (notes, Wikipedia, 1926 Census)
      team/page.tsx         # Team management (create, members, linked trees)
      auth/
        team-invite/
          page.tsx          # Handles team invitation link (?token=); accept/decline
      persons/
        new/page.tsx        # Create person
        [id]/
          page.tsx          # Person detail (family tree, relationships, life story tabs)
          edit/page.tsx     # Edit person
  components/
    FamilyTreeView.tsx      # React Flow graph (SSR-disabled)
    PersonForm.tsx          # Shared create/edit form (biography uses MarkdownEditor)
    MarkdownEditor.tsx      # Dynamically-imported @uiw/react-md-editor wrapper (SSR-safe)
    LifeTimeline.tsx        # Life Events tab: left-spine timeline, add/edit/delete events
    ResearchPage.tsx        # Research workspace: notes list + editor, Wikipedia/Census panels
    WikipediaSearch.tsx     # Debounced Wikipedia search (w/rest.php/v1); Save as Note
    CensusSearch.tsx        # 1926 Irish Census hero panel + pre-populated deep-link search (new tab)
    AddRelationshipModal.tsx # Link relationships
    PersonCard.tsx          # Card on list page
    PersonAvatar.tsx        # Circular photo with fallback emoji
    ImageUpload.tsx         # Drag-and-drop uploader; accepts uploadFn prop to target any image endpoint
    PasswordInput.tsx       # Password field with show/hide toggle
    LocaleSwitcher.tsx      # Language selector dropdown
    Nav.tsx                 # Top navigation bar
    Footer.tsx              # Site footer: © year, Disclaimer link, Terms & Conditions link
    TermsModal.tsx          # Scrollable Terms & Conditions modal (content from login.termsContent)
    DisclaimerModal.tsx     # Scrollable Disclaimer modal (content from disclaimer.content)
  components/
    TreeSelector.tsx        # Nav dropdown: select/create/delete/set-primary tree, open import modal
    ImportTreeModal.tsx     # 3-step import modal (upload → name → progress → done)
  contexts/
    AuthContext.tsx         # JWT auth state (localStorage)
    TreeContext.tsx         # Active tree + tree CRUD (localStorage: clann_active_tree)
    TeamContext.tsx         # Team list + team trees; isTeamTree() / treeTeamName() helpers
  hooks/
    useApi.ts               # API hook; binds created_by=username; omits it for shared-tree reads; exposes isSharedTree
  i18n/
    routing.ts              # Supported locales and default locale
    request.ts              # Server-side locale/message loader
  lib/
    types.ts                # TypeScript types (mirrors OpenAPI schema)
    api.ts                  # Typed fetch wrappers
    auth-api.ts             # Auth service fetch wrappers; canCreateTeam()
    teams-api.ts            # Team endpoints on ullav-user-management (via /auth-api/*)
    persons.ts              # Pure sort/filter/pagination helpers (tested)
    tree-import.ts          # Parser for Clann JSON export format; exports ParsedImport, slugify
    gedcom-export.ts        # Pure GEDCOM 5.5.1 serialiser (exportToGedcom)
    gedcom-import.ts        # Pure GEDCOM 5.5.1 parser (parseGedcomFile) with warnings
    # Research Notes API: listResearchNotes / createResearchNote / updateResearchNote /
    # deleteResearchNote / rawNoteId — all in api.ts; types in types.ts
  proxy.ts                  # API/auth rewrites + locale detection (Next.js 16 proxy convention)
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

All browser requests go through the Next.js proxy (`src/proxy.ts`): `/api/*` is rewritten to clann-server, `/auth-api/*` to ullav-user-management, and `/api/dam/*` to ullav-dam-server (with the `/api/dam` prefix stripped), so there are no CORS issues. The backend URLs are configured via `API_URL`, `AUTH_URL`, and `DAM_URL` in `.env.local` (runtime env vars, not `NEXT_PUBLIC_*`).

Every API call includes `created_by=<username>` (applied automatically by `useApi`). The backend enforces ownership server-side and grants admin access when the username matches the `ADMIN_USERNAME` environment variable. For shared team trees (where the active tree is owned by another user), read operations omit `created_by` so the backend uses JWT-based team-membership access instead of the per-user ownership filter.

### Research Notes API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notes` | Create a research note |
| `GET` | `/api/notes?tree=<name>&created_by=<user>` | List notes for the active tree |
| `GET` | `/api/notes/{id}` | Get a single note |
| `PUT` | `/api/notes/{id}` | Update title, description, or body |
| `DELETE` | `/api/notes/{id}` | Delete a note |

Notes are stored in the `research_note` SurrealDB table with a `trees: array<string>` field, making the schema M2M-ready for future cross-tree note sharing.

### Research Folders API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/folders?created_by=<user>` | List folders |
| `POST` | `/api/folders` | Create a folder |
| `PATCH` | `/api/folders/{id}` | Rename a folder |
| `DELETE` | `/api/folders/{id}` | Delete folder (unfiles all its notes) |
| `PATCH` | `/api/notes/{id}/folder` | Move a note to a folder (`folder_id: null` to unfile) |

### AI Settings API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ai/settings` | Get AI provider config (via Next.js Route Handler) |
| `POST` | `/api/ai/settings` | Save AI provider config (key encrypted before storage) |
| `DELETE` | `/api/ai/settings` | Remove AI settings |
| `POST` | `/api/ai/chat` | Streaming chat (Vercel AI SDK; proxied directly, not via clann-server) |

### Chat Sessions API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/chat/sessions` | List past sessions (scoped to user + tree) |
| `POST` | `/api/chat/sessions` | Create a session |
| `DELETE` | `/api/chat/sessions/{id}` | Delete session and all its messages |
| `GET` | `/api/chat/sessions/{id}/messages` | Load messages for a session |
| `POST` | `/api/chat/sessions/{id}/messages` | Append a message to a session |

## Third-party data

The 1926 Irish Census records displayed via the Research page are published by the **National Archives of Ireland** under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/). Attribution is displayed in the Census search panel. Census data is being released in phases — not all counties or households are available yet.
