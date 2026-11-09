import { afterEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  vi.resetModules();
  return import('./canvasColor');
};

describe('toCanvasColor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts a CSS color token to rgba() via the canvas pixel', async () => {
    const fakeContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      getImageData: vi.fn(() => ({ data: [214, 180, 102, 255] })),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext);
    const { toCanvasColor } = await loadModule();

    expect(toCanvasColor('oklch(80% 0.105 82)')).toBe('rgba(214, 180, 102, 1)');
    expect(fakeContext.fillStyle).toBe('oklch(80% 0.105 82)');
  });

  it('keeps the original value when canvas is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { toCanvasColor } = await loadModule();

    expect(toCanvasColor('oklch(80% 0.105 82)')).toBe('oklch(80% 0.105 82)');
    expect(toCanvasColor('')).toBe('');
  });
});
