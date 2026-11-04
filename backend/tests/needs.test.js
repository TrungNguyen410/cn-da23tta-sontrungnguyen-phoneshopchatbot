const { needDetail, parseNeed, rankByNeed } = require('../src/utils/needs');
const { normalizeVi } = require('../src/utils/vietnamese');

const need = (text) => parseNeed(normalizeVi(text));

describe('parseNeed', () => {
  it.each([
    ['máy pin trâu trên 20 triệu', 'battery'],
    ['điện thoại pin khỏe dùng lâu', 'battery'],
    ['máy chụp ảnh đẹp', 'camera'],
    ['quay phim, selfie tốt', 'camera'],
    ['điện thoại chơi game mượt', 'gaming'],
    ['máy hiệu năng mạnh', 'gaming'],
    ['màn hình lớn để xem phim', 'big_screen'],
    ['máy nhỏ gọn cầm vừa tay', 'compact'],
  ])('reads "%s" as %s', (text, expected) => {
    expect(need(text)).toBe(expected);
  });

  it('does not read budget words as a need', () => {
    expect(need('nhỏ hơn 20 củ')).toBeNull();
    expect(need('điện thoại trên 20 triệu')).toBeNull();
  });
});

describe('rankByNeed', () => {
  const phones = [
    { id: 'a', battery: '4500 mAh', camera: '48MP camera system', ram: '8GB', screen: '6.3 inch OLED, 120Hz', price: 20000000 },
    { id: 'b', battery: '5340 mAh', camera: '76MP camera system', ram: '16GB', screen: '6.8 inch OLED, 120Hz', price: 25000000 },
    { id: 'c', battery: '4980 mAh', camera: '60MP camera system', ram: '16GB', screen: '6.6 inch OLED, 120Hz', price: 30000000 },
  ];
  const ids = (list) => list.map((item) => item.id);

  it('orders phones by the spec that matters for the need', () => {
    expect(ids(rankByNeed(phones, 'battery'))).toEqual(['b', 'c', 'a']);
    expect(ids(rankByNeed(phones, 'camera'))).toEqual(['b', 'c', 'a']);
    expect(ids(rankByNeed(phones, 'gaming'))).toEqual(['c', 'b', 'a']);
    expect(ids(rankByNeed(phones, 'big_screen'))).toEqual(['b', 'c', 'a']);
    expect(ids(rankByNeed(phones, 'compact'))).toEqual(['a', 'c', 'b']);
  });

  it('keeps the original order without a need and does not mutate the input', () => {
    expect(ids(rankByNeed(phones, null))).toEqual(['a', 'b', 'c']);
    rankByNeed(phones, 'battery');
    expect(ids(phones)).toEqual(['a', 'b', 'c']);
  });

  it('describes the spec behind a need', () => {
    expect(needDetail(phones[1], 'battery')).toBe('pin 5340 mAh');
    expect(needDetail(phones[1], 'camera')).toBe('camera 76MP camera system');
    expect(needDetail(phones[1], 'gaming')).toBe('RAM 16GB');
    expect(needDetail(phones[1], 'big_screen')).toBe('màn hình 6.8 inch OLED, 120Hz');
    expect(needDetail(phones[1], null)).toBe('');
  });
});
