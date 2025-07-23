import { parse, isValid, format } from 'date-fns';

/**
 * Normalize date-like fields in an object to `yyyy-MM-dd`.
 * Leaves invalid dates or placeholder strings unchanged.
 */
export function normalizeDateFields(
  data: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = { ...data };

  for (const key of Object.keys(result)) {
    if (!key.toLowerCase().includes('date')) continue;

    const val = result[key];
    if (typeof val !== 'string' || !val.trim()) continue;

    const trimmed = val.trim();

    // Leave placeholders like "_________" untouched
    if (trimmed.startsWith('_') || trimmed === 'N/A') continue;

    // Try multiple known formats
    const candidates = [
      parse(trimmed, 'yyyy-MM-dd', new Date()),
      parse(trimmed, 'MMMM d, yyyy', new Date()),
      parse(trimmed, 'MMM d, yyyy', new Date()),
      new Date(trimmed), // fallback parse
    ];

    const valid = candidates.find((d) => isValid(d));
    if (valid) {
      result[key] = format(valid, 'yyyy-MM-dd');
    }
  }

  return result;
}
