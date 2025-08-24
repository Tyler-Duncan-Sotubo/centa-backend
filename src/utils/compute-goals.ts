// Coerce DB numeric strings -> number; return null if empty/NaN
export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

// Clamp 0..100
export const clampPct = (x: number) => Math.min(100, Math.max(0, x));
