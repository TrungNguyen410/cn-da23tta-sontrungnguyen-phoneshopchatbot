import { useEffect, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function AccessibleDialog({
  open,
  title,
  onClose,
  children,
  initialFocusRef,
  className = '',
  id,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    previousFocusRef.current = document.activeElement;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    const initialFocus = initialFocusRef?.current || dialog.querySelector(focusableSelector);
    initialFocus?.focus();

    return () => {
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      previousFocusRef.current?.focus?.();
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCloseRef.current?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll(focusableSelector)];
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      aria-label={title}
      aria-modal="true"
      className={`accessible-dialog ${className}`.trim()}
      id={id}
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current?.();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < bounds.left
          || event.clientX > bounds.right
          || event.clientY < bounds.top
          || event.clientY > bounds.bottom;
        if (outside) onCloseRef.current?.();
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </dialog>
  );
}
