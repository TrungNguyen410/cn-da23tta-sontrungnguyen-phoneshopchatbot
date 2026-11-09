// Chart.js derives hover shades with a color parser that cannot read oklch(),
// so CSS color tokens are resolved to rgba() through a 1x1 canvas before use.
// Falls back to the original value when canvas is unavailable (e.g. jsdom tests).
let context;

const getContext = () => {
  if (context !== undefined) return context;
  try {
    context = document.createElement('canvas').getContext('2d', { willReadFrequently: true }) || null;
  } catch {
    context = null;
  }
  return context;
};

export const toCanvasColor = (value) => {
  if (!value) return value;
  const ctx = getContext();
  if (!ctx) return value;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = 'transparent';
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
};
