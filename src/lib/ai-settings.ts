import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type AiProvider = "anthropic" | "openai" | "ollama";

export interface AiSettings {
  provider: AiProvider;
  model: string;
  ollamaUrl?: string;
  encryptedKey?: string;
  iv?: string;
  authTag?: string;
}

type SettingsStore = Record<string, AiSettings>;

const SETTINGS_FILE =
  process.env.AI_SETTINGS_FILE ?? path.join(process.cwd(), ".ai-settings.json");

// AES-256-GCM requires a 32-byte key; pad/truncate the env var to fit.
const ENC_KEY = Buffer.from(
  (process.env.SETTINGS_ENCRYPTION_KEY ?? "clann-dev-key-change-in-production!!")
    .padEnd(32, "0")
    .slice(0, 32),
);

async function readStore(): Promise<SettingsStore> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as SettingsStore;
  } catch {
    return {};
  }
}

async function writeStore(store: SettingsStore): Promise<void> {
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function encryptKey(plaintext: string): { encryptedKey: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptKey(encryptedKey: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function getSettings(username: string): Promise<AiSettings | null> {
  const store = await readStore();
  return store[username] ?? null;
}

export async function saveSettings(username: string, settings: AiSettings): Promise<void> {
  const store = await readStore();
  store[username] = settings;
  await writeStore(store);
}

export async function deleteSettings(username: string): Promise<void> {
  const store = await readStore();
  delete store[username];
  await writeStore(store);
}

export async function getDecryptedApiKey(username: string): Promise<string | null> {
  const settings = await getSettings(username);
  if (!settings?.encryptedKey || !settings.iv || !settings.authTag) return null;
  try {
    return decryptKey(settings.encryptedKey, settings.iv, settings.authTag);
  } catch {
    return null;
  }
}

export function usernameFromBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return (payload.sub as string) || (payload.username as string) || null;
  } catch {
    return null;
  }
}
