export const normalizeWishlist = (items = [], limit = 100) =>
  [...new Set(items.filter((item) => typeof item === 'string' && item.trim()))].slice(0, limit);

export const mergeWishlists = (remoteItems = [], localItems = [], limit = 100) =>
  normalizeWishlist([...remoteItems, ...localItems], limit);

export const wishlistEquals = (left = [], right = []) =>
  left.length === right.length && left.every((item, index) => item === right[index]);
