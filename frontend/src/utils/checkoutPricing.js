export const calculateVoucherDiscount = (voucher, subtotal, shippingFee) => {
  if (!voucher || Number(subtotal) < Number(voucher.minOrder || 0)) return 0;
  if (voucher.type === 'percent') {
    return Math.min(
      (Number(subtotal) * Number(voucher.value)) / 100,
      Number(voucher.maxDiscount) || Infinity,
    );
  }
  if (voucher.type === 'fixed') return Math.min(Number(voucher.value), Number(subtotal));
  if (voucher.type === 'shipping') return Math.min(Number(voucher.value), Number(shippingFee));
  return 0;
};
