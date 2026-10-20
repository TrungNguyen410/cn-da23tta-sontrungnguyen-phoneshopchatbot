export default function LoadError({
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}) {
  return (
    <div className="empty-state load-error" role="alert">
      <h3>Không thể tải dữ liệu</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-primary" type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
