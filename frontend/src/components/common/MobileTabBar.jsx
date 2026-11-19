import { FiGrid, FiHome, FiShoppingBag, FiUser } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { openAssistant } from '../../utils/assistant';
import RobotMascot from '../chat/RobotMascot';

// Bottom tab bar for phones (shown under 768px by holo.css). The middle orb opens the AI assistant.
export default function MobileTabBar() {
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();

  return (
    <nav className="mobile-tabbar" aria-label="Điều hướng nhanh">
      <NavLink to="/" end><FiHome aria-hidden="true" />Trang chủ</NavLink>
      <NavLink to="/products"><FiGrid aria-hidden="true" />Điện thoại</NavLink>
      <button type="button" className="mobile-tabbar-ai" aria-label="Hỏi trợ lý AI" onClick={() => openAssistant()}>
        <RobotMascot />
      </button>
      <NavLink to="/cart">
        <FiShoppingBag aria-hidden="true" />Giỏ hàng
        {cartCount > 0 && <b>{cartCount}</b>}
      </NavLink>
      <NavLink to={isAuthenticated ? '/account' : '/login'}><FiUser aria-hidden="true" />Tài khoản</NavLink>
    </nav>
  );
}
