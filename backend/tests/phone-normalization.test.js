const { normalizeVietnamesePhone } = require('../src/utils/phone');

describe('Vietnamese phone normalization', () => {
  test.each([
    ['0912345678', '0912345678'],
    ['+84 912 345 678', '0912345678'],
    ['84-912-345-678', '0912345678'],
    ['0912.345.678', '0912345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeVietnamesePhone(input)).toBe(expected);
  });

  test.each(['', '123456', '0212345678', '+84123456789', 'not-a-phone'])('rejects %s', (input) => {
    expect(normalizeVietnamesePhone(input)).toBeNull();
  });
});
