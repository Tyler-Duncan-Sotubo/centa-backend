export const formatCurrency = (
  amountInKobo: number,
  currency: string = 'NGN',
) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountInKobo); // Convert kobo to naira
};

export const toNaira = (value: number | null | undefined) =>
  value ? Math.round((value / 100) * 100) / 100 : 0;
