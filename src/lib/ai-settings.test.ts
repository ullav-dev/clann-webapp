import { describe, it, expect } from "vitest";
import { encryptKey, decryptKey, usernameFromBearer } from "./ai-settings";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

describe("encryptKey / decryptKey", () => {
  it("round-trips plaintext correctly", () => {
    const plaintext = "sk-ant-api-key-123456";
    const { encryptedKey, iv, authTag } = encryptKey(plaintext);
    expect(decryptKey(encryptedKey, iv, authTag)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const { encryptedKey, iv, authTag } = encryptKey("");
    expect(decryptKey(encryptedKey, iv, authTag)).toBe("");
  });

  it("produces a different IV on each call", () => {
    const { iv: iv1 } = encryptKey("same-plaintext");
    const { iv: iv2 } = encryptKey("same-plaintext");
    expect(iv1).not.toBe(iv2);
  });

  it("produces different ciphertext on each call (due to random IV)", () => {
    const { encryptedKey: e1 } = encryptKey("same-plaintext");
    const { encryptedKey: e2 } = encryptKey("same-plaintext");
    expect(e1).not.toBe(e2);
  });

  it("throws when the auth tag has been tampered with", () => {
    const { encryptedKey, iv } = encryptKey("secret");
    const badTag = Buffer.from("AAAAAAAAAAAAAAAA").toString("base64");
    expect(() => decryptKey(encryptedKey, iv, badTag)).toThrow();
  });
});

describe("usernameFromBearer", () => {
  it("returns sub claim from a valid Bearer token", () => {
    const token = makeToken({ sub: "user-abc", iat: 1 });
    expect(usernameFromBearer(`Bearer ${token}`)).toBe("user-abc");
  });

  it("returns username claim when sub is absent", () => {
    const token = makeToken({ username: "john.doe", iat: 1 });
    expect(usernameFromBearer(`Bearer ${token}`)).toBe("john.doe");
  });

  it("returns null for null header", () => {
    expect(usernameFromBearer(null)).toBeNull();
  });

  it("returns null when Bearer prefix is missing", () => {
    const token = makeToken({ sub: "user-abc" });
    expect(usernameFromBearer(token)).toBeNull();
  });

  it("returns null for a malformed token with no payload segment", () => {
    expect(usernameFromBearer("Bearer notavalidjwt")).toBeNull();
  });
});
