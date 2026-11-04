const cases = require('./fixtures/budget-cases.json');
const { normalizePriceArgs, parseAmount, parseBudget } = require('../src/utils/budget');
const { normalizeVi } = require('../src/utils/vietnamese');

describe('parseBudget', () => {
  it('covers at least 40 phrasings', () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });

  it.each(cases.map(({ input, expected }) => [input, expected]))('reads "%s"', (input, expected) => {
    expect(parseBudget(normalizeVi(input))).toEqual(expected);
  });
});

describe('parseAmount', () => {
  it('reads the first money amount without a direction', () => {
    expect(parseAmount(normalizeVi('Mã TECH10 dùng cho đơn 6 triệu được không?'))).toBe(6000000);
    expect(parseAmount(normalizeVi('đơn 6.500.000 có dùng FREESHIP được không'))).toBe(6500000);
    expect(parseAmount(normalizeVi('đơn hàng 7 triệu rưỡi'))).toBe(7500000);
    expect(parseAmount(normalizeVi('mã GIAM200K dùng được không'))).toBeUndefined();
  });
});

describe('normalizePriceArgs', () => {
  it('reads values below 1000 as millions', () => {
    expect(normalizePriceArgs({ minPrice: 20 })).toEqual({ minPrice: 20000000 });
    expect(normalizePriceArgs({ maxPrice: 15.5 })).toEqual({ maxPrice: 15500000 });
  });

  it('keeps full amounts, swaps reversed ranges and drops invalid values', () => {
    expect(normalizePriceArgs({ minPrice: 20000000, maxPrice: 25000000 })).toEqual({ minPrice: 20000000, maxPrice: 25000000 });
    expect(normalizePriceArgs({ minPrice: 25000000, maxPrice: 20000000 })).toEqual({ minPrice: 20000000, maxPrice: 25000000 });
    expect(normalizePriceArgs({ minPrice: -1, maxPrice: 'abc' })).toEqual({});
    expect(normalizePriceArgs({ minPrice: 0, maxPrice: '18000000' })).toEqual({ maxPrice: 18000000 });
    expect(normalizePriceArgs()).toEqual({});
  });
});
