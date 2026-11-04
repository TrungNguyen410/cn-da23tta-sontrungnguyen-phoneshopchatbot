import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/constants', async (importOriginal) => ({
  ...(await importOriginal()),
  USE_MOCK: true,
}));

import { chatApi } from './chatApi';
import { mockDb } from '../mock/mockDb';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const phone = (id, name, price, sold) => ({ id, name, price, sold, stock: 5, status: 'active', image: '' });

describe('mock chatbot budget', () => {
  beforeEach(() => {
    mockDb.reset();
    storage.set(STORAGE_KEYS.mockProducts, [
      phone('p-test', 'Điện thoại test', 2000, 500),
      phone('p-mid', 'Máy 18 triệu', 18990000, 100),
      phone('p-pixel', 'Pixel 9 Pro', 23990000, 60),
      phone('p-iphone', 'iPhone 16 Pro Max', 33990000, 90),
    ]);
  });

  const ask = (message) => chatApi.sendMessage({ message, visitorId: 'visitor-1' });
  const ids = (reply) => reply.message.products.map((item) => item.id);

  it.each(['điện thoại trên 20 triệu', 'điện thoại 20 triệu trở lên', 'ngoài 20 triệu', 'hơn 20 củ'])(
    'keeps "%s" to phones from 20.000.000đ',
    async (message) => {
      const reply = await ask(message);
      expect(ids(reply)).toEqual(['p-iphone', 'p-pixel']);
      expect(reply.message.content).toContain('từ 20.000.000đ trở lên');
    },
  );

  it('reads a range and says when nothing fits', async () => {
    expect(ids(await ask('từ 15 đến 20 triệu'))).toEqual(['p-mid']);
    const empty = await ask('điện thoại trên 50 triệu');
    expect(ids(empty)).toEqual([]);
    expect(empty.message.content).toContain('chưa tìm thấy');
  });
});
