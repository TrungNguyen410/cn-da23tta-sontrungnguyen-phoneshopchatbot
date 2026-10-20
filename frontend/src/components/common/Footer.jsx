import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import StoreBrand from './StoreBrand';

export default function Footer() {
  const settings = useStoreSettings();
  return (
    <footer className="site-footer">
      <div className="container footer-grid footer-masthead">
        <div className="footer-about">
          <StoreBrand className="brand-light" />
          <p>Hệ thống bán lẻ điện thoại và phụ kiện chính hãng, tận tâm từ tư vấn đến hậu mãi.</p>
          <div className="social-links">
            <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FiFacebook /></a>
            <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram /></a>
            <a href={settings.youtube} target="_blank" rel="noreferrer" aria-label="Youtube"><FiYoutube /></a>
          </div>
        </div>
        <nav className="footer-link-rail" aria-label="Chính sách và hỗ trợ">
          <Link to="/contact">Cửa hàng & liên hệ</Link>
          <Link to="/order-lookup">Tra cứu đơn</Link>
          <Link to="/account?tab=orders">Đơn hàng của tôi</Link>
          <Link to="/policies/warranty">Bảo hành</Link>
          <Link to="/policies/returns">Đổi trả</Link>
          <Link to="/policies/shipping">Vận chuyển</Link>
          <Link to="/policies/payment">Thanh toán</Link>
        </nav>
        <div className="footer-contact-line">
          <span><FiMapPin /> {settings.address}</span>
          <a href={`tel:${settings.hotline.replace(/\s/g, '')}`}><FiPhone /> {settings.hotline}</a>
          <a href={`mailto:${settings.email}`}><FiMail /> {settings.email}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">© 2026 {settings.storeName}. Bảo lưu mọi quyền.</div>
      </div>
    </footer>
  );
}
