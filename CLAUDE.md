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

> **Package installs:** always use `./scripts/npm.sh` instead of bare `npm` when installing, updating, or removing packages. The Docker build uses `node:22-alpine` (npm 10.9.7) while local npm is a different major version; running installs through the script keeps `package-lock.json` compatible and prevents `npm ci` failures in the build.

The backend (clann-server) must be running on `http://localhost:3000`. After rebuilding the backend, always restart the running process — the old binary continues serving until killed.

## Production deployment (Docker)

```bash
# Build and start the webapp container
docker compose -f docker-compose-prod.yaml up -d --build

# Pull a pre-built image instead of building locally
docker compose -f docker-compose-prod.yaml pull && docker compose -f docker-compose-prod.yaml up -d
```

**`output: "standalone"`** is set in `next.config.ts` so the build emits a self-contained `server.js` with only the files needed at runtime — no `node_modules` in the final image.

**Environment variables — important:** `NEXT_PUBLIC_*` variables are statically inlined by the Next.js bundler at build time (into both client bundles and server-side code). Setting them at runtime has no effect. Instead, the server-side backend URLs use plain (non-`NEXT_PUBLIC_`) env vars:
- `API_URL` — base URL for server-side calls to clann-server and for the `/api/*` rewrite destination (default: `http://clann-server:3001`)
- `AUTH_URL` — base URL for server-side calls to ullav-auth and for the `/auth-api/*` rewrite destination (default: `http://ullav-auth:8081`)
- `DAM_URL` — base URL for the `/api/dam/*` rewrite to ullav-dam-server (default: `http://ullav-dam-server:8080`); set to `http://localhost:8080` in `.env.local` for local dev
- `NEXT_PUBLIC_IDLE_TIMEOUT_MS` — idle session timeout in milliseconds (default: `3600000` = 1 hour); **build-time** `NEXT_PUBLIC_*` var so it is inlined into the client bundle; set low (e.g. `70000`) to test the warning modal

The defaults in `next.config.ts` are the production Docker service names, so no env vars need to be set during the Docker build. For local dev, set all three in `.env.local`.

**Network:** the `ullav-net` external network must exist before starting any service:
```bash
docker network create ullav-net
```

The webapp has no secrets of its own — all sensitive values live in clann-server and ullav-user-management.

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Flow (`@xyflow/react`) · `html-to-image` · next-intl v4 · `@uiw/react-md-editor` · `react-markdown` + `remark-gfm` · `@tailwindcss/typography`

**API proxy:** `next.config.ts` rewrites `/api/*` → `http://localhost:3000/api/*` so browser fetches never hit CORS. The API client (`src/lib/api.ts`) uses relative paths in the browser and the absolute backend URL server-side.

**Key files:**
- `src/lib/types.ts` — all TypeScript types mirroring the OpenAPI schema
- `src/lib/api.ts` — typed fetch wrappers for every backend endpoint
- `src/lib/persons.ts` — pure utility functions (`sortPersons`, `filterPersons`, `totalPages`, `pageSlice`) extracted for testability
- `src/hooks/useApi.ts` — binds all API calls with `created_by=username` so the backend ownership filter is always applied. For shared team trees (`activeTree.owner !== user.username`), read operations omit `created_by` so the backend uses JWT-based team access instead of returning 404. Exposes `isSharedTree: boolean` for UI guards. Write operations always use the logged-in user's `created_by`.
- `src/components/FamilyTreeView.tsx` — React Flow graph; loaded via `dynamic(..., { ssr: false })`. Shows 2-generation ancestors, direct children, and spouses for the root person. Supports vertical/horizontal orientation toggle and JPEG / JSON / GEDCOM export. The GEDCOM export uses the same fetch pattern as JSON (fetches all persons then relationships sequentially) and calls `exportToGedcom` from `src/lib/gedcom-export.ts`; downloads as `{treeName}.ged`.
- `src/components/PersonForm.tsx` — shared create/edit form; fields: name, sex, birth/death, identity (nickname/username/email/verified), biography (markdown editor via `MarkdownEditor`; no character cap). Accepts an optional `onCancel` prop: when provided, a **"Forget Changes"** button is rendered alongside "Save Changes"; clicking it resets the form to its initial values and calls `onCancel()` (the edit page uses this to navigate back to the person detail view). Includes an inline `DamPicker` (toggled by "Browse media library" button) — passes `apiBase="/api/dam"`, `token`, `username` (so the category tree is filtered to the user's own categories plus global ones), and a `filter` restricting to `image/*` assets owned by the logged-in user. Also has a drop zone below the editor. Both click-to-insert and drag-and-drop call `insertAssetMarkdown`, which appends `/thumbnail` to the asset URL and inserts the markdown image at the last tracked cursor position (tracked via `onSelect`/`onKeyUp`/`onMouseUp` on the textarea via `textareaProps`; falls back to end of string). A 2-second green flash on the drop zone confirms insertion.
- `src/components/MarkdownEditor.tsx` — thin wrapper around `@uiw/react-md-editor`; dynamically imported (`ssr: false`); wraps output in `data-color-mode="light"` to prevent dark-mode flicker; always yields a plain markdown string; accepts a `textareaProps` passthrough for attaching handlers to the underlying textarea
- `src/components/AddRelationshipModal.tsx` — modal for linking Father / Mother / Sibling / Spouse. The person list is filtered by sex: Father/Brother → males only, Mother/Sister → females only. Sibling mode supports **multi-select** (click to toggle; submit links all selected siblings at once and inherits the root person's parents to each). Setting a Father or Mother also triggers **auto-sibling discovery**: fetches the parent's existing children via `getFamilyTree` and links any that are not already siblings — deduplication uses `rawId()` to normalise the `person:<ulid>` IDs returned by the API against the bare ULID in `personId` from `useParams`.
- `src/components/PersonAvatar.tsx` — circular photo with emoji fallback; accepts an optional `imageVersion` prop (number) that is appended as `?v={imageVersion}` to the image URL to bust the browser cache after a photo upload
- `src/components/ImageUpload.tsx` — drag-and-drop image uploader; accepts `accept` (MIME list), `acceptLabel` (display string), and `maxBytes` props so limits vary by use case. Defaults are for profile images (JPEG/PNG ≤ 2 MB). Life story image passes JPEG/PNG/GIF/WebP ≤ 10 MB. Accepts an optional `uploadFn` prop to override the default profile-image endpoint, making it reusable for the life story image.
- `src/components/TreeSelector.tsx` — dropdown in the nav for selecting, creating, deleting (non-primary only), and setting the primary family tree; also opens `ImportTreeModal`. Shows a "Shared with me" section for team trees the user does not own (sourced from `TeamContext.teamTrees`).
- `src/components/ImportTreeModal.tsx` — 3-step modal (upload → name/preview → progress → done) for importing a tree from a Clann JSON export **or a GEDCOM (.ged) file**. Detects format by file extension; routes to `parseTreeExport` (JSON) or `parseGedcomFile` (GEDCOM). If the GEDCOM has no `FILE` tag the tree name is derived from the filename. Any parse warnings are shown in an amber scrollable list in the name step so the user can review before committing.
- `src/contexts/TreeContext.tsx` — holds the list of trees, the active tree, and tree CRUD actions; persists active selection in localStorage (`clann_active_tree`)
- `src/contexts/TeamContext.tsx` — holds the user's teams and team trees; exposes `isTeamTree(name)` (true when a tree is shared with the user but not owned by them), `treeTeamName(name)`, and full team CRUD. `teamTrees` are fetched by iterating teams where the user is a member (not owner) and calling `listTeamTrees`.
- `src/lib/teams-api.ts` — typed fetch wrappers for ullav-user-management team endpoints (`/teams`, `/teams/{id}`, invitations, members). Requests go via the `/auth-api/*` rewrite.
- `src/lib/auth-api.ts` — typed fetch wrappers for other ullav-user-management endpoints; exports `canCreateTeam(token)` which decodes the JWT and checks subscription/role claims.
- `src/lib/tree-import.ts` — pure parser for the Clann JSON export format; deduplicates persons and relationships. Exports the shared `ParsedImport` interface (includes optional `warnings?: string[]`) and the `slugify` helper used by both importers.
- `src/lib/gedcom-export.ts` — pure function `exportToGedcom(persons, relationships, treeName)` → GEDCOM 5.5.1 string. Maps persons to INDI records (NAME with GIVN/SURN/NICK, SEX, BIRT/DEAT, NOTE for biography) and derives FAM records from spouse pairs and parent–child relationships; siblings are listed as CHIL in shared FAM records. Output uses UTF-8 and CRLF line endings.
- `src/lib/gedcom-import.ts` — pure function `parseGedcomFile(content)` → `ParsedImport`. Groups GEDCOM lines into INDI/FAM records; extracts given name, middle name, surname, nickname (prefers explicit GIVN/SURN/NICK subfields), SEX, BIRT/DEAT events, NOTE → biography (with CONT/CONC continuation). FAM records → Spouse (with marriage date as `spouse_from`), Father/Mother (derived from sex of HUSB/WIFE), and Sibling relationships for all children sharing a FAM. Unresolvable references and missing fields are collected as human-readable warnings returned in `ParsedImport.warnings`.
**Auth proxy:** `next.config.ts` also rewrites `/auth-api/*` → `http://localhost:8081/*` for the ullav-user-management service. Auth state is managed by `src/contexts/AuthContext.tsx` (localStorage key `clann_auth`, JWT Bearer token). The context also implements **idle session timeout**: after `NEXT_PUBLIC_IDLE_TIMEOUT_MS` ms of inactivity (default 1 hour) the user is automatically signed out; a warning modal appears 60 s beforehand with "Stay Signed In" / "Sign Out Now" buttons. Activity events (`mousemove`, `keydown`, `pointerdown`, `scroll`, `touchstart`) reset the timer; events are ignored while the modal is open so the user must make an explicit choice. The `IdleWarningModal` component lives inside `AuthContext.tsx`.

**DAM proxy:** `src/proxy.ts` rewrites `/api/dam/*` → `DAM_URL` (default `http://ullav-dam-server:8080`), stripping the `/api/dam` prefix. This must be checked before the generic `/api/*` rule. The `DamPicker` component from `@ullav/dam-picker` (source copied into `packages/dam-picker/` and referenced as `file:./packages/dam-picker` in `package.json` so it is inside the Docker build context; switch to a version number once published to GitHub Packages) uses `/api/dam` as its `apiBase` and requires a `username` prop so it can filter the category tree sidebar to the logged-in user's own categories and global ones.

**Email flows:** The auth service sends transactional emails when SMTP is configured (`SMTP_HOST` in its `.env`). The webapp passes an `app_url` parameter in each relevant API call so the auth service constructs locale-aware links without needing `APP_BASE_URL` in its own config.
- **Email verification:** registration triggers a confirmation email; `app_url` is set to `{origin}/{locale}` (the auth service appends its own path); user clicks link → `POST /auth/confirm-email`
- **Password reset:** forgot-password form → `POST /auth/password-reset/request` with `app_url` set to `{origin}/{locale}` → reset email sent; user clicks link → `POST /auth/password-reset/confirm`

Both pages use `useSearchParams()` inside a `<Suspense>` boundary (required by Next.js App Router to avoid "Missing html and body tags" errors).

**Routes:** All routes are locale-prefixed (e.g. `/en/family`, `/de/family`). The proxy in `src/proxy.ts` handles `/api/*` and `/auth-api/*` rewrites and then delegates to next-intl's middleware for locale detection and bare-path redirects.

| Route | Description |
|---|---|
| `/[locale]` | Landing page (hero + feature cards) |
| `/[locale]/help` | In-app documentation (getting started, people, relationships, family tree, life story, family list, research, multiple trees, GEDCOM exchange) |
| `/[locale]/research` | Research workspace — note list + editor, Wikipedia search, 1926 Irish Census search |
| `/[locale]/login` | Sign in / create account / forgot password |
| `/[locale]/auth/confirm-email` | Handles email verification link clicks (`?token=`); activates account |
| `/[locale]/auth/password-reset` | Handles password reset link clicks (`?token=`); new-password form |
| `/[locale]/auth/sso` | SSO handoff from ullav-portal (`?t=<encoded-session>`); writes session to localStorage and redirects to `/family` |
| `/[locale]/family` | List all persons — card/list toggle, sort, search, **pagination** |
| `/[locale]/persons/new` | Create person |
| `/[locale]/persons/[id]` | Person detail: family tree tab · relationships tab · life story tab · life events tab |
| `/[locale]/persons/[id]/edit` | Edit person |
| `/[locale]/team` | Team management — create team, manage members, link trees |
| `/[locale]/auth/team-invite` | Handles team invitation link clicks (`?token=`); accepts or declines |

**ID handling:** The backend stores IDs as `person:<ulid>` (e.g. `person:01jd4a8xyz`). URLs use just the ULID (no prefix, no encoding). `api.ts` exposes a `rawId()` helper that strips the `person:` prefix before building request paths. **Always use `rawId(person.id)` when constructing links or `router.push` calls** — never `encodeURIComponent(person.id)`, which embeds the prefix in the URL and causes 404s.

**Backend API base URL:** Set via `API_URL` in `.env.local` (defaults to `http://localhost:3000`). Also set `AUTH_URL=http://localhost:8081` for the auth service.

## Multiple family trees

Each user can own multiple family trees. One tree per user is designated **primary** (the default on first login).

**Context:** `TreeContext` / `useTree()` provides:
- `trees` — all trees owned by the current user
- `activeTree` — the currently selected tree (persisted in `localStorage` under `clann_active_tree`)
- `createTree(name, displayName, options?)` — first tree created is automatically primary; pass `{ select: false }` to suppress auto-selection (used by `ImportTreeModal` to avoid triggering the family page's `listPersons` re-fetch during import)
- `deleteTree(name)` — only non-primary trees can be deleted; falls back to primary/first remaining tree after deletion
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

**JSON export format (flat):** The exported file contains `tree_name`, `tree_display_name`, `exported_at`, a flat `persons` array (all fields), and a flat `relationships` array. Each relationship entry has `person_id`, `related_id`, `type` (`father`/`mother`/`sibling`/`spouse`), plus `sibling_type` (for siblings) and `spouse_from`/`spouse_to` (for spouses). Relationships are deduplicated using a canonical key (smaller ID first for symmetric types).

The export fetches persons via `listPersons`, then fetches each person's relationships **sequentially** (not `Promise.all`).

**Import:** `ImportTreeModal` calls `parseTreeExport` (in `src/lib/tree-import.ts`), which auto-detects the format:
- If the JSON has a `persons` array → `parseFlatExport` (current format)
- Otherwise → `parseTreeWalkExport` (legacy tree-walk format, preserved for backward compatibility)

After parsing, the modal creates a new tree via `TreeContext.createTree(..., { select: false })` (so the tree appears in the dropdown but does not become the active tree, avoiding a concurrent `listPersons` re-fetch), imports persons sequentially (building an `originalId → newId` map), then adds relationships using the mapped IDs. `sibling_type` is taken directly from the export; if absent it falls back to the sibling's `sex`. On completion the "Go to family" button explicitly sets the imported tree as active.

## Teams and shared trees

Users with an eligible subscription (or admin role) can create a **team** and invite other registered users as members. A team owner can link one of their family trees to the team; all active members then see that tree in the "Shared with me" section of the Tree Selector dropdown.

**Access model:**
- **Owner** — full read/write access to their own trees; can manage the team (invite/remove members, link/unlink trees, update team info).
- **Member** — read-only access to trees linked to the team. Write actions (edit person, delete person, add/remove relationships, upload photos) are hidden in the UI. The `ReadOnlyBanner` is shown at the top of the Family Members page and Person Detail page.

**Shared-tree API calls:** When `activeTree.owner !== user.username`, `useApi` omits `created_by` from all read requests (`getPerson`, `getRelationships`, `getFamilyTree`, `listPersons`). This lets the backend use JWT-based team-membership access control instead of the per-user ownership filter (which would return 404 for another user's persons). Write operations keep the logged-in user's `created_by` and are blocked by the UI before reaching the backend.

**Team API endpoints (ullav-user-management, via `/auth-api/*` rewrite):**
| Method | Path | Notes |
|---|---|---|
| `GET` | `/teams` | List teams the current user belongs to |
| `POST` | `/teams` | Create a team |
| `GET` | `/teams/{id}` | Full team detail (members, etc.) |
| `PATCH` | `/teams/{id}` | Update name / description / purpose / avatar |
| `DELETE` | `/teams/{id}` | Delete team |
| `POST` | `/teams/{id}/invitations` | Invite a member by email; pass `app_url` for locale-aware link |
| `POST` | `/teams/invitations/{token}/accept` | Accept an invite (from link in email) |
| `POST` | `/teams/invitations/{token}/decline` | Decline an invite |
| `DELETE` | `/teams/{id}/members/{userId}` | Remove a member |
| `POST` | `/teams/{id}/members/{userId}/resend-invite` | Resend invitation email |

**Tree–team link endpoints (clann-server):**
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/trees/team/{teamId}` | List trees linked to a team |
| `PATCH` | `/api/trees/{name}/team` | Link or unlink a tree (`{ team_id: "<uuid>" | null }`) |

**`canCreateTeam(token)`** in `src/lib/auth-api.ts` decodes the JWT without verification and checks the claims for the required subscription tier or admin flag. Used by the Team page to decide whether to show the "Create team" button.

## i18n

**Library:** next-intl v4. Supported locales: `en` (default), `de`, `ga`. Defined in `src/i18n/routing.ts`.

- Translation files live in `messages/{locale}.json`, organised by namespace (`nav`, `family`, `personDetail`, `personForm`, `addRelationship`, `imageUpload`, `familyTree`, `disclaimer`, `footer`, `help`, `idleWarning`, `research`, `census`, etc.)
- Server components use `await getTranslations("namespace")` (from `next-intl/server`)
- Client components use `useTranslations("namespace")` (React hook)
- Do **not** use `t.rich(...)` with `{placeholder}` syntax — use separate keys or XML-style tags (`<b>text</b>`) instead. The `{br}` self-closing placeholder is not supported; split into two keys and insert `<br />` manually.
- The `LocaleSwitcher` component replaces the locale segment in the current pathname and calls `router.push`.
- **JSON string safety:** never use unescaped ASCII `"` (U+0022) inside translation string values — use `\"escaped\"` or typographic quotes instead. Typographic opening quotes like `„` (U+201E) are fine but their matching closing quote must not be a plain `"` or the JSON parser will terminate the string early.
- **ICU single-quote escaping:** next-intl uses ICU message format, where single quotes are escape characters. `'{team}'` outputs the literal text `{team}` — it does NOT interpolate the value. Never wrap ICU placeholders (`{foo}`) in single quotes. Use typographic quotes (`'name'` → `'name'`) or drop the decorative quotes entirely.
- **Key naming:** the confirmation prompt for removing a relationship is `personDetail.removeConfirm` (not `removeRelConfirm`).

## Life Story tab

The **Life Story** tab on the person detail page renders `person.biography` as formatted markdown using `react-markdown` with the `remark-gfm` plugin (tables, strikethrough, task lists). The output is wrapped in Tailwind `prose prose-stone` classes from `@tailwindcss/typography` (registered via `@plugin "@tailwindcss/typography"` in `globals.css`). When the biography is empty, a prompt with a link to the Edit page is shown instead.

The biography field is edited via `MarkdownEditor` (a dynamic-import wrapper around `@uiw/react-md-editor`), which stores content as a plain markdown string — no serialisation step needed. Images from the media library can be inserted inline (see `PersonForm` description above).

**Life story image (`life_image_path`):** A separate, typically larger image for the Life Story panel. Accepts JPEG, PNG, GIF, or WebP up to 10 MB. Stored as `{ulid}_life.{ext}` in the same upload directory as profile images (to avoid filename collisions with `{ulid}.{ext}`). Uploaded via `POST /api/persons/{id}/life-image`, served via `GET /api/persons/{id}/life-image`. When present, the image is displayed top-left in the tab with the biography flowing to its right (stacks vertically on mobile). Clicking the image or the "+ Add Life Story Image" button toggles an inline `ImageUpload` panel (same pattern as the profile photo). The `ImageUpload` component's `uploadFn`, `accept`, `acceptLabel`, and `maxBytes` props are used to target the life-image endpoint with its own limits rather than the profile-image defaults.

**PDF export:** The Life Story tab has an "Export as PDF" button that calls `window.print()`. `document.title` is swapped to the person's full name before printing and restored on the `afterprint` event so the browser uses it as the suggested filename. The print layout is handled by `LifeStoryPrintView` (in `src/components/LifeStoryPrintView.tsx`), which uses `createPortal` to mount the print container as a direct child of `<body>`. This is necessary because the component is otherwise nested inside React provider divs and `<main>`, and CSS `display: none` on those ancestors would suppress the print view even with `display: block !important` on the child. By portalling to `<body>`, the print CSS rule `body > *:not(.life-story-print) { display: none !important }` can hide all other direct children of `<body>` while leaving the print container visible. The component uses a `mounted` state guard (`useEffect(() => setMounted(true), [])`) to avoid calling `document.body` during SSR.

## Life Events tab

`src/components/LifeTimeline.tsx` renders the **📅 Life Events** tab on the person detail page.

**Data:** `api.listLifeEvents(personId)` / `createLifeEvent` / `updateLifeEvent` / `deleteLifeEvent`. The API uses `rawEventId()` (strips `"life_event:"` prefix) mirroring the `rawId()` helper used for persons.

**Timeline layout:** left-spine design — a vertical line on the left, an icon-badge circle per event, and a card to the right. Events are sorted chronologically using a fuzzy date parser (`dateSortKey`) that extracts year/month/day from free-form strings and sorts undated events last.

**Event type styles:** `EVENT_STYLES` map drives icon emoji, dot background/ring colour, and badge colour per event type (Birth=🌱 emerald, Death=🕊️ stone, Marriage=💍 violet, Divorce=⚖️ amber, Graduation=🎓 blue, Military=⚔️ red, Immigration/Emigration=✈️ sky, Other=📌 stone).

**Edit access:** `canEdit = roles.includes("admin") || user.username === personCreatedBy`. Edit/delete actions are only rendered for owners and admins.

**Add event form (`AddEventForm`):** name, date, type dropdown (with custom type option), description. Appears above the timeline.

**Details pill (`ViewEventPanel`):** events that have a story, source link, source image, or source document show a "Details" pill in the top-right of their card (always visible, not hover-gated). Clicking it expands an inline read-only panel showing: full story rendered as markdown (prose/GFM); source link as a plain `<a>`; source image fetched with Bearer token via `AuthImage` (renders the `/thumbnail` variant as an inline image); source document as a download button via `AuthDocLink` with the human-readable asset name resolved by `useAssetName` (fetches `GET /api/dam/assets/<id>` JSON metadata). The pill label toggles to "Close" while open. Opening the view panel closes any open edit panel and vice versa. The source icon row (🔗 🖼️ 📄) and the story snippet are hidden while the view panel is open.

**Edit event panel (`EditEventPanel`):** slides in inside the card when the ✏️ button is clicked (on hover). Contains:
- Name, date, event type + custom type
- Description (short text)
- Story: `MarkdownEditor` (dynamic import, `ssr: false`) with cursor-position tracking and an inline `DamPicker` for inserting image thumbnails at the cursor
- External source URL (text input)
- Source image / source document: `AssetPickerField` sub-component — each shows a `DamPicker` (filtered to images or non-images); stores `asset.url`; displays the asset name (from `PickedAsset.name` on fresh pick, or resolved via `useAssetName` for previously saved assets) with Clear/Change controls
- Verified checkbox

On save the event is patched in-place via `updateLifeEvent` and the list is re-sorted without a full reload.

## Research page

`src/components/ResearchPage.tsx` renders the **📝 Research** page at `/[locale]/research`.

**Data:** `api.listResearchNotes(tree?, createdBy?)` / `createResearchNote` / `updateResearchNote` / `deleteResearchNote`. The API uses `rawNoteId()` (strips `"research_note:"` prefix). Notes are scoped to the active tree via `useApi.listResearchNotes()` which injects `tree=activeTree.name` and `created_by=username` automatically.

**Note fields:** `title` (required), `description` (short text), `body` (markdown), `trees` (array of tree names — M2M-ready schema), `created_by`, `created_at`, `updated_at` (set by SurrealDB `DEFAULT <string>time::now()`; `updated_at` refreshed via `<string>time::now()` in every UPDATE query).

**Backend endpoints:**
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/notes` | Create note; `trees` array in body |
| `GET` | `/api/notes?tree=<name>&created_by=<user>` | List notes for a tree |
| `GET` | `/api/notes/{id}` | Single note |
| `PUT` | `/api/notes/{id}` | Full update; sets `updated_at = <string>time::now()` |
| `DELETE` | `/api/notes/{id}` | Delete |

**Layout:** left column (`lg:w-80`) lists note cards with title, description, and last-edited date; right panel switches between modes: `view` (read-only markdown), `create` / `edit` (editor form), `wikipedia` (`WikipediaSearch`), `census` (`CensusSearch`), `ai` (`AiChat`), or null (empty state prompt). Wikipedia and Census are opened via a 🔍 **Explore** dropdown button in the page header (not direct sidebar buttons).

**Folders:** Notes can be organised into user-scoped folders (`research_folder` table). Folder sidebar above the note list; `activeFolder` state `"all" | "unfiled" | "shared-by-me" | "shared-by-others" | folderId` filters the note list client-side. Virtual folder filters:
- `"unfiled"` — `!n.folder_id && n.created_by === user.username` (own unassigned notes)
- `"shared-by-me"` — `n.is_shared && n.created_by === user.username` (notes you shared; 📤 virtual folder)
- `"shared-by-others"` — `n.is_shared && n.created_by !== user.username` (teammates' shared notes; 👥 virtual folder)
Both shared virtual folders are only shown on team-linked trees (`isTeamLinkedTree`) and auto-refresh every 60 s. **`handleCreate` treats all virtual folder keys as `null` folder_id** — only real folder ULIDs are passed to the API; passing a virtual key string like `"shared-by-others"` would save it as an invalid `folder_id` and make the note invisible. A dedicated `PATCH /api/notes/{id}/folder` endpoint moves notes between folders (so normal `PUT` updates don't accidentally clear `folder_id`). Deleting a folder unfiles all its notes atomically server-side before the folder record is deleted.

**Dig Deeper with AI:** The note view panel has a `🤖 Dig deeper with AI` button. Clicking it sets `aiNoteContext` state (`{ title, body }`) and switches to `mode === "ai"`. `AiChat` receives the note as `noteContext` prop, injects it into the system prompt, and shows an amber badge. Closing the AI panel clears `aiNoteContext`.

**Wikipedia search:** Uses `https://{lang}.wikipedia.org/w/rest.php/v1/search/page` for search (note: the old `api/rest_v1/page/search` endpoint is deprecated) and `api/rest_v1/page/summary/{key}` for article detail. Language derived from `useLocale()`. "Save as Note" pre-fills the create form with the article title, Wikipedia URL as description, and a markdown body containing the extract plus a citation link.

**1926 Irish Census:** Hero image panel (no iframe — the NAI site blocks embedding). Shows the NAI hero image for the 1926 census, a grid of content chips describing what records contain, and a search form (surname, forename, county, townland). The search button constructs a deep-link URL using `surname__icontains`, `first_name__icontains`, `county`, `townland__icontains` params and opens it on the NAI website in a new tab. Data published by the National Archives of Ireland under CC BY 4.0 — attribution always displayed. **Person name pre-fill:** `ResearchPage` holds `censusPersonName: { forename, surname } | null` state. When `aiPersonId` (from `?personId=` URL param) is set, a `useEffect` calls `api.getPerson(aiPersonId)` and populates the state. `CensusSearch` receives `initialForename`/`initialSurname` plus a derived `key` prop — the `key` forces a remount when the fetch resolves so the fields fill in regardless of whether the fetch beat the user's click.

**Edit access:** `canEdit = roles.includes("admin") || user.username === note.created_by`.

## AI Research Assistant

`src/components/AiChat.tsx` — chat UI component used on the Research page and person detail pages.

**Architecture:**
- Streaming via Vercel AI SDK (`useChat` hook, `DefaultChatTransport`). Chat request goes to `POST /api/ai/chat` (a Next.js Route Handler, **not** proxied to clann-server).
- Provider settings (API key, model) are stored in clann-server's `user_ai_settings` SurrealDB table via `GET/PUT/DELETE /api/ai-settings`. The webapp AES-256-GCM encrypts the key before sending (`src/lib/ai-settings.ts`); clann-server stores opaque blobs and never sees the key.
- The route handler (`src/app/api/ai/chat/route.ts`) decrypts the key at request time and constructs the `streamText` call. Supported providers: Anthropic, OpenAI, Ollama (local).

**System prompt:** `GENEALOGY_SYSTEM_PROMPT` in the chat route. Covers Irish genealogy, historical records, name variants, DNA, and major repositories. Key design decision: the prompt says "research **any** family tree" — not just personal ancestry — so the AI handles royal lineages, historical families, and demo trees equally.

**Context injection:** Three optional context strings are passed in the request body alongside `messages`. Each is built from a React ref (updated by `useEffect`) so the transport closure always reads the latest value at send time:
- `personContext` — formatted person details + relationships (loaded when `personId` prop is set)
- `treeContext` — formatted list of all persons in the active tree (loaded on demand via the 🌳 toggle)
- `noteContext` — note title + body injected when launched via "Dig deeper" from a research note (`noteContext` prop)

**Session history:** Every conversation is auto-saved to the `chat_session` / `chat_message` SurrealDB tables via clann-server endpoints. Persistence logic:
- `persistedCountRef` tracks how many messages have been saved; `currentSessionIdRef` holds the active session ID.
- When `status` transitions to `"ready"` (streaming complete), a `useEffect` saves unpersisted messages. If no session exists yet, it creates one titled after the first user message.
- The 🕐 History panel lists sessions (ordered by `updated_at DESC`, scoped to `created_by` + `tree`). Clicking a session calls `listSessionMessages`, converts them to `UIMessage[]`, and calls `setMessages` with `persistedCountRef` set to the loaded count so no duplicate saves occur.
- `handleClearChat` resets both refs and clears messages.

**Backend endpoints (clann-server):**
| Method | Path | Notes |
|---|---|---|
| `GET/PUT/DELETE` | `/api/ai-settings` | Encrypted BYOK key storage |
| `GET/POST` | `/api/chat/sessions` | List/create sessions (`?created_by=&tree=`) |
| `DELETE` | `/api/chat/sessions/{id}` | Delete session + all its messages |
| `GET/POST` | `/api/chat/sessions/{id}/messages` | List messages (ASC) / append a message |

**New env var:**

| Variable | Default | Notes |
|---|---|---|
| `SETTINGS_ENCRYPTION_KEY` | `clann-dev-key-change-in-production!!` | AES-256-GCM key for BYOK encryption — **change in production** |

## Family Tree graph

`FamilyTreeView` uses React Flow with a custom `PersonNode` type. Key design decisions:

- **Node roles & colours:** `root` (emerald) · `father` (blue) · `mother` (rose) · `child` (amber) · `spouse` (violet). Defined in `ROLE_STYLES` — one source of truth for borders, backgrounds, handle colours, and minimap dots.
- **Four explicit handles per node** with IDs `main-s` / `main-t` (ancestor↔child axis) and `sp-s` / `sp-t` (perpendicular spouse axis). All edges must specify `sourceHandle` / `targetHandle`.
- **Orientation:** vertical (ancestors up, children down, spouses right) or horizontal (ancestors right, children left, spouses below).
- **Node `width: 148, height: 120`** must be set on each node object so the MiniMap can render them before DOM measurement.
- `nodeTypes` is defined outside the component to avoid React Flow re-renders.
- **Hover tooltip:** each node shows a dark tooltip above it on hover with `date_of_birth`, `place_of_birth`, and `biography` (biography capped at 4 lines). Only rendered when at least one field is non-null.
- **Export dropdown:** a single Export button opens a menu with three options (JPEG / JSON / GEDCOM); the button is disabled and shows a spinner while any export is in progress. Click-outside closes the menu via a `mousedown` listener on `document`.
- **Media Library button:** shown only when `hasDamAccess(token)` returns true (admin role or active Comad subscription in JWT payload). Opens `NEXT_PUBLIC_DAM_BROWSER_URL/${locale}/auth/sso?t=<encoded-session>` in a new tab.
- **Image cache-busting:** `buildGraph` accepts an optional `photoVersions: Record<string, number>` parameter (passed from the `useMemo` call in the component). Each node's `NodeData` includes `imageVersion` (looked up by `rawId`). `PersonNode` appends `?v={imageVersion}` to the image URL when set. The person detail page tracks `photoVersions` state, increments the entry for the uploaded person's ID on successful upload, and passes it to both `FamilyTreeView` and `PersonAvatar` (header) so the new photo is shown immediately without a page reload.

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
| Father | `has_father` | child → father; person picker shows males only; after adding, auto-discovers parent's other children and links them as siblings |
| Mother | `has_mother` | child → mother; person picker shows females only; same auto-sibling discovery as Father |
| Sibling | `has_sibling` | one direction; queried bidirectionally; person picker shows males for Brother, females for Sister; **multi-select** supported; inherits root person's parents to all new siblings |
| Spouse | `has_spouse` | added **bidirectionally** (A→B and B→A); deleted with `OR` clause covering both directions; edge carries `spouse_from` / `spouse_to` date strings |

**Spouse dates:** The `has_spouse` edge stores optional `spouse_from` and `spouse_to` strings (free-form, e.g. `"1990"` or `"2 June 2001"`). `GET /api/persons/{id}/relationships` returns spouses as `SpouseInfo` (a `Person` with `spouse_from`/`spouse_to` added). Dates are set at creation time via `AddRelationshipRequest` and updated afterwards via `PATCH /api/persons/{id}/spouse-dates/{related_id}` — this updates both edge directions atomically.
