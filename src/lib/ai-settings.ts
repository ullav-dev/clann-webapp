import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type AiProvider = "anthropic" | "openai" | "google" | "mistral" | "ollama";

export interface AiSettings {
  provider: AiProvider;
  model: string;
  ollamaUrl?: string;
  encryptedKey?: string;
  iv?: string;
  authTag?: string;
}

// AES-256-GCM requires a 32-byte key; pad/truncate the env var to fit.
const ENC_KEY = Buffer.from(
  (process.env.SETTINGS_ENCRYPTION_KEY ?? "clann-dev-key-change-in-production!!")
    .padEnd(32, "0")
    .slice(0, 32),
);

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
