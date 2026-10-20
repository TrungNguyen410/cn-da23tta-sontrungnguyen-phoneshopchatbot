export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const safeTotal = Number(totalPages);
  if (!Number.isFinite(safeTotal) || safeTotal <= 1) return null;
  const lastPage = Math.max(1, Math.trunc(safeTotal));
  const numericCurrent = Number(currentPage);
  const requestedPage = Number.isFinite(numericCurrent) ? Math.trunc(numericCurrent) : 1;
  const activePage = Math.min(Math.max(requestedPage, 1), lastPage);
  let start = Math.max(2, activePage - 2);
  let end = Math.min(lastPage - 1, activePage + 2);
  if (end - start < 4) {
    if (start === 2) end = Math.min(lastPage - 1, start + 4);
    if (end === lastPage - 1) start = Math.max(2, end - 4);
  }
  const pages = lastPage <= 7
    ? Array.from({ length: lastPage }, (_, index) => index + 1)
    : [
        1,
        ...(start > 2 ? ['start-ellipsis'] : []),
        ...Array.from({ length: end - start + 1 }, (_, index) => start + index),
        ...(end < lastPage - 1 ? ['end-ellipsis'] : []),
        lastPage,
      ];

  return (
    <nav className="pagination-wrap" aria-label="Phân trang">
      <button disabled={activePage <= 1} onClick={() => onPageChange(Math.max(1, activePage - 1))}>Trước</button>
      {pages.map((page) => (
        typeof page === 'number' ? (
          <button
            key={page}
            className={page === activePage ? 'active' : ''}
            aria-current={page === activePage ? 'page' : undefined}
            aria-label={`Trang ${page}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ) : <span key={page} aria-hidden="true">…</span>
      ))}
      <button disabled={activePage >= lastPage} onClick={() => onPageChange(Math.min(lastPage, activePage + 1))}>Sau</button>
    </nav>
  );
}
