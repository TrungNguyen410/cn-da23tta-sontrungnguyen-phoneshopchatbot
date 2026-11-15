// Admin warns about any item still on sale whose stock has fallen to 10 or below.
export const LOW_STOCK_THRESHOLD = 10;

export const stockLevel = (stock) => {
  const value = Number(stock) || 0;
  if (value <= 0) return 'out';
  if (value <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
};
