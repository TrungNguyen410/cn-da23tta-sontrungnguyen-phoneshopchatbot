import { FiAlertTriangle, FiX } from 'react-icons/fi';
import AccessibleDialog from './AccessibleDialog';

export default function ConfirmModal({
  open,
  title = 'Xác nhận thao tác',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = true,
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <AccessibleDialog
      open={open}
      title={title}
      className="confirm-modal"
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
        <button className="icon-button modal-close" disabled={busy} onClick={onCancel} aria-label="Đóng"><FiX /></button>
        <div className={`confirm-icon ${danger ? 'danger' : ''}`}><FiAlertTriangle /></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-light" disabled={busy} onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
            {busy ? 'Đang xử lý…' : confirmText}
          </button>
        </div>
    </AccessibleDialog>
  );
}
