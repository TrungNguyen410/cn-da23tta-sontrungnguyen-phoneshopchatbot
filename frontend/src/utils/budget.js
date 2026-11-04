// Copy of backend/src/utils/budget.js for the mock chatbot (frontend and backend share no code).
// Both copies run the same cases in budget-cases.json; change them together.

const MILLION = 1000000;
const UNITS = { trieu: MILLION, tr: MILLION, cu: MILLION, m: MILLION, k: 1000, nghin: 1000, ngan: 1000 };
const UNIT = '(trieu|tr|cu|m|k|nghin|ngan)(?![a-z])';
const NUMBER = '(\\d+(?:[.,]\\d+)?)';
const START = '(?<![a-z\\d.,])';
const HALF = '(\\s*ruoi(?![a-z]))?';

const RANGE_PATTERN = new RegExp(`${START}${NUMBER}\\s*(?:${UNIT})?\\s*(?:-|–|—|den|toi)\\s*${NUMBER}\\s*${UNIT}${HALF}`);
const AMOUNT_PATTERN = new RegExp(`${START}${NUMBER}\\s*${UNIT}${HALF}`);
const FULL_PATTERN = /(?<![a-z\d.,])(\d{1,3}(?:[.,]\d{3}){2,}|\d{6,})(?!\d)(?:\s*(?:d|dong|vnd)(?![a-z]))?/;

const BEFORE = [
  ['khong vuot qua', 'max'], ['khong qua', 'max'], ['toi da', 'max'], ['it hon', 'max'], ['nho hon', 'max'],
  ['be hon', 'max'], ['thap hon', 'max'], ['re hon', 'max'], ['duoi', 'max'],
  ['lon hon', 'min'], ['cao hon', 'min'], ['nhieu hon', 'min'], ['it nhat', 'min'], ['toi thieu', 'min'],
  ['tren', 'min'], ['ngoai', 'min'], ['hon', 'min'], ['tu', 'min'],
  ['xap xi', 'approx'], ['khoang', 'approx'], ['quanh', 'approx'], ['tam', 'approx'], ['chung', 'approx'], ['co', 'approx'],
];
const AFTER = [
  ['tro len', 'min'], ['do len', 'min'], ['tro di', 'min'],
  ['tro xuong', 'max'], ['do lai', 'max'], ['tro lai', 'max'], ['doi lai', 'max'],
];

export const normalizeVi = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd');

const toNumber = (digits) => Number(String(digits).replace(',', '.'));
const amountOf = (digits, unit, half) => Math.round((toNumber(digits) + (half ? 0.5 : 0)) * UNITS[unit]);

const prepare = (text) => String(text || '')
  .replace(/(duoi|tren|tam|khoang|hon|tu|quanh)(\d)/g, '$1 $2');

const findMoney = (text) => {
  const range = RANGE_PATTERN.exec(text);
  const single = AMOUNT_PATTERN.exec(text);
  const full = FULL_PATTERN.exec(text);
  const found = [
    range && {
      kind: 'range',
      index: range.index,
      end: range.index + range[0].length,
      low: amountOf(range[1], range[2] || range[4]),
      high: amountOf(range[3], range[4], range[5]),
    },
    single && {
      kind: 'single',
      index: single.index,
      end: single.index + single[0].length,
      value: amountOf(single[1], single[2], single[3]),
    },
    full && {
      kind: 'single',
      index: full.index,
      end: full.index + full[0].length,
      value: Number(full[1].replace(/[.,]/g, '')),
    },
  ].filter(Boolean);
  return found.sort((a, b) => a.index - b.index || (a.kind === 'range' ? -1 : 1))[0] || null;
};

const directionBefore = (prefix) => {
  const tail = prefix.replace(/[\s,:]+$/, '');
  const hit = BEFORE.find(([phrase]) => new RegExp(`(^|[^a-z])${phrase}$`).test(tail));
  return hit ? hit[1] : null;
};

const directionAfter = (suffix) => {
  const head = suffix.replace(/^[\s,.]+/, '');
  const hit = AFTER.find(([phrase]) => new RegExp(`^${phrase}($|[^a-z])`).test(head));
  return hit ? hit[1] : null;
};

// "trên 20 triệu" → { minPrice }, "dưới 20tr" → { maxPrice }, "15-20 củ" → both,
// "tầm 20 triệu" → 80%–100%, a bare "20 triệu" → 100%–110%.
export const parseBudget = (normalizedText) => {
  const text = prepare(normalizedText);
  const money = findMoney(text);
  if (!money) return {};
  if (money.kind === 'range') {
    return { minPrice: Math.min(money.low, money.high), maxPrice: Math.max(money.low, money.high) };
  }
  const direction = directionAfter(text.slice(money.end)) || directionBefore(text.slice(0, money.index));
  if (direction === 'min') return { minPrice: money.value };
  if (direction === 'max') return { maxPrice: money.value };
  if (direction === 'approx') return { minPrice: Math.round(money.value * 0.8), maxPrice: money.value };
  return { minPrice: money.value, maxPrice: Math.round(money.value * 1.1) };
};
