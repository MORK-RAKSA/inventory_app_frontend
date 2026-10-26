/**
 * Duplicate-scan gate.
 *
 * A barcode scanner re-reads the same barcode on every camera frame (~5–10 fps).
 * If the user holds the same barcode in front of the lens without moving it,
 * the scanner must scan exactly ONCE and stay locked indefinitely.
 *
 * It will ONLY unlock after the user physically moves the item away (frames stop
 * seeing the code for at least `holdMs`), and presents it again.
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
 * Checks whether this frame should be ignored because the same barcode was already
 * accepted and is still actively visible in front of the lens.
 *
 * While the barcode remains in view, it continuously refreshes `gate.seenAt = now`,
 * keeping the gate LOCKED indefinitely (no repeat scan while held still).
 *
 * Unlocks ONLY after the barcode has been absent for at least `holdMs` (default 800ms).
 */
export function isDuplicateScan(gate: ScanGate, code: string, now: number, holdMs = 800): boolean {
  if (gate.code && gate.code === code) {
    if (now - gate.seenAt < holdMs) {
      // Still in front of the camera: keep gate locked and update timestamp
      gate.seenAt = now;
      return true;
    }
    // Barcode was moved out of frame for >= holdMs: reset gate to open
    gate.code = '';
  }
  return false;
}

/** Marks `code` as counted at `now`, locking the gate for this barcode until it leaves the frame. */
export function rememberScan(gate: ScanGate, code: string, now: number): void {
  gate.code = code;
  gate.seenAt = now;
}

/** Explicitly resets the scan gate (e.g. when scanner is closed or manual code is entered). */
export function resetScanGate(gate: ScanGate): void {
  gate.code = '';
  gate.seenAt = 0;
}

/** Compatibility alias for isDuplicateScan. */
export function holdScanGate(gate: ScanGate, code: string, now: number, holdMs = 800): boolean {
  return isDuplicateScan(gate, code, now, holdMs);
}
