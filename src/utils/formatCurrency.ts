export const formatCurrency = (
  amountInKobo: number,
  currency: string = 'NGN',
) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountInKobo / 100); // Convert kobo to naira
};
