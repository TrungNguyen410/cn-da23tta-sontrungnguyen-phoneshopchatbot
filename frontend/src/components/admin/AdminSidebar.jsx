import {
  FiBox,
  FiGrid,
  FiHome,
  FiImage,
  FiLayers,
  FiMessageSquare,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiSmartphone,
  FiTag,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: FiGrid },
  { to: '/admin/products', label: 'Sản phẩm', icon: FiSmartphone },
  { to: '/admin/accessories', label: 'Phụ kiện', icon: FiShoppingBag },
  { to: '/admin/orders', label: 'Đơn hàng', icon: FiPackage },
  { to: '/admin/customers', label: 'Khách hàng', icon: FiUsers },
  { to: '/admin/contacts', label: 'Liên hệ hỗ trợ', icon: FiMessageSquare },
  { to: '/admin/reviews', label: 'Đánh giá', icon: FiMessageSquare },
  { to: '/admin/banners', label: 'Banner', icon: FiImage },
  { to: '/admin/vouchers', label: 'Voucher', icon: FiTag },
  { to: '/admin/categories', label: 'Danh mục', icon: FiLayers },
  { to: '/admin/brands', label: 'Thương hiệu', icon: FiBox },
  { to: '/admin/settings', label: 'Cài đặt', icon: FiSettings },
];

export default function AdminSidebar({ open, onClose }) {
  return (
    <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
      <div className="admin-brand">
        <span className="brand-mark">T</span>
        <span>TechPhone<small>ADMIN CENTER</small></span>
        <button onClick={onClose}><FiX /></button>
      </div>
      <nav>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}><Icon /><span>{label}</span></NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-bottom">
        <NavLink to="/"><FiHome /><span>Về cửa hàng</span></NavLink>
      </div>
    </aside>
  );
}
