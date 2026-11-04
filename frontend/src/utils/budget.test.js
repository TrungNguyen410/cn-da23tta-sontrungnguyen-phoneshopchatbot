import { describe, expect, it } from 'vitest';
import cases from './budget-cases.json';
import { normalizeVi, parseBudget } from './budget';

describe('parseBudget (same cases as the backend)', () => {
  it('covers at least 40 phrasings', () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });

  it.each(cases.map(({ input, expected }) => [input, expected]))('reads "%s"', (input, expected) => {
    expect(parseBudget(normalizeVi(input))).toEqual(expected);
  });
});

describe('normalizeVi', () => {
  it('strips Vietnamese diacritics and lowercases', () => {
    expect(normalizeVi('Điện thoại TRÊN 20 Triệu')).toBe('dien thoai tren 20 trieu');
  });
});
