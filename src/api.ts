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
}
export interface Sale {
  id: string;
  createdAt: string;
  rateSnapshot: number;
  totalUsd: number;
  totalKhr: number;
  paidCurrency?: string;
  status?: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceUsd: number;
    lineTotalUsd: number;
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

/** Error carrying the HTTP status so callers can react (e.g. 501 = server has no image storage). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData must set its own multipart boundary, so no JSON Content-Type for uploads.
  const isForm =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
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
  // Read as text first: 204/empty bodies (e.g. after DELETE) are valid and must not go through JSON.parse.
  const text = await response.text();
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
