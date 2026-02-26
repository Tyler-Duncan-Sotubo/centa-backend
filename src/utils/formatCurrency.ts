const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

type FormatCurrencyOptions = {
  /**
   * When true, avoids relying on the currency glyph.
   * Useful for PDFs where the symbol might not render due to font issues.
   */
  safeTextCurrency?: boolean;

  /**
   * Choose what to use when safeTextCurrency is enabled.
   * - 'NGN' => "NGN 10,000.00"
   * - 'N'   => "N 10,000.00"
   */
  safePrefix?: 'NGN' | 'N';
};

export const formatCurrency = (
  amount: number,
  currency: string = 'NGN',
  locale: string = 'en-NG',
  options: FormatCurrencyOptions = {},
) => {
  const safeTextCurrency = options.safeTextCurrency ?? false;
  const safePrefix = options.safePrefix ?? 'NGN';

  // If we want safe output, format as a plain number and add prefix ourselves.
  if (safeTextCurrency) {
    const num = Number(amount ?? 0);
    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    const prefix = currency === 'NGN' ? safePrefix : currency;
    return `${prefix} ${formattedNumber}`;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  });

  let formatted = formatter.format(amount);

  // fallback for ICU quirks or missing symbol in output string
  const symbol = CURRENCY_SYMBOLS[currency];
  if (symbol && !formatted.includes(symbol)) {
    formatted = formatted.replace(currency, symbol);
  }

  return formatted;
};

export const toNaira = (value: number | null | undefined) =>
  value ? Math.round((value / 100) * 100) / 100 : 0;
