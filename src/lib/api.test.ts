import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rawId, setApiToken } from "./api";

describe("rawId", () => {
  it("strips the person: prefix", () => {
    expect(rawId("person:01jd4a8xyz")).toBe("01jd4a8xyz");
  });

  it("returns the string unchanged when there is no prefix", () => {
    expect(rawId("01jd4a8xyz")).toBe("01jd4a8xyz");
  });

  it("only strips the first person: prefix", () => {
    expect(rawId("person:person:abc")).toBe("person:abc");
  });
});

// ── setApiToken / Authorization header injection ──────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe("setApiToken", () => {
  beforeEach(() => {
    setApiToken(null); // reset between tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setApiToken(null);
  });

  it("sends no Authorization header when token is null", async () => {
    mockFetch(200, []);
    const { listPersons } = await import("./api");
    await listPersons();
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("sends Bearer token when setApiToken is called with a string", async () => {
    setApiToken("my-jwt-token");
    const fetchSpy = mockFetch(200, []);
    const { listPersons } = await import("./api");
    await listPersons();
    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-jwt-token");
  });

  it("stops sending Bearer token after setApiToken(null)", async () => {
    setApiToken("tok");
    setApiToken(null);
    const fetchSpy = mockFetch(200, []);
    const { listPersons } = await import("./api");
    await listPersons();
    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("updates the token when called multiple times", async () => {
    setApiToken("first-token");
    setApiToken("second-token");
    const fetchSpy = mockFetch(200, []);
    const { listPersons } = await import("./api");
    await listPersons();
    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer second-token");
  });
});
