// Typed wrappers for the user-management service at http://localhost:8081.
// In the browser requests go via the Next.js /auth-api/* rewrite to avoid CORS.

const BASE =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:8081")
    : "/auth-api";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
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
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
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
  app_url?: string
): Promise<RegisterResponse> =>
  authRequest("/users", {
    method: "POST",
    body: JSON.stringify({ username, email, password, ...(app_url ? { app_url } : {}) }),
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
