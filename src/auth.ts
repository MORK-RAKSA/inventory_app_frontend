import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const VERCEL_BACKEND_API = "https://inventoryappbackend.vercel.app/api";

function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return VERCEL_BACKEND_API;
  if (trimmed === "/api" || trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

function getCandidateBases(): string[] {
  const list: string[] = [];
  if (process.env.EXPO_PUBLIC_API_URL) {
    list.push(normalizeApiBase(process.env.EXPO_PUBLIC_API_URL));
  }
  // Primary production Vercel backend
  list.push(VERCEL_BACKEND_API);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      list.push("http://localhost:8080/api");
      list.push("/api");
    } else {
      list.push("/api");
      if (hostname.includes("-8081.")) {
        list.push(`${protocol}//${hostname.replace("-8081.", "-8080.")}/api`);
      } else if (hostname) {
        list.push(`${protocol}//${hostname}:8080/api`);
      }
    }
  }
  list.push("http://localhost:8080/api");
  return [...new Set(list)];
}

let activeBase: string | null = null;

export function resolveApiBase(): string {
  return activeBase || getCandidateBases()[0];
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
      const res = await fetch(base + path, init);
      const ct = res.headers.get("content-type") || "";
      // If Metro (without proxy reload) or DevTunnels returned an HTML page instead of API response, try next base
      if (ct.includes("text/html")) {
        continue;
      }
      activeBase = base;
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Cannot connect to backend server (port 8080)");
}

const KEY = "retailflow_session_v1";
type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  username: string;
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
  const r = await apiFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok)
    throw new Error(
      r.status === 401
        ? "Incorrect username or password"
        : `Authentication failed (${r.status})`,
    );
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
      const t = await request("/auth/refresh", {
        refreshToken: current.refreshToken,
      });
      await store(t);
      return true;
    } catch {
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
