const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const formatCurrency = (
  amount: number,
  currency: string = 'NGN',
  locale: string = 'en-NG',
) => {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  });

  let formatted = formatter.format(amount);

  // fallback for ICU quirks or missing glyphs
  const symbol = CURRENCY_SYMBOLS[currency];
  if (symbol && !formatted.includes(symbol)) {
    formatted = formatted.replace(currency, symbol);
  }

  return formatted;
};

export const toNaira = (value: number | null | undefined) =>
  value ? Math.round((value / 100) * 100) / 100 : 0;
