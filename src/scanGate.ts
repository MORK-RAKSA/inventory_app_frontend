/**
 * Duplicate-scan gate.
 *
 * A barcode scanner re-reads the same barcode on every camera frame (~5–10 fps), so a naive
 * debounce still adds the item again every few hundred milliseconds while the product stays in
 * front of the lens — the "redundant stock" bug. The gate stays closed for as long as the same
 * code keeps arriving, and re-arms only after the barcode has been out of frame for `holdMs`.
 *
 * That is exactly how a cashier scans two identical items: remove the item (frames stop, gate
 * re-arms) and present it again.
 */

export interface ScanGate {
  /** Code that was last accepted, or '' when the gate is open. */
  code: string;
  /** Last time that code was seen on screen. */
  seenAt: number;
}

export function createScanGate(): ScanGate {
  return { code: '', seenAt: 0 };
}

/**
 * True when this frame must be ignored because the same barcode was already counted and is still
 * visible. Refreshes the gate while the barcode stays in frame so it cannot re-open mid-scan.
 */
export function isDuplicateScan(gate: ScanGate, code: string, now: number, holdMs = 600): boolean {
  if (gate.code === code) {
    if (now - gate.seenAt < holdMs) {
      gate.seenAt = now;
      return true;
    }
    gate.code = '';
  }
  return false;
}

/** Marks `code` as counted at `now`, closing the gate for repeated frames of the same barcode. */
export function rememberScan(gate: ScanGate, code: string, now: number): void {
  gate.code = code;
  gate.seenAt = now;
}
