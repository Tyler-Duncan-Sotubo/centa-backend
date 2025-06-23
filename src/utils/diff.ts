export function diffRecords<T extends Record<string, any>>(
  before: Partial<T>,
  after: Partial<T>,
  fields: (keyof T)[],
): Record<string, { before: any; after: any }> {
  const out: Record<string, { before: any; after: any }> = {};
  for (const f of fields) {
    if ((before[f] ?? null) !== (after[f] ?? null)) {
      out[f as string] = { before: before[f], after: after[f] };
    }
  }
  return out;
}
