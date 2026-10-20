import { useEffect, useRef, useState } from 'react';
import { FiMail, FiMessageCircle, FiPhone, FiX } from 'react-icons/fi';
import { useStoreSettings } from '../../hooks/useStoreSettings';

export default function SupportLauncher() {
  const settings = useStoreSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    panelRef.current?.querySelector('a')?.focus();
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <div className={`support-launcher ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="support-panel panel" ref={panelRef} aria-label="Kênh hỗ trợ">
          <div><strong>Liên hệ TechPhone</strong><button type="button" aria-label="Đóng hỗ trợ" onClick={() => setOpen(false)}><FiX /></button></div>
          <a href={`tel:${settings.hotline.replace(/\s/g, '')}`}><FiPhone /><span><strong>Gọi hotline</strong><small>{settings.hotline}</small></span></a>
          <a href={`mailto:${settings.email}`}><FiMail /><span><strong>Gửi email</strong><small>{settings.email}</small></span></a>
          {settings.zaloUrl && <a href={settings.zaloUrl} target="_blank" rel="noreferrer"><FiMessageCircle /><span><strong>Mở Zalo</strong><small>Kênh do cửa hàng cấu hình</small></span></a>}
        </div>
      )}
      <button
        type="button"
        className="support-toggle"
        aria-expanded={open}
        aria-label={open ? 'Đóng kênh hỗ trợ' : 'Mở kênh hỗ trợ'}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <FiX /> : <FiMessageCircle />}
        <span>{open ? 'Đóng' : 'Hỗ trợ'}</span>
      </button>
    </div>
  );
}
