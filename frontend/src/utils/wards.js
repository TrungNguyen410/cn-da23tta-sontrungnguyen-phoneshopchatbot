// Wards/communes after the 01/07/2025 reorganisation (no district level), keyed by province.
// The list is ~65 KB, so it is split into its own chunk and only loaded by address forms.
let wardsPromise = null;

export const loadWards = () => {
  wardsPromise ??= import('../data/vnWards.json')
    .then((module) => module.default)
    .catch((error) => {
      wardsPromise = null;
      throw error;
    });
  return wardsPromise;
};

const UNIT_PREFIX = /^(phường|xã|đặc khu)\s+/;
const fold = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .replace(/[’']/g, "'")
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
const withoutUnit = (value = '') => fold(value).replace(/^(phuong|xa|dac khu)\s+/, '');

// Returns the official name for what the customer typed ("sai gon" -> "Phường Sài Gòn"),
// or null when it is not a ward of that province. Ambiguous short names stay unresolved.
export const matchWard = (wards = [], value = '') => {
  const typed = fold(value);
  if (!typed) return null;
  const exact = wards.find((ward) => fold(ward) === typed);
  if (exact) return exact;
  if (UNIT_PREFIX.test(String(value).trim().toLowerCase())) return null;
  const candidates = wards.filter((ward) => withoutUnit(ward) === typed);
  return candidates.length === 1 ? candidates[0] : null;
};
