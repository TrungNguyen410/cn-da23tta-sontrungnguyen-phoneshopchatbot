import {
  FiBookOpen,
  FiBox,
  FiCpu,
  FiGrid,
  FiHome,
  FiImage,
  FiLayers,
  FiMessageSquare,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiSmartphone,
  FiStar,
  FiTag,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import LogoMark from '../common/LogoMark';

const groups = [
  { title: 'Tổng quan', links: [{ to: '/admin/dashboard', label: 'Tổng quan', icon: FiGrid }] },
  {
    title: 'Bán hàng',
    links: [
      { to: '/admin/products', label: 'Sản phẩm', icon: FiSmartphone },
      { to: '/admin/accessories', label: 'Phụ kiện', icon: FiShoppingBag },
      { to: '/admin/orders', label: 'Đơn hàng', icon: FiPackage },
      { to: '/admin/customers', label: 'Khách hàng', icon: FiUsers },
      { to: '/admin/contacts', label: 'Liên hệ hỗ trợ', icon: FiMessageSquare },
      { to: '/admin/reviews', label: 'Đánh giá', icon: FiStar },
    ],
  },
  {
    title: 'Trí tuệ nhân tạo',
    links: [
      { to: '/admin/chatbot', label: 'Chatbot AI', icon: FiCpu },
      { to: '/admin/knowledge', label: 'Kho kiến thức AI', icon: FiBookOpen },
    ],
  },
  {
    title: 'Nội dung',
    links: [
      { to: '/admin/banners', label: 'Banner', icon: FiImage },
      { to: '/admin/vouchers', label: 'Voucher', icon: FiTag },
      { to: '/admin/categories', label: 'Danh mục', icon: FiLayers },
      { to: '/admin/brands', label: 'Thương hiệu', icon: FiBox },
      { to: '/admin/settings', label: 'Cài đặt', icon: FiSettings },
    ],
  },
];

export default function AdminSidebar({ open, onClose }) {
  return (
    <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
      <div className="admin-brand">
        <LogoMark className="brand-logo-mark" />
        <span>PhoneShop<em>AI</em><small>ADMIN CENTER</small></span>
        <button onClick={onClose}><FiX /></button>
      </div>
      <nav>
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.title}>
            <p className="admin-nav-title">{group.title}</p>
            {group.links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={onClose}><Icon /><span>{label}</span></NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-bottom">
        <NavLink to="/"><FiHome /><span>Về cửa hàng</span></NavLink>
      </div>
    </aside>
  );
}
