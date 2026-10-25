// Lowercases and strips Vietnamese diacritics so "Sạc dự phòng" matches "sac du phong".
const normalizeVi = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd');

const tokenizeVi = (value) => normalizeVi(value)
  .split(/[^a-z0-9]+/)
  .filter((token) => token.length > 1);

module.exports = { normalizeVi, tokenizeVi };
