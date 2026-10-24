/**
 * Barcode accuracy helpers.
 *
 * The same retail product is often read with different "IDs":
 *  - UPC-A (12 digits) vs EAN-13 (the same code with a leading 0)
 *  - ITF-14 / GTIN-14 with a leading 0
 *  - Misreads where one digit is wrong (the GTIN check digit no longer matches)
 * These helpers normalise every read to ONE canonical code and reject misreads.
 */

const NUMERIC = /^\d+$/;

/** GTIN check-digit validation for 8 / 12 / 13 / 14 digit codes. */
export function isValidGtin(code: string): boolean {
  if (!NUMERIC.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  let sum = 0;
  // Weights 3,1,3,1… counted from the digit next to the check digit.
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w;
  }
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * One canonical form per product:
 * UPC-A (12) → EAN-13 (leading 0); GTIN-14 with leading 0 → EAN-13; everything else is trimmed as-is.
 */
export function canonicalBarcode(raw: string | null | undefined): string {
  const code = (raw ?? '').trim();
  if (!code) return '';
  if (NUMERIC.test(code)) {
    if (code.length === 12) return '0' + code;
    if (code.length === 14 && code.startsWith('0')) return code.slice(1);
  }
  return code;
}

/** True when two stored/scanned codes identify the same product. */
export function sameBarcode(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = canonicalBarcode(a).toLowerCase();
  const y = canonicalBarcode(b).toLowerCase();
  return !!x && x === y;
}

/** Finds a product by barcode regardless of UPC-A / EAN-13 / GTIN-14 representation. */
export function findByBarcode<T extends { barcode?: string | null }>(
  list: T[],
  code: string,
): T | undefined {
  return list.find((p) => sameBarcode(p.barcode, code));
}

/**
 * Symbology names differ between expo-camera (`ean13`, `upc_a`) and the web BarcodeDetector
 * (`ean_13`, `upc_a`). Normalise to a compact key.
 */
function typeKey(type?: string): string {
  return (type ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * A read of an EAN/UPC symbology whose check digit is wrong is a misread (blur, glare, partial
 * frame) — the user would otherwise get a *different* product ID for the same item.
 */
export function isLikelyMisread(raw: string, type?: string): boolean {
  const code = raw.trim();
  const key = typeKey(type);
  if (['ean13', 'ean8', 'upca', 'itf14'].includes(key)) {
    return NUMERIC.test(code) ? !isValidGtin(code) : true;
  }
  return false;
}
