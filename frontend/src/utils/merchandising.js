const activeAndAvailable = (item) => item.status === 'active' && item.stock > 0;

export const bestSellers = (items, limit = 8) =>
  [...items]
    .filter(activeAndAvailable)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);

export const bestDeals = (items, limit = 8) =>
  [...items]
    .filter((item) =>
      activeAndAvailable(item)
      && item.oldPrice > item.price
      && item.discountPercent >= 10)
    .sort((a, b) => {
      const savingDifference = (b.oldPrice - b.price) - (a.oldPrice - a.price);
      return savingDifference || b.discountPercent - a.discountPercent;
    })
    .slice(0, limit);

export const featuredAccessories = (items, limit = 8) => {
  const eligible = items.filter((item) =>
    activeAndAvailable(item) && item.rating >= 4.5 && item.sold >= 20);

  return [...eligible]
    .sort((a, b) => (b.rating * 100 + b.sold) - (a.rating * 100 + a.sold))
    .slice(0, limit);
};

const comparableValue = (value) => String(value || '').trim().toLowerCase();

export const productSimilarityScore = (anchor, candidate) => {
  if (!anchor || !candidate || anchor.id === candidate.id || !activeAndAvailable(candidate)) return -Infinity;
  let score = 0;
  if (comparableValue(anchor.brand) === comparableValue(candidate.brand)) score += 5;
  if (comparableValue(anchor.ram) === comparableValue(candidate.ram)) score += 2;
  if (comparableValue(anchor.storage) === comparableValue(candidate.storage)) score += 2;
  const anchorPrice = Number(anchor.price) || 0;
  const candidatePrice = Number(candidate.price) || 0;
  if (anchorPrice && Math.abs(candidatePrice - anchorPrice) / anchorPrice <= 0.2) score += 3;
  score += Math.min(Number(candidate.rating) || 0, 5) / 10;
  return score;
};

export const recommendProducts = (anchor, items, limit = 4) =>
  [...items]
    .map((item) => ({ item, score: productSimilarityScore(anchor, item) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => right.score - left.score || (right.item.sold || 0) - (left.item.sold || 0))
    .slice(0, limit)
    .map(({ item }) => item);

export const recommendFromHistory = (items, historyIds = [], limit = 4) => {
  const anchor = historyIds.map((id) => items.find((item) => item.id === id)).find(Boolean);
  return anchor ? recommendProducts(anchor, items, limit) : bestSellers(items, limit);
};

const universalAccessoryCategories = ['sạc', 'cáp sạc', 'pin dự phòng', 'bảo vệ màn hình', 'giá đỡ'];

export const recommendAccessories = (product, accessories, limit = 4) =>
  [...accessories]
    .filter(activeAndAvailable)
    .map((item) => {
      const category = comparableValue(item.category);
      const sameBrand = comparableValue(item.brand) === comparableValue(product?.brand);
      const universal = universalAccessoryCategories.includes(category);
      return {
        item,
        score: (sameBrand ? 4 : 0) + (universal ? 2 : 0) + (Number(item.rating) || 0) / 10,
      };
    })
    .filter(({ score }) => score >= 2)
    .sort((left, right) => right.score - left.score || (right.item.sold || 0) - (left.item.sold || 0))
    .slice(0, limit)
    .map(({ item }) => item);
