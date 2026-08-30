import { describe, it, expect } from "vitest";
import { resolveIdleMs, DEFAULT_IDLE_MS, MIN_IDLE_MS } from "./idle-timeout";

describe("resolveIdleMs", () => {
  it("uses the default for unset/blank/invalid input", () => {
    expect(resolveIdleMs(undefined)).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs(null)).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs("")).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs("   ")).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs("abc")).toBe(DEFAULT_IDLE_MS);
  });

  it("rejects zero and negative values (would fire setTimeout immediately)", () => {
    expect(resolveIdleMs(0)).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs("0")).toBe(DEFAULT_IDLE_MS);
    expect(resolveIdleMs(-5000)).toBe(DEFAULT_IDLE_MS);
  });

  it("floors accidentally tiny values so users aren't logged out too fast", () => {
    expect(resolveIdleMs(70_000)).toBe(MIN_IDLE_MS);
    expect(resolveIdleMs("30000")).toBe(MIN_IDLE_MS);
  });

  it("accepts valid values as-is (string or number)", () => {
    expect(resolveIdleMs(3_600_000)).toBe(3_600_000);
    expect(resolveIdleMs("1800000")).toBe(1_800_000);
    expect(resolveIdleMs(MIN_IDLE_MS)).toBe(MIN_IDLE_MS);
  });
});
