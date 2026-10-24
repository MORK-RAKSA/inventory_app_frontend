import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './auth';
import { canonicalBarcode } from './barcode';

export interface BarcodeProductInfo {
  barcode: string;
  name: string;
  category?: string;
  imageUrl?: string;
  isFallback?: boolean;
}

const BARCODE_DICT_KEY = 'easysell_barcode_dict_v1';
let memoryDict: Record<string, BarcodeProductInfo> | null = null;

async function getBarcodeDict(): Promise<Record<string, BarcodeProductInfo>> {
  if (memoryDict) return memoryDict;
  try {
    const raw = await AsyncStorage.getItem(BARCODE_DICT_KEY);
    if (raw) {
      memoryDict = JSON.parse(raw) || {};
      return memoryDict!;
    }
  } catch {
    /* ignore */
  }
  memoryDict = {};
  return memoryDict;
}

export async function rememberBarcodeInfo(
  barcode: string | null | undefined,
  info: { name: string; category?: string; imageUrl?: string | null }
): Promise<void> {
  const clean = (barcode || '').trim();
  if (!clean || !info.name?.trim()) return;
  try {
    const dict = await getBarcodeDict();
    dict[clean] = {
      barcode: clean,
      name: info.name.trim(),
      category: info.category || 'General',
      imageUrl: info.imageUrl || undefined,
      isFallback: false,
    };
    await AsyncStorage.setItem(BARCODE_DICT_KEY, JSON.stringify(dict));
  } catch {
    /* ignore */
  }
}

const OFF_ENDPOINTS = [
  'https://world.openfoodfacts.org/api/v0/product',
  'https://world.openproductsfacts.org/api/v0/product',
  'https://world.openbeautyfacts.org/api/v0/product',
  'https://world.openpetfoodfacts.org/api/v0/product',
];

function cleanCategory(raw?: string): string | undefined {
  if (!raw) return undefined;
  const first = String(raw).split(',')[0]?.trim();
  if (!first) return undefined;
  const stripped = first.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim();
  if (!stripped) return undefined;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function extractOffProduct(clean: string, p: any): BarcodeProductInfo | null {
  if (!p || typeof p !== 'object') return null;
  let rawName = (
    p.product_name ||
    p.product_name_en ||
    p.product_name_km ||
    p.product_name_th ||
    p.product_name_vi ||
    p.product_name_zh ||
    p.product_name_ja ||
    p.product_name_ko ||
    p.product_name_fr ||
    p.generic_name ||
    p.generic_name_en ||
    p.abbreviated_product_name ||
    ''
  ).trim();

  if (!rawName) {
    for (const k of Object.keys(p)) {
      if (k.startsWith('product_name_') && typeof p[k] === 'string' && p[k].trim()) {
        rawName = p[k].trim();
        break;
      }
    }
  }

  const brand = String(p.brands || '').split(',')[0]?.trim();
  const qtyLabel = String(p.quantity || '').trim();
  let name =
    rawName && brand && !rawName.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${rawName}`
      : rawName || brand;

  if (name && qtyLabel && !name.toLowerCase().includes(qtyLabel.toLowerCase())) {
    name = `${name} ${qtyLabel}`;
  }

  if (!name) return null;
  return {
    barcode: clean,
    name,
    category: cleanCategory(p.categories),
    imageUrl: p.image_front_small_url || p.image_url || p.image_front_url || undefined,
    isFallback: false,
  };
}

/**
 * Generates a clean, descriptive fallback product name from the barcode prefix
 * when an item is a local/custom product not yet indexed in global barcode databases.
 */
export function buildSmartBarcodeName(barcode: string): BarcodeProductInfo {
  const clean = barcode.trim();
  const shortCode = clean.length > 6 ? clean.slice(-6) : clean;
  let origin = 'Product';
  if (clean.startsWith('884')) origin = 'KH Product';
  else if (clean.startsWith('885')) origin = 'TH Product';
  else if (clean.startsWith('893')) origin = 'VN Product';
  else if (/^69\d/.test(clean)) origin = 'CN Product';
  else if (clean.startsWith('880')) origin = 'KR Product';
  else if (clean.startsWith('49') || clean.startsWith('45')) origin = 'JP Product';
  else if (clean.startsWith('888')) origin = 'SG Product';
  else if (clean.startsWith('955')) origin = 'MY Product';
  else if (clean.startsWith('899')) origin = 'ID Product';

  return {
    barcode: clean,
    name: `${origin} #${shortCode}`,
    category: 'General',
    isFallback: true,
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks up a retail barcode across:
 * 1. Local on-device barcode dictionary (instant 0ms)
 * 2. EasySell Backend multi-catalog lookup (/api/barcode-lookup/:code)
 * 3. OpenFoodFacts / OpenProductsFacts / OpenBeautyFacts / OpenPetFoodFacts (all language fields)
 * 4. UPCitemdb & Brocade.io open barcode databases
 * 5. Smart GS1 barcode fallback name if not in any online catalog
 */
export async function lookupBarcodeOnline(
  barcode: string,
  options?: { allowFallback?: boolean }
): Promise<BarcodeProductInfo | null> {
  const clean = canonicalBarcode(barcode);
  if (!clean) return null;
  const allowFallback = options?.allowFallback ?? true;

  // 1. Check local remembered dictionary first
  const dict = await getBarcodeDict();
  if (dict[clean] && dict[clean].name && !dict[clean].isFallback) {
    return dict[clean];
  }

  // 2. Query backend proxy + direct global databases in parallel
  const lookupTasks: Promise<BarcodeProductInfo | null>[] = [
    // Backend multi-source proxy (includes Go-UPC HTML scrape + server-side UPCitemdb/OFF)
    (async () => {
      try {
        const res = await apiFetch(`/barcode-lookup/${encodeURIComponent(clean)}`);
        if (!res.ok) return null;
        const d = await res.json();
        if (d && d.name) {
          return {
            barcode: clean,
            name: String(d.name).trim(),
            category: d.category || undefined,
            imageUrl: d.imageUrl || undefined,
            isFallback: false,
          };
        }
      } catch {
        /* ignore */
      }
      return null;
    })(),

    // Direct OpenFoodFacts / OpenProductsFacts / OpenBeautyFacts / OpenPetFoodFacts
    ...OFF_ENDPOINTS.map(async (baseUrl) => {
      const data = await fetchJsonWithTimeout(
        `${baseUrl}/${encodeURIComponent(clean)}.json`,
        4200
      );
      if (data?.status === 1 && data?.product) {
        return extractOffProduct(clean, data.product);
      }
      return null;
    }),

    // Direct Brocade.io
    (async () => {
      const d = await fetchJsonWithTimeout(
        `https://www.brocade.io/api/items/${encodeURIComponent(clean)}`,
        3800
      );
      if (d?.name) {
        const brand = String(d.brand_name || '').trim();
        const rawName = String(d.name).trim();
        const name =
          brand && !rawName.toLowerCase().includes(brand.toLowerCase())
            ? `${brand} ${rawName}`
            : rawName;
        return { barcode: clean, name, isFallback: false };
      }
      return null;
    })(),

    // Direct UPCitemdb
    (async () => {
      const d = await fetchJsonWithTimeout(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(clean)}`,
        3800
      );
      const item = d?.items?.[0];
      if (item?.title) {
        const title = String(item.title).trim();
        const brand = String(item.brand || '').trim();
        const name =
          brand && !title.toLowerCase().includes(brand.toLowerCase())
            ? `${brand} ${title}`
            : title;
        return {
          barcode: clean,
          name,
          category: cleanCategory(item.category),
          imageUrl: item.images?.[0] || undefined,
          isFallback: false,
        };
      }
      return null;
    })(),
  ];

  // Return as soon as the first non-null result arrives, or wait for all to settle
  const firstFound = await new Promise<BarcodeProductInfo | null>((resolve) => {
    let pendingCount = lookupTasks.length;
    let resolved = false;

    lookupTasks.forEach((task) => {
      task
        .then((result) => {
          if (!resolved && result && result.name) {
            resolved = true;
            resolve(result);
          }
        })
        .catch(() => {})
        .finally(() => {
          pendingCount -= 1;
          if (!resolved && pendingCount === 0) {
            resolve(null);
          }
        });
    });
  });

  if (firstFound) {
    void rememberBarcodeInfo(clean, firstFound);
    return firstFound;
  }

  if (allowFallback) {
    return buildSmartBarcodeName(clean);
  }
  return null;
}
