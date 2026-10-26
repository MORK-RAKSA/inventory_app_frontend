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

  // 1. WEB HOSTED (Vercel / Cloud): When running on web that is not localhost,
  // prioritize same-origin relative /api so requests proxy through the host directly,
  // avoiding cross-origin preflight / CORS issues completely.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      list.push("/api");
      if (origin) list.push(`${origin}/api`);
    }
  }

  // 2. PRIMARY ENV: When EXPO_PUBLIC_API_URL or API_URL is set, prioritize it
  if (envBase) {
    list.push(envBase);
  }

  // 3. CLOUD BACKEND FALLBACKS (Render & Vercel edge proxy)
  list.push("https://inventory-app-backend-5iet.onrender.com/api");
  list.push("https://inventoryappfrontend.vercel.app/api");

  // 4. WEB LOCALHOST / SAME-ORIGIN FALLBACKS
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;
    list.push("/api");
    if (origin) list.push(`${origin}/api`);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      list.push("http://localhost:8080/api");
    } else if (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      list.push(`${protocol}//${hostname}:8080/api`);
    } else if (hostname.includes("-8081.")) {
      list.push(`${protocol}//${hostname.replace("-8081.", "-8080.")}/api`);
    }
  }

  // 5. LOCAL DEV FALLBACK FOR EMULATORS & NATIVE
  list.push("http://localhost:8080/api");

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
  for (const base of candidates) {
    try {
      const url = buildUrl(base, path);
      const res = await fetch(url, init);
      // Skip server bad gateways (502, 503, 504), method not allowed (405 from static edge rewrites),
      // or 404 from non-matching static routes so we fall back to working backend URLs
      if (
        res.status === 404 ||
        res.status === 405 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504
      ) {
        if (activeBase === base) activeBase = null;
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
      lastError = err;
    }
  }
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const altPath = path.startsWith("/auth/") ? path.replace("/auth/", "/") : path;
    if (altPath !== path) {
      r = await apiFetch(altPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } else {
      throw err;
    }
  }

  if (!r.ok) {
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
