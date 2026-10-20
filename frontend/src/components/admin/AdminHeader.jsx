import { useEffect, useState } from 'react';
import { FiBell, FiMenu, FiSearch, FiX } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { contactApi } from '../../api/contactApi';

const titles = {
  dashboard: 'Tổng quan hệ thống',
  products: 'Quản lý sản phẩm',
  accessories: 'Quản lý phụ kiện',
  orders: 'Quản lý đơn hàng',
  customers: 'Quản lý khách hàng',
  contacts: 'Quản lý liên hệ hỗ trợ',
  reviews: 'Quản lý đánh giá',
  banners: 'Quản lý banner',
  vouchers: 'Quản lý voucher',
  categories: 'Quản lý danh mục',
  brands: 'Quản lý thương hiệu',
  settings: 'Cài đặt hệ thống',
};

const adminPages = Object.entries(titles).map(([path, label]) => ({
  label,
  to: `/admin/${path}`,
}));

const normalizeSearch = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replaceAll('đ', 'd')
  .replaceAll('Đ', 'D')
  .toLowerCase();

export default function AdminHeader({ onMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newContacts, setNewContacts] = useState(0);
  const page = location.pathname.split('/').pop();
  const searchTerm = normalizeSearch(search.trim());
  const visiblePages = adminPages.filter((item) => normalizeSearch(item.label).includes(searchTerm));
  const notifications = [
    ...(newContacts ? [{ label: `${newContacts} yêu cầu liên hệ mới cần xử lý`, to: '/admin/contacts' }] : []),
    { label: 'Kiểm tra các đơn hàng đang chờ xác nhận', to: '/admin/orders' },
    { label: 'Duyệt các đánh giá mới từ khách hàng', to: '/admin/reviews' },
    { label: 'Theo dõi sản phẩm có tồn kho thấp', to: '/admin/products' },
  ];

  useEffect(() => {
    const load = () => contactApi.getAllAdmin()
      .then((items) => setNewContacts(items.filter((item) => item.status === 'new').length))
      .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('contact-updated', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('contact-updated', load);
    };
  }, []);

  const toggleSearch = () => {
    setSearchOpen((current) => !current);
    setNotificationOpen(false);
  };
  const toggleNotifications = () => {
    setNotificationOpen((current) => !current);
    setSearchOpen(false);
  };

  return (
    <header className="admin-header">
      <div>
        <button className="admin-menu-button" onClick={onMenu}><FiMenu /></button>
        <div><small>TechPhone Admin</small><h1>{titles[page] || 'Quản trị'}</h1></div>
      </div>
      <div className="admin-header-actions">
        <button className="admin-search-button" onClick={toggleSearch} aria-label="Tìm trang quản trị" aria-expanded={searchOpen}><FiSearch /></button>
        <button className="notification-button" onClick={toggleNotifications} aria-label={`Xem thông báo${newContacts ? `, ${newContacts} liên hệ mới` : ''}`} aria-expanded={notificationOpen}><FiBell />{newContacts > 0 && <span>{newContacts}</span>}</button>
        <div className="admin-profile"><div>{user?.fullName?.charAt(0)}</div><span><strong>{user?.fullName}</strong><small>Quản trị viên</small></span></div>
        {searchOpen && (
          <div className="admin-header-popover admin-search-popover">
            <div className="admin-popover-input"><FiSearch /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trang quản trị..." /><button onClick={() => setSearchOpen(false)} aria-label="Đóng"><FiX /></button></div>
            <div className="admin-popover-list">
              {visiblePages.length
                ? visiblePages.map((item) => <button key={item.to} onClick={() => { navigate(item.to); setSearchOpen(false); setSearch(''); }}>{item.label}</button>)
                : <p>Không tìm thấy trang phù hợp.</p>}
            </div>
          </div>
        )}
        {notificationOpen && (
          <div className="admin-header-popover notification-popover">
            <div className="admin-popover-title"><strong>Thông báo</strong><button onClick={() => setNotificationOpen(false)} aria-label="Đóng"><FiX /></button></div>
            {notifications.map((item) => <Link key={item.to} to={item.to} onClick={() => setNotificationOpen(false)}>{item.label}</Link>)}
          </div>
        )}
      </div>
    </header>
  );
}
