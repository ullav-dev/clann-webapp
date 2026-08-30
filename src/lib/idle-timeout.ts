/**
 * Idle session timeout resolution.
 *
 * The timeout is intentionally resolved at *runtime* (from `window.__ENV__`,
 * injected by the server layout from the plain `IDLE_TIMEOUT_MS` env var) rather
 * than only at build time, so operators can change it via `.env.prod` and a
 * container restart — no image rebuild — exactly like the backend URLs.
 *
 * `resolveIdleMs` also hardens against bad values: `""` → 0, `"abc"` → NaN and
 * negatives would otherwise make `setTimeout` fire immediately (instant logout).
 * Anything invalid falls back to the default, and a floor prevents an
 * accidentally tiny value from signing users out "after a very short time".
 */

/** Default idle timeout: 1 hour. */
export const DEFAULT_IDLE_MS = 3_600_000;

/**
 * Minimum accepted idle timeout: 2 minutes. Guards against a mis-set tiny value
 * (e.g. a leftover test value) logging users straight out. Still leaves room to
 * exercise the 60 s warning modal.
 */
export const MIN_IDLE_MS = 120_000;

export function resolveIdleMs(raw: unknown): number {
  const n =
    typeof raw === "number" ? raw :
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) :
    NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_IDLE_MS;
  return Math.max(n, MIN_IDLE_MS);
}
