import { NextRequest, NextResponse } from "next/server";
import {
  getSettings,
  saveSettings,
  deleteSettings,
  encryptKey,
  usernameFromBearer,
  type AiProvider,
} from "@/lib/ai-settings";

export async function GET(req: NextRequest) {
  const username = usernameFromBearer(req.headers.get("authorization"));
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings(username);
  if (!settings) return NextResponse.json(null);

  // Never return the encrypted key to the client — only expose safe fields.
  const { encryptedKey, iv, authTag, ...safe } = settings;
  return NextResponse.json({ ...safe, hasKey: !!encryptedKey });
}

export async function POST(req: NextRequest) {
  const username = usernameFromBearer(req.headers.get("authorization"));
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    provider: AiProvider;
    model: string;
    apiKey?: string;
    ollamaUrl?: string;
  };

  const existing = await getSettings(username);

  // Encrypt a newly-provided key; otherwise preserve the existing encrypted key.
  let encFields: { encryptedKey?: string; iv?: string; authTag?: string } = {};
  if (body.apiKey) {
    encFields = encryptKey(body.apiKey);
  } else if (existing?.encryptedKey) {
    encFields = {
      encryptedKey: existing.encryptedKey,
      iv: existing.iv,
      authTag: existing.authTag,
    };
  }

  await saveSettings(username, {
    provider: body.provider,
    model: body.model,
    ollamaUrl: body.ollamaUrl,
    ...encFields,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const username = usernameFromBearer(req.headers.get("authorization"));
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteSettings(username);
  return NextResponse.json({ ok: true });
}
