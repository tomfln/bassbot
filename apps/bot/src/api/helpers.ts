/** Clamp and round a numeric query param to prevent cache key pollution. */
export function clampParam(raw: string | undefined, fallback: number, max: number): number {
  const v = parseInt(raw ?? String(fallback)) || fallback
  return Math.min(Math.max(1, Math.ceil(v / 10) * 10), max)
}
