const buildRegex = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const parsePagination = (query) => {
  const page = Number(query.page || 0);
  const limit = Number(query.limit || query.pageSize || 0);
  if (!page || !limit) return null;
  return {
    page: Math.max(page, 1),
    limit: Math.min(Math.max(limit, 1), 100),
  };
};

module.exports = { buildRegex, parsePagination };
