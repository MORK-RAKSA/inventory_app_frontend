export interface BarcodeProductInfo {
  barcode: string;
  name: string;
  category?: string;
  imageUrl?: string;
}

const ENDPOINTS = [
  'https://world.openfoodfacts.org/api/v2/product',
  'https://world.openproductsfacts.org/api/v2/product',
  'https://world.openbeautyfacts.org/api/v2/product',
];

function cleanCategory(raw?: string): string | undefined {
  if (!raw) return undefined;
  const first = raw.split(',')[0]?.trim();
  if (!first) return undefined;
  const stripped = first.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim();
  if (!stripped) return undefined;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Looks up a retail barcode (bottle, plastic bag, snack, household item, etc.)
 * using free OpenFoodFacts / OpenProductsFacts / OpenBeautyFacts APIs (no API key required).
 */
export async function lookupBarcodeOnline(barcode: string): Promise<BarcodeProductInfo | null> {
  const clean = barcode.trim();
  if (!clean || clean.length < 6) return null;

  for (const baseUrl of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `${baseUrl}/${encodeURIComponent(clean)}.json?fields=product_name,product_name_en,brands,categories,image_front_small_url,image_url`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = await res.json();
      if (data?.status === 1 && data?.product) {
        const p = data.product;
        const rawName = (p.product_name || p.product_name_en || '').trim();
        const brand = (p.brands || '').split(',')[0]?.trim();
        const name =
          rawName && brand && !rawName.toLowerCase().includes(brand.toLowerCase())
            ? `${brand} ${rawName}`
            : rawName || brand;

        if (name) {
          return {
            barcode: clean,
            name,
            category: cleanCategory(p.categories),
            imageUrl: p.image_front_small_url || p.image_url || undefined,
          };
        }
      }
    } catch {
      // Try next free database endpoint
    }
  }
  return null;
}
