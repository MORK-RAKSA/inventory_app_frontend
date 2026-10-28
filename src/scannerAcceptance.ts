export type ScanBounds = { origin: { x: number; y: number }; size: { width: number; height: number } };
export function insideFrame(bounds: ScanBounds | undefined, frame: { x: number; y: number; width: number; height: number }): boolean {
  if (!bounds) return false;
  const { x, y } = bounds.origin;
  const { width, height } = bounds.size;
  return [x, y, width, height, frame.width, frame.height].every(Number.isFinite)
    && width > 0 && height > 0 && frame.width > 0 && frame.height > 0
    && x >= frame.x && y >= frame.y
    && x + width <= frame.x + frame.width && y + height <= frame.y + frame.height;
}
export function confirmRead(state: { code: string; n: number; at: number }, code: string, now: number): boolean {
  if (state.code !== code || now - state.at > 450) {
    state.code = code; state.n = 1; state.at = now;
    return false;
  }
  if (now - state.at < 60) return false;
  state.at = now;
  return ++state.n >= 2;
}
