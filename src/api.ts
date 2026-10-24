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
  { id: 'uom-pack-6', name: 'Pack of 6', baseUnit: 'Bottle', caseUnitName: 'Pack', caseQty: 6, description: '6-pack shrink bundle or six-pack carton' },
  { id: 'uom-box-1', name: 'Box of 1', baseUnit: 'Piece', caseUnitName: 'Box', caseQty: 1, description: 'Single individual packaged box or piece' },
  { id: 'uom-carton-48', name: 'Carton of 48', baseUnit: 'Piece', caseUnitName: 'Carton', caseQty: 48, description: 'Bulk 48-unit master shipping carton' },
];
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

const LOCAL_STORE_KEY = "easysell_local_store_v2";
const LEGACY_FAKE_SEED_IDS = new Set([
  "p-water-1",
  "p-rice-2",
  "p-coffee-3",
  "p-snack-4",
]);

interface LocalStoreState {
  products: Record<string, Product>;
  deletedProductIds: string[];
  sales: Record<string, Sale>;
  deletedSaleIds: string[];
  usdToKhr: number;
}

let storeCache: LocalStoreState | null = null;
let loadStorePromise: Promise<LocalStoreState> | null = null;

async function getLocalStore(): Promise<LocalStoreState> {
  if (storeCache) return storeCache;
  if (loadStorePromise) return loadStorePromise;
  loadStorePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        storeCache = {
          products: parsed.products || {},
          deletedProductIds: Array.isArray(parsed.deletedProductIds)
            ? parsed.deletedProductIds
            : [],
          sales: parsed.sales || {},
          deletedSaleIds: Array.isArray(parsed.deletedSaleIds)
            ? parsed.deletedSaleIds
            : [],
          usdToKhr: Number(parsed.usdToKhr) || 4100,
        };
        // Strip any legacy fake seed IDs
        for (const fakeId of LEGACY_FAKE_SEED_IDS) {
          delete storeCache.products[fakeId];
        }
        return storeCache;
      }
    } catch {
      /* ignore */
    }
    storeCache = {
      products: {},
      deletedProductIds: [],
      sales: {},
      deletedSaleIds: [],
      usdToKhr: 4100,
    };
    return storeCache;
  })();
  return loadStorePromise;
}

async function saveLocalStore(state: LocalStoreState): Promise<void> {
  storeCache = state;
  try {
    await AsyncStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

let isSyncingColdStart = false;
async function warmServerStateInBackground(state: LocalStoreState) {
  if (isSyncingColdStart) return;
  const products = Object.values(state.products);
  const sales = Object.values(state.sales);
  if (
    products.length === 0 &&
    sales.length === 0 &&
    state.deletedProductIds.length === 0
  ) {
    return;
  }
  isSyncingColdStart = true;
  try {
    await apiFetch("/state/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CLIENT_ID,
        ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
      },
      body: JSON.stringify({
        products,
        deletedProductIds: state.deletedProductIds,
        sales,
        deletedSaleIds: state.deletedSaleIds,
        settings: { usdToKhr: state.usdToKhr },
      }),
    });
  } catch {
    /* ignore if server doesn't support /state/sync yet */
  } finally {
    isSyncingColdStart = false;
  }
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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const state = await getLocalStore();

  let { response, text } = await rawApiRequest(path, init);

  // If a mutation hit a cold Vercel serverless container (404 Product not found), warm the container & retry once
  if (
    response.status === 404 &&
    method !== "GET" &&
    Object.keys(state.products).length > 0
  ) {
    await warmServerStateInBackground(state);
    const retried = await rawApiRequest(path, init);
    response = retried.response;
    text = retried.text;
  }

  const serverUpdatedAt = response.headers.get("x-server-updated-at");
  if (serverUpdatedAt === "0") {
    void warmServerStateInBackground(state);
  }

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

  // Handle DELETE mutations in local store
  if (method === "DELETE") {
    const prodDel = path.match(/^\/products\/([^/]+)$/);
    if (prodDel) {
      const id = prodDel[1];
      delete state.products[id];
      if (!state.deletedProductIds.includes(id)) {
        state.deletedProductIds.push(id);
      }
      await saveLocalStore(state);
    }
    const saleDel = path.match(/^\/sales\/([^/]+)$/);
    if (saleDel) {
      const id = saleDel[1];
      delete state.sales[id];
      if (!state.deletedSaleIds.includes(id)) {
        state.deletedSaleIds.push(id);
      }
      await saveLocalStore(state);
    }
  }

  if (!text.trim()) return undefined as T;

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(
      "The server sent an unreadable response",
      response.status,
    );
  }

  // Reconcile GET /products & mutations with local persistent store
  if (method === "GET" && path.startsWith("/products") && Array.isArray(data)) {
    const deletedSet = new Set(state.deletedProductIds);
    const serverProducts = (data as Product[]).filter(
      (p) => p && p.id && !LEGACY_FAKE_SEED_IDS.has(p.id) && !deletedSet.has(p.id),
    );
    const serverIds = new Set(serverProducts.map((p) => p.id));
    let missingOnServer = false;

    for (const sp of serverProducts) {
      const local = state.products[sp.id];
      if (
        !local ||
        !local.updatedAtMs ||
        (sp.updatedAtMs && sp.updatedAtMs >= local.updatedAtMs)
      ) {
        state.products[sp.id] = {
          ...local,
          ...sp,
          imageUrl: sp.imageUrl || local?.imageUrl || null,
          updatedAtMs: sp.updatedAtMs || local?.updatedAtMs || Date.now(),
        };
      }
    }

    for (const lp of Object.values(state.products)) {
      if (!serverIds.has(lp.id) && !deletedSet.has(lp.id)) {
        missingOnServer = true;
      }
    }

    await saveLocalStore(state);
    if (missingOnServer) {
      void warmServerStateInBackground(state);
    }

    const qMatch = path.match(/[?&]q=([^&]+)/);
    const q = qMatch ? decodeURIComponent(qMatch[1]).trim().toLowerCase() : "";
    const mergedList = Object.values(state.products).filter(
      (p) => !deletedSet.has(p.id) && !LEGACY_FAKE_SEED_IDS.has(p.id),
    );
    const result = q
      ? mergedList.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            String(p.barcode || "").toLowerCase().includes(q) ||
            String(p.category || "").toLowerCase().includes(q),
        )
      : mergedList;
    return result as unknown as T;
  }

  // Single product created / updated / restocked
  if (
    (method === "POST" || method === "PUT" || method === "PATCH") &&
    path.startsWith("/products") &&
    data &&
    typeof data === "object" &&
    "id" in data
  ) {
    const prod = data as Product;
    state.products[prod.id] = {
      ...state.products[prod.id],
      ...prod,
      updatedAtMs: Date.now(),
    };
    await saveLocalStore(state);
  }

  // Batch commit
  if (
    method === "POST" &&
    path === "/inventory/batches/commit" &&
    data &&
    Array.isArray(data.products)
  ) {
    for (const prod of data.products as Product[]) {
      if (prod && prod.id) {
        state.products[prod.id] = {
          ...state.products[prod.id],
          ...prod,
          updatedAtMs: Date.now(),
        };
      }
    }
    await saveLocalStore(state);
  }

  // Reconcile GET /sales
  if (method === "GET" && path.startsWith("/sales") && Array.isArray(data)) {
    const deletedSet = new Set(state.deletedSaleIds);
    const serverSales = (data as Sale[]).filter(
      (s) => s && s.id && !deletedSet.has(s.id) && s.status !== "ARCHIVED",
    );
    const serverIds = new Set(serverSales.map((s) => s.id));
    let missingOnServer = false;

    for (const ss of serverSales) {
      state.sales[ss.id] = ss;
    }
    for (const ls of Object.values(state.sales)) {
      if (!serverIds.has(ls.id) && !deletedSet.has(ls.id)) {
        missingOnServer = true;
      }
    }

    await saveLocalStore(state);
    if (missingOnServer) {
      void warmServerStateInBackground(state);
    }

    const mergedSales = Object.values(state.sales)
      .filter((s) => !deletedSet.has(s.id) && s.status !== "ARCHIVED")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return mergedSales as unknown as T;
  }

  // Checkout completed
  if (
    method === "POST" &&
    path === "/sales/checkout" &&
    data &&
    typeof data === "object" &&
    "id" in data
  ) {
    const sale = data as Sale;
    state.sales[sale.id] = sale;
    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        const localProd = state.products[item.productId];
        if (localProd) {
          localProd.stock = Math.max(0, localProd.stock - item.quantity);
          localProd.updatedAtMs = Date.now();
        }
      }
    }
    await saveLocalStore(state);
  }

  // Settings rate
  if (path.startsWith("/settings") && data && typeof data.usdToKhr === "number") {
    if (method === "PUT") {
      state.usdToKhr = data.usdToKhr;
      await saveLocalStore(state);
    }
  }

  return data as T;
}
