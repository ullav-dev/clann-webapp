// Typed wrappers for the user-management service at http://localhost:8081.
// In the browser requests go via the Next.js /auth-api/* rewrite to avoid CORS.

const BASE =
  typeof window === "undefined"
    ? (process.env.AUTH_URL ?? "http://localhost:8081")
    : "/auth-api";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  roles: string[];
  permissions: string[];
}

export interface RegisterResponse {
  message: string;
  confirmation_token: string;
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return undefined as T;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? data.message ?? data.detail ?? `HTTP ${res.status}`);
  return data as T;
}

export const login = (email: string, password: string): Promise<LoginResponse> =>
  authRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (
  username: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  app_url?: string
): Promise<RegisterResponse> =>
  authRequest("/users", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      ...(app_url ? { app_url } : {}),
    }),
  });

export const confirmEmail = (token: string): Promise<void> =>
  authRequest("/auth/confirm-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const requestPasswordReset = (email: string, app_url?: string): Promise<{ reset_token?: string; message?: string }> =>
  authRequest("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email, ...(app_url ? { app_url } : {}) }),
  });

export const confirmPasswordReset = (token: string, new_password: string): Promise<void> =>
  authRequest("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });

export interface UpdateProfilePayload {
  first_name?: string | null;
  last_name?: string | null;
  /** Pass null to clear; omit to leave unchanged. */
  avatar_url?: string | null;
}

export const updateProfile = (
  payload: UpdateProfilePayload,
  token: string
): Promise<AuthUser> =>
  authRequest("/users/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export async function gravatarUrl(email: string, size = 200): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

export const changePassword = (
  userId: string,
  newPassword: string,
  currentPassword: string | undefined,
  bearerToken: string
): Promise<void> =>
  authRequest(`/users/${userId}/password`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify({ new_password: newPassword, current_password: currentPassword }),
  });

// ── Subscription API ──────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  id: string;
  product: string;
  plan: string;
  status: string;
  seat_count: number;
  trial_end?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
}

export interface CheckoutResponse {
  url: string;
}

export const getSubscription = (product: string, token: string): Promise<SubscriptionInfo> =>
  authRequest(`/subscriptions/current?product=${encodeURIComponent(product)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createCheckoutSession = (
  provider: string,
  product: string,
  plan: string,
  seatCount: number,
  token: string
): Promise<CheckoutResponse> =>
  authRequest("/subscriptions/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ provider, product, plan, seat_count: seatCount }),
  });

export const createPortalSession = (token: string): Promise<CheckoutResponse> =>
  authRequest("/subscriptions/portal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Subscription decoding ─────────────────────────────────────────────────────

export type ClannTier = "individual" | "family" | "professional" | "enterprise" | null;

export interface ClannSubscription {
  tier: ClannTier;
  status: string | null;
  isActive: boolean;
}

/** Decode subscription info from a JWT without verifying the signature (browser UX only). */
export function decodeClannSubscription(token: string | null): ClannSubscription {
  const none: ClannSubscription = { tier: null, status: null, isActive: false };
  if (!token) return none;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const subs = payload.subscriptions as
      | Record<string, { tier?: string; status?: string }>
      | undefined;
    const clann = subs?.clann;
    if (!clann) return none;
    const status: string = clann.status ?? "";
    const isActive = status === "active" || status === "trialing";
    const tier = isActive ? ((clann.tier as ClannTier) ?? "individual") : null;
    return { tier, status: status || null, isActive };
  } catch {
    return none;
  }
}

/** Returns true when the user's subscription allows creating a team. */
export function canCreateTeam(token: string | null): boolean {
  const sub = decodeClannSubscription(token);
  return (
    sub.isActive &&
    (sub.tier === "family" || sub.tier === "professional" || sub.tier === "enterprise")
  );
}
