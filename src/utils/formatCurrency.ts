export const formatCurrency = (amount: number, currency: string = 'NGN') => {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });

  let formatted = formatter.format(amount);

  // Force replace NGN with ₦ if Intl didn't render it
  if (currency === 'NGN') {
    formatted = formatted.replace('NGN', '₦');
  }

  return formatted;
};

export const toNaira = (value: number | null | undefined) =>
  value ? Math.round((value / 100) * 100) / 100 : 0;
