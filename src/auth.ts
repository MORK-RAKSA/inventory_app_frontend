import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Resolves the primary API base URL configured in the environment.
 * Supports EXPO_PUBLIC_API_URL (Expo standard), REACT_APP_API_URL, NEXT_PUBLIC_API_URL, and API_URL.
 */
export function getEnvApiUrl(): string | null {
  const envVal =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL;

  if (envVal && typeof envVal === "string" && envVal.trim()) {
    return normalizeApiBase(envVal.trim());
  }
  return null;
}

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed === "/api" || trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

function getCandidateBases(): string[] {
  const list: string[] = [];
  const envBase = getEnvApiUrl();

  // 1. WEB (Browser): ALWAYS prioritize relative same-origin /api first!
  // Whether running on localhost:8081 (Metro proxy middleware) or hosted on Vercel (vercel.json rewrite),
  // same-origin /api completely avoids browser CORS preflight (OPTIONS) 403 Forbidden errors.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    list.push("/api");
    if (window.location?.origin) {
      list.push(`${window.location.origin}/api`);
    }
  }

  // 2. PRIMARY ENV: When EXPO_PUBLIC_API_URL or API_URL is explicitly set
  if (envBase && !(Platform.OS !== "web" && !__DEV__ && /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/i.test(envBase))) {
    list.push(envBase);
  }

  // 3. CLOUD BACKEND (Render)
  list.push("https://inventory-app-backend-5iet.onrender.com/api");

  if (Platform.OS !== 'web') list.push('https://inventoryappfrontend.vercel.app/api');

  // 4. LOCAL BACKEND FALLBACKS (Port 8080)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      list.push("http://localhost:8080/api");
    } else if (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      list.push(`${protocol}//${hostname}:8080/api`);
    }
  }

  const filtered = list.filter(Boolean);
  return [...new Set(filtered.length ? filtered : ["/api"])];
}

let activeBase: string | null = null;

export function resolveApiBase(): string {
  return activeBase || getCandidateBases()[0] || "/api";
}

export function getApiBaseUrl(): string {
  return resolveApiBase();
}

function buildUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return `${b}${p.slice(4)}`;
  }
  return `${b}${p}`;
}

/**
 * Fetches against the backend API, automatically falling back across candidate URLs
 * if a tunnel/CORS "Load failed" error or HTML interstitial occurs on mobile browsers.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const candidates = activeBase
    ? [activeBase, ...getCandidateBases().filter((b) => b !== activeBase)]
    : getCandidateBases();

  let lastError: unknown = null;
  let lastResponse: Response | null = null;
  for (const base of candidates) {
    try {
      const url = buildUrl(base, path);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), path === "/auth/login" ? 60000 : 25000);
      let res: Response;
      try { res = await fetch(url, { ...init, signal: init?.signal || controller.signal }); }
      finally { clearTimeout(timer); }
      // Skip server bad gateways (502, 503, 504), loop detected (508), internal error (500),
      // method not allowed (405 from static edge rewrites), or 404 from non-matching static routes
      // so we fall back to working backend URLs
      if (
        res.status === 404 ||
        res.status === 405 ||
        res.status === 500 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504 ||
        res.status === 508
      ) {
        if (activeBase === base) activeBase = null;
        lastResponse = res;
        lastError = new Error(`Server at ${base} returned HTTP ${res.status}`);
        continue;
      }
      const ct = res.headers.get("content-type") || "";
      // If Metro (without proxy reload) or DevTunnels returned an HTML page instead of API response, try next base
      if (ct.includes("text/html")) {
        if (activeBase === base) activeBase = null;
        continue;
      }
      activeBase = base;
      return res;
    } catch (err) {
      if (activeBase === base) activeBase = null;
      lastError = new Error(`${base}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error
    ? lastError
    : new Error("Cannot connect to backend server");
}

const KEY = "retailflow_session_v1";
export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  username: string;
  role?: string;
  fullName?: string;
};
let current: Tokens | null = null;
let refreshing: Promise<boolean> | null = null;
const read = () =>
  Platform.OS === "web"
    ? AsyncStorage.getItem(KEY)
    : SecureStore.getItemAsync(KEY);
const write = (v: string) =>
  Platform.OS === "web"
    ? AsyncStorage.setItem(KEY, v)
    : SecureStore.setItemAsync(KEY, v);
const remove = () =>
  Platform.OS === "web"
    ? AsyncStorage.removeItem(KEY)
    : SecureStore.deleteItemAsync(KEY);
async function store(session: Tokens | null) {
  current = session;
  if (session) await write(JSON.stringify(session));
  else await remove();
}
async function request(path: string, body: object) {
  let r: Response;
  try {
    r = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Network request failed';
    throw new Error(`Cannot connect to sign-in server. ${detail}`);
  }

  if (!r.ok) {
    if (r.status >= 500) throw new Error(`Authentication server error (${r.status}). Please try again shortly. If it continues, check backend logs.`);
    let errMsg = "";
    try {
      const errJson = await r.json();
      errMsg = errJson.error || errJson.message || "";
    } catch (_) {}

    throw new Error(
      r.status === 401
        ? (errMsg || "Incorrect username or password")
        : (errMsg || `Authentication failed (${r.status})`),
    );
  }
  return r.json() as Promise<Tokens>;
}
export async function login(username: string, password: string) {
  const result = await request("/auth/login", { username, password });
  await store(result);
}
export async function restore() {
  try {
    const raw = await read();
    if (!raw) return false;
    current = JSON.parse(raw);
    return await refresh();
  } catch {
    await store(null);
    return false;
  }
}
export function accessToken() {
  return current?.accessToken ?? null;
}
export async function refresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      if (!current?.refreshToken) return false;
      if (current.accessToken?.startsWith("offline-")) {
        return true;
      }
      const t = await request("/auth/refresh", {
        refreshToken: current.refreshToken,
      });
      await store(t);
      return true;
    } catch {
      if (current?.accessToken?.startsWith("offline-")) {
        return true;
      }
      await store(null);
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
export function getUsername(): string {
  return current?.username ?? "";
}

export function getUserRole(): string {
  return current?.role ?? "ADMIN";
}

export function getFullName(): string {
  return current?.fullName ?? current?.username ?? "Admin";
}

export async function logout() {
  const old = current;
  await store(null);
  if (old) {
    await apiFetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: old.refreshToken }),
    }).catch(() => {});
  }
}
