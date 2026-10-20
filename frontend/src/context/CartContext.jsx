import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { voucherApi } from '../api/voucherApi';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { trackEvent } from '../utils/analytics';
import { calculateVoucherDiscount } from '../utils/checkoutPricing';

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => storage.get(STORAGE_KEYS.cart, []));
  const [voucher, setVoucher] = useState(() => storage.get(STORAGE_KEYS.voucher));

  useEffect(() => storage.set(STORAGE_KEYS.cart, cartItems), [cartItems]);
  useEffect(() => {
    if (voucher) storage.set(STORAGE_KEYS.voucher, voucher);
    else storage.remove(STORAGE_KEYS.voucher);
  }, [voucher]);

  const addToCart = useCallback((product, quantity = 1, type = 'product') => {
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_type: type,
      quantity,
      value: Number(product.price) * quantity,
      currency: 'VND',
    });
    setCartItems((current) => {
      const maxStock = Number(product.stock) || 0;
      if (maxStock <= 0) return current;
      const safeQuantity = Math.min(quantity, maxStock);
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + safeQuantity, maxStock) }
            : item,
        );
      }
      return [
        ...current,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          oldPrice: product.oldPrice,
          stock: product.stock,
          quantity: safeQuantity,
          type,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback(
    (id) => setCartItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const setQuantity = useCallback(
    (id, quantity) =>
      setCartItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock || 99)) } : item,
        ),
      ),
    [],
  );
  const increaseQuantity = useCallback(
    (id) =>
      setCartItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock || 99) } : item,
        ),
      ),
    [],
  );
  const decreaseQuantity = useCallback(
    (id) =>
      setCartItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
        ),
      ),
    [],
  );
  const clearCart = useCallback(() => {
    setCartItems([]);
    setVoucher(null);
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const shippingFee = cartItems.length === 0 || subtotal >= 10000000 ? 0 : 30000;
  const discount = useMemo(
    () => calculateVoucherDiscount(voucher, subtotal, shippingFee),
    [shippingFee, subtotal, voucher],
  );
  const total = Math.max(0, subtotal + shippingFee - discount);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const applyVoucher = useCallback(
    async (code) => {
      const checkedVoucher = await voucherApi.check(code, subtotal);
      setVoucher(checkedVoucher);
      return checkedVoucher;
    },
    [subtotal],
  );
  const removeVoucher = useCallback(() => setVoucher(null), []);

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      setQuantity,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      applyVoucher,
      removeVoucher,
      voucher,
      subtotal,
      shippingFee,
      discount,
      total,
      cartCount,
    }),
    [
      addToCart,
      applyVoucher,
      cartCount,
      cartItems,
      clearCart,
      decreaseQuantity,
      discount,
      increaseQuantity,
      removeFromCart,
      removeVoucher,
      setQuantity,
      shippingFee,
      subtotal,
      total,
      voucher,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
