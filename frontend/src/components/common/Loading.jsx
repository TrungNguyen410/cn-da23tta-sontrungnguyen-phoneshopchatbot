export default function Loading({ text = 'Đang tải dữ liệu...' }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner-border text-primary" />
      <span>{text}</span>
    </div>
  );
}
