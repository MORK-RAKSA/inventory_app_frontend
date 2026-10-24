import { Platform } from 'react-native';

/**
 * Web barcode decoding (expo-camera on web only reads QR codes).
 *
 * Only real, standards-based decoders are used (native BarcodeDetector or the ZXing WASM polyfill).
 * They return the actual encoded value, so the same physical barcode always yields the same code.
 * There is deliberately NO heuristic/"guessing" fallback: an unreadable barcode returns null.
 */
const FORMATS = [
  'code_128',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_39',
  'code_93',
  'itf',
  'codabar',
  'qr_code',
  'data_matrix',
  'pdf417',
  'aztec',
];

let detectorPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('No document'));
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** BarcodeDetector instance on web (native on Chrome/Android, ZXing WASM polyfill elsewhere, e.g. iOS Safari). */
export async function getWebBarcodeDetector(): Promise<any | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    try {
      const win = window as any;
      if (win.BarcodeDetector) {
        const supported: string[] = (await win.BarcodeDetector.getSupportedFormats?.()) || [];
        if (supported.includes('ean_13') && supported.includes('code_128')) {
          return new win.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
        }
      }
      await loadScript('https://cdn.jsdelivr.net/npm/barcode-detector@2/dist/iife/pure.min.js');
      const ns = (window as any).BarcodeDetectionAPI;
      const Polyfill = ns?.BarcodeDetector || (window as any).BarcodeDetector;
      if (Polyfill) return new Polyfill({ formats: FORMATS });
    } catch {
      detectorPromise = null; // allow retry later (e.g. network came back)
    }
    return null;
  })();

  return detectorPromise;
}

/** Decode a barcode from a picked image. Returns null when no standard barcode can be read. */
export async function decodeBarcodeFromImageUri(uri: string): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = uri;
  });
  const detector = await getWebBarcodeDetector();
  if (!detector) return null;
  try {
    const results = await detector.detect(img);
    const value = results?.[0]?.rawValue;
    return value ? String(value).trim() : null;
  } catch {
    return null;
  }
}
