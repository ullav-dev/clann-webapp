---
name: run-clann-webapp
description: Build, run, and drive clann-webapp. Use when asked to start clann-webapp, run the dev server, take a screenshot of its UI, verify a change in the browser, or interact with the running Next.js app.
---

clann-webapp is a Next.js 16 app (port 3001). Drive it with `.claude/skills/run-clann-webapp/smoke.mjs` — a Playwright-core script that launches headless Chromium, navigates the app, and writes screenshots to `/tmp/shots/`.

All paths below are relative to `clann-webapp/` (the project root).

## Prerequisites

```bash
# Install skill dependencies (playwright-core library)
cd .claude/skills/run-clann-webapp && npm install && cd -

# Install the Chromium browser used by the driver (one-time per machine)
.claude/skills/run-clann-webapp/node_modules/.bin/playwright-core install chromium
```

On Linux, also install system libraries Chromium needs:

```bash
sudo apt-get install -y libglib2.0-0 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libgbm1 libxcomposite1 libxdamage1 \
  libxrandr2 libpango-1.0-0 libcairo2 libasound2
```

## Setup

```bash
npm install   # install webapp dependencies
```

The webapp requires two environment variables for local dev. Create `.env.local` if it doesn't exist:

```
API_URL=http://localhost:3000      # clann-server
AUTH_URL=http://localhost:8081     # ullav-user-management auth service
DAM_URL=http://localhost:8080      # optional: ullav-dam-server
```

## Run (agent path)

Start the dev server in the background, wait for it to be ready, then run the smoke driver:

```bash
# Start dev server
npm run dev > /tmp/clann-webapp-dev.log 2>&1 &
echo $! > /tmp/clann-webapp.pid

# Wait until it's serving (Next.js compiles on first request — can take 20 s)
until curl -sf http://localhost:3001/en >/dev/null 2>&1; do sleep 1; done
echo "ready"

# Run the smoke driver — screenshots land in /tmp/shots/
node .claude/skills/run-clann-webapp/smoke.mjs
```

To also run the authenticated flow (requires clann-server + auth service both running):

```bash
TEST_EMAIL=you@example.com TEST_PASSWORD=yourpassword \
  node .claude/skills/run-clann-webapp/smoke.mjs
```

The driver exits 0 on success. Screenshots:

| File | Page |
|---|---|
| `/tmp/shots/landing.png` | Public landing page (`/en`) |
| `/tmp/shots/login.png` | Sign-in form (`/en/login`) |
| `/tmp/shots/post-login.png` | First page after login (when `TEST_EMAIL`/`TEST_PASSWORD` set) |
| `/tmp/shots/family.png` | Family members list (when credentials set) |

Stop the dev server when done:

```bash
kill $(cat /tmp/clann-webapp.pid) 2>/dev/null; rm -f /tmp/clann-webapp.pid
```

## Run (human path)

```bash
npm run dev   # starts on port 3001, open http://localhost:3001
# Ctrl-C to stop
```

## Test

```bash
npm test   # vitest unit tests — runs without any server
```

Covers: `sortPersons`/`filterPersons`/`pageSlice`, `rawId`, `fullName`/`personIcon`, GEDCOM import/export, tree-import parser, AES-256-GCM encryption, `PersonAvatar` component.

---

## Gotchas

- **`timeout` not available on macOS zsh** — `timeout 30 bash -c '...'` fails. Use `until` loop without `timeout` or prefix with `gtimeout` (`brew install coreutils`). The `until` poll in the run section above avoids this.
- **Next.js compile delay** — first `curl` after start usually succeeds fast (server starts in ~3 s), but the first _browser_ navigation compiles the route on demand and can take 10–20 s. `wait-for` / `waitUntil: 'networkidle'` in the driver handles this.
- **Port 3001 already in use** — if a previous run left the server up: `lsof -ti :3001 | xargs kill -9` (see memory: always use `lsof` not `pkill`).
- **`--webpack` flag is required** — `package.json` already has it in the `dev` script (`next dev --port 3001 --webpack`). Without it, Turbopack crashes on Node v25.
- **Landing page renders without backends** — `/en` and `/en/login` and `/en/help` serve static/SSR HTML with no API calls. The auth-required routes (`/en/family`, person detail, research) redirect to login when the auth service is unreachable.
- **`playwright-core` vs `playwright`** — the driver only needs `playwright-core` (no test runner). The browser install CLI is `./node_modules/.bin/playwright-core install chromium`, not `npx playwright install`.

## Troubleshooting

- **`net::ERR_CONNECTION_REFUSED at http://localhost:3001`**: dev server isn't running (or port changed). Check `lsof -ti :3001` and restart with `npm run dev`.
- **`Cannot find package 'playwright-core'`**: run `cd .claude/skills/run-clann-webapp && npm install` first.
- **Chromium binary not found**: run `.claude/skills/run-clann-webapp/node_modules/.bin/playwright-core install chromium`.
- **`EADDRINUSE :3001`**: previous server still running. `kill $(cat /tmp/clann-webapp.pid)` or `lsof -ti :3001 | xargs kill -9`.
