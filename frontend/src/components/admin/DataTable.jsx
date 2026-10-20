import EmptyState from '../common/EmptyState';

export default function DataTable({ columns, rows, rowKey = 'id', emptyTitle = 'Chưa có dữ liệu' }) {
  if (!rows.length) return <EmptyState title={emptyTitle} description="Hãy thay đổi bộ lọc hoặc thêm dữ liệu mới." />;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.key} className={column.className}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => <td key={column.key} className={column.className}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
