import AsyncStorage from "@react-native-async-storage/async-storage";
import { showSignedOut } from "./authEvents";
import { accessToken, apiFetch, refresh } from "./auth";

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  priceUsd: number;
  stock: number;
  lowStockThreshold: number;
  originalCcy?: string;
  originalPrice?: number;
  imageUrl?: string | null;
  expirationDate?: string | null;
  updatedAtMs?: number;
  /** Wholesale unit price in USD; null/undefined = no wholesale price (falls back to retail). */
  wholesalePriceUsd?: number | null;
  wholesaleMinQty?: number;
  /** Enterprise wholesale packaging configuration */
  baseUnit?: string; // e.g. "Piece", "Can", "Bottle", "Box"
  caseUnitName?: string; // e.g. "Case", "Box", "Pack", "Carton"
  caseQty?: number; // e.g. 1 (box=1), 6 (pack=6), 12 (case=12), 24 (case=24)
  wholesalePricePerCaseUsd?: number | null;
}

export interface UomConfig {
  id: string;
  name: string;
  baseUnit: string;
  caseUnitName: string;
  caseQty: number;
  description?: string;
  createdAt?: number;
}

export const DEFAULT_UOM_CONFIGS: UomConfig[] = [
  { id: 'uom-case-24', name: 'Case of 24', baseUnit: 'Can', caseUnitName: 'Case', caseQty: 24, description: 'Standard 24-can beverage or grocery case' },
  { id: 'uom-case-12', name: 'Case of 12', baseUnit: 'Bottle', caseUnitName: 'Case', caseQty: 12, description: '12-bottle beverage, oil, or sauce case' },
  { id: 'uom-pack-6', name: 'Pack of 6', baseUnit: 'Can', caseUnitName: 'Pack', caseQty: 6, description: '6-can or 6-bottle shrink-wrap pack' },
  { id: 'uom-box-1', name: 'Box of 1', baseUnit: 'Piece', caseUnitName: 'Box', caseQty: 1, description: 'Single boxed retail piece' },
  { id: 'uom-carton-12', name: 'Carton of 12', baseUnit: 'Bottle', caseUnitName: 'Carton', caseQty: 12, description: '12-bottle or 12-can mixed carton' },
  { id: 'uom-half-case', name: 'Half Case', baseUnit: 'Can', caseUnitName: 'Case', caseQty: 12, description: 'Half of a standard case (12 units)' },
  { id: 'uom-dozen', name: 'Dozen', baseUnit: 'Piece', caseUnitName: 'Dozen', caseQty: 12, description: '12 individual pieces' },
  { id: 'uom-half-dozen', name: 'Half Dozen', baseUnit: 'Piece', caseUnitName: 'Dozen', caseQty: 6, description: '6 individual pieces' },
];

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email: string;
  active?: boolean;
  createdAt?: string;
}

export interface Sale {
  id: string;
  createdAt: string;
  rateSnapshot: number;
  totalUsd: number;
  totalKhr: number;
  paidCurrency?: string;
  priceTier?: 'RETAIL' | 'WHOLESALE' | string;
  status?: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceUsd: number;
    lineTotalUsd: number;
    uom?: string;
    uomQty?: number;
    cases?: number;
    loose?: number;
    caseUnitName?: string;
    baseUnit?: string;
    isWholesale?: boolean;
  }[];
}

export interface Settings {
  usdToKhr: number;
}

export interface BatchResult {
  created: number;
  restocked: number;
  products: Product[];
}

export const CLIENT_ID = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Clean up any legacy product cache from localStorage so state comes exclusively from DB
AsyncStorage.removeItem("easysell_local_store_v2").catch(() => {});
AsyncStorage.removeItem("easysell_local_store_v1").catch(() => {});

/** Error carrying the HTTP status so callers can react. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function rawApiRequest(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; text: string }> {
  const isForm =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    "X-Client-Id": CLIENT_ID,
    ...(init?.headers as Record<string, string> | undefined),
  };
  const execute = () =>
    apiFetch(path, {
      ...init,
      headers: {
        ...headers,
        ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
      },
    });
  let response = await execute();
  if (response.status === 401) {
    if (await refresh()) response = await execute();
    else showSignedOut();
  }
  const text = await response.text();
  return { response, text };
}

/**
 * Universal API client that talks directly to the backend database.
 * No stale mock products or ghost items are cached in localStorage.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { response, text } = await rawApiRequest(path, init);

  if (!response.ok) {
    let message = text;
    try {
      const body = JSON.parse(text);
      message = body.error || body.message || text;
    } catch {
      /* plain-text error */
    }
    throw new ApiError(
      message || `Request failed (${response.status})`,
      response.status,
    );
  }

  if (!text.trim()) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      "The server sent an unreadable response",
      response.status,
    );
  }
}
