import { NextRequest, NextResponse } from "next/server";
import { encryptKey, usernameFromBearer, type AiProvider, type AiSettings } from "@/lib/ai-settings";

const API_BASE = process.env.API_URL ?? "http://localhost:3000";

/** Fetch full settings (including encrypted blob) from clann-server. */
async function fetchRemoteSettings(authHeader: string): Promise<AiSettings | null> {
  const res = await fetch(`${API_BASE}/api/ai-settings`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`clann-server error: ${res.status}`);
  const data = await res.json();
  return {
    provider: data.provider as AiProvider,
    model: data.model,
    ollamaUrl: data.ollama_url ?? undefined,
    encryptedKey: data.encrypted_key ?? undefined,
    iv: data.iv ?? undefined,
    authTag: data.auth_tag ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!usernameFromBearer(authHeader))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await fetchRemoteSettings(authHeader!);
    if (!settings) return NextResponse.json(null);
    // Never expose the encrypted key to the browser.
    const { encryptedKey, iv, authTag, ...safe } = settings;
    return NextResponse.json({ ...safe, hasKey: !!encryptedKey });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!usernameFromBearer(authHeader))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    provider: AiProvider;
    model: string;
    apiKey?: string;
    ollamaUrl?: string;
  };

  // Determine encrypted key fields: encrypt a new key if provided, otherwise
  // preserve the existing one stored in clann-server.
  let encFields: { encrypted_key?: string; iv?: string; auth_tag?: string } = {};
  if (body.apiKey) {
    const enc = encryptKey(body.apiKey);
    encFields = { encrypted_key: enc.encryptedKey, iv: enc.iv, auth_tag: enc.authTag };
  } else {
    try {
      const existing = await fetchRemoteSettings(authHeader!);
      if (existing?.encryptedKey) {
        encFields = {
          encrypted_key: existing.encryptedKey,
          iv: existing.iv,
          auth_tag: existing.authTag,
        };
      }
    } catch {
      // No existing settings — that's fine, key fields stay empty.
    }
  }

  const res = await fetch(`${API_BASE}/api/ai-settings`, {
    method: "PUT",
    headers: { Authorization: authHeader!, "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: body.provider,
      model: body.model,
      ollama_url: body.ollamaUrl ?? null,
      ...encFields,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to save settings" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!usernameFromBearer(authHeader))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${API_BASE}/api/ai-settings`, {
    method: "DELETE",
    headers: { Authorization: authHeader! },
  });

  if (!res.ok && res.status !== 204)
    return NextResponse.json({ error: "Failed to delete settings" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
