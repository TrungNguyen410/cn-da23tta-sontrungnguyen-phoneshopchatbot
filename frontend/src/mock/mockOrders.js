import { mockProducts } from './mockProducts';

const makeItems = (start, count) =>
  mockProducts.slice(start, start + count).map((product, index) => ({
    id: product.id,
    productId: product.id,
    name: product.name,
    image: product.image,
    price: product.price,
    quantity: index + 1,
    type: 'product',
  }));

const rawOrders = [
  ['TP260601', 'user-customer', 'completed', 0, 1, '2026-06-01T09:12:00.000Z'],
  ['TP260528', 'user-customer', 'shipping', 4, 2, '2026-05-28T03:45:00.000Z'],
  ['TP260524', 'user-3', 'confirmed', 8, 1, '2026-05-24T11:20:00.000Z'],
  ['TP260519', 'user-4', 'pending', 12, 2, '2026-05-19T08:30:00.000Z'],
  ['TP260510', 'user-3', 'cancelled', 17, 1, '2026-05-10T02:10:00.000Z'],
];

export const mockOrders = rawOrders.map(([orderNumber, userId, status, start, count, createdAt], index) => {
  const items = makeItems(start, count);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 10000000 ? 0 : 30000;
  return {
    id: `order-${index + 1}`,
    orderNumber,
    userId,
    status,
    items,
    subtotal,
    shippingFee,
    discount: index === 1 ? 200000 : 0,
    total: subtotal + shippingFee - (index === 1 ? 200000 : 0),
    paymentMethod: ['cod', 'bank', 'momo', 'card'][index % 4],
    customer: {
      fullName: index < 2 ? 'Nguyễn Minh Anh' : index === 2 || index === 4 ? 'Trần Hoàng Nam' : 'Lê Thảo Vy',
      email: index < 2 ? 'user@gmail.com' : 'customer@example.com',
      phone: index < 2 ? '0911111111' : index === 3 ? '0934567890' : '0987654321',
      address: index < 2 ? '45 Lê Lợi, Quận 1, TP. Hồ Chí Minh' : 'Việt Nam',
    },
    createdAt,
    updatedAt: createdAt,
  };
});
