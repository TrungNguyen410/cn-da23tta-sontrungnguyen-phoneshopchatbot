import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getComparedProducts, toggleComparedProduct } from './commercePreferences';

describe('product comparison preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('preserves selection order and rejects a fifth item', () => {
    ['p1', 'p2', 'p3', 'p4'].forEach(toggleComparedProduct);
    expect(getComparedProducts()).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(toggleComparedProduct('p5')).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(getComparedProducts()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('removes an item without reordering the others', () => {
    ['p1', 'p2', 'p3'].forEach(toggleComparedProduct);
    toggleComparedProduct('p2');
    expect(getComparedProducts()).toEqual(['p1', 'p3']);
  });
});
