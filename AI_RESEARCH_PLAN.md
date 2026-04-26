# AI Research Assistant — Implementation Plan

## Overview

Add a genealogy-focused AI chatbot to the Research section. Users can chat with an AI assistant
to get help with genealogy research, then pull responses or full conversations into research notes.

## Architecture Decisions

### LLM Abstraction: Vercel AI SDK (`ai` package)
- Unified `streamText` / `useChat` API across all providers
- Streaming works natively with Next.js Route Handlers
- Provider packages: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `ollama-ai-provider`

### Supported Providers
| Provider | Models | Notes |
|---|---|---|
| Anthropic | claude-sonnet-4-6 (default), claude-haiku-4-5, claude-opus-4-7 | Best reasoning |
| OpenAI | gpt-4o (default), gpt-4o-mini | Broadest familiarity |
| Ollama | user-defined (llama3.2 default) | Local/free, privacy-first, no key needed |

### Per-User API Key Storage: BYOK (encrypted file-based, Phase 1)
- User enters API key in `/settings` page
- Key is encrypted server-side with AES-256-GCM (`SETTINGS_ENCRYPTION_KEY` env var)
- Key is never returned to the browser; webapp decrypts at request time using `SETTINGS_ENCRYPTION_KEY`
- **Phase 2b (done):** migrated to clann-server SurrealDB via `GET/PUT/DELETE /api/ai-settings`; webapp keeps `SETTINGS_ENCRYPTION_KEY` and sends opaque encrypted blobs — clann-server never sees the key

### Chat → Note Integration
- Each AI response has a "📋 Save as Note" button (pre-fills create form)
- "Save Conversation" button exports the full thread as structured markdown

### Chat Route
- `POST /api/ai/chat` — handled by Next.js Route Handler (NOT proxied to clann-server)
- `GET/POST/DELETE /api/ai/settings` — settings CRUD
- `proxy.ts` updated to let `/api/ai/*` through to Next.js natively

### Genealogy System Prompt
Specialist prompt covering: historical records, Irish genealogy, name variants, migration patterns,
record types by era, DNA genealogy. Injected as the `system` parameter in `streamText`.

## New Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `SETTINGS_ENCRYPTION_KEY` | `clann-dev-key-change-in-production!!` | **Change in production!** 32 chars used |
| `AI_SETTINGS_FILE` | `.ai-settings.json` | Path to encrypted settings file; use a mounted volume in Docker |

Add `AI_SETTINGS_FILE=/data/ai-settings.json` to `docker-compose-prod.yaml` and mount a volume.

## New Files

| File | Purpose |
|---|---|
| `src/lib/ai-settings.ts` | Server-side AES-256-GCM encrypt/decrypt + file-based store |
| `src/app/api/ai/settings/route.ts` | GET/POST/DELETE user AI settings |
| `src/app/api/ai/chat/route.ts` | Streaming chat Route Handler (Vercel AI SDK) |
| `src/components/AiChat.tsx` | Chat UI component (useChat hook, streaming, save-as-note) |
| `src/app/[locale]/settings/page.tsx` | Settings page (provider, model, API key) |

## Modified Files

| File | Change |
|---|---|
| `package.json` | Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `ollama-ai-provider` |
| `src/proxy.ts` | Pass `/api/ai/*` to Next.js route handlers (skip clann-server proxy) |
| `src/components/ResearchPage.tsx` | Add 🤖 AI button + `"ai"` mode panel |
| `src/components/Nav.tsx` | Add Settings link to user dropdown + mobile menu |
| `messages/{en,de,ga}.json` | `aiChat` and `settings` namespaces |

---

## Phases

### Phase 1 — Core Chat ✅ (this branch)
- Settings page with provider/key storage (encrypted file)
- `/api/ai/chat` Route Handler, streaming
- `AiChat` component with genealogy system prompt
- "Save as Note" on messages + full conversation export
- Supported providers: Anthropic, OpenAI, Ollama

### Phase 2a — Tree-Aware ✅ (done)
- "Include tree context" toggle (inject persons + relationships into prompt)
- "Research this person" shortcut from person detail page

### Phase 2b — SurrealDB Settings Storage ✅ (done)
- Migrated API key storage to clann-server SurrealDB (`user_ai_settings` table)
- Webapp encrypts keys with AES-256-GCM; clann-server stores opaque blobs
- No shared filesystem needed — works cleanly in Kubernetes multi-pod deployments
- Removed `AI_SETTINGS_FILE` volume from `docker-compose-prod.yaml`

### Phase 2 remaining (future)
- Prompt templates for common tasks (name research, record lookup)
- Conversation history persistence

### Phase 3 — Enhanced (future)
- Cross-reference suggestions ("this response mentions Ó'Briain — link to person?")
- Streaming citations / source suggestions
- Extended provider support (Google Gemini, Mistral)
- Note-as-context: "Dig deeper" button on a research note that launches the AI chat with the note content pre-injected as context
- Conversation history persistence: store chat sessions in SurrealDB via new clann-server endpoints (`chat_sessions`, `chat_messages` tables); allows resuming previous AI research sessions
