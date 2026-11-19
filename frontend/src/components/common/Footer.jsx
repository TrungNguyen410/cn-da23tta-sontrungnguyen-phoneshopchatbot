import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import StoreBrand from './StoreBrand';

// Splits "PhoneShopAI" into an outlined part and a holographic "AI" for the big wordmark.
function Wordmark({ name }) {
  const hasAi = /\S+AI$/.test(name);
  return (
    <p className="footer-wordmark" aria-hidden="true">
      {hasAi ? <>{name.slice(0, -2)}<b>AI</b></> : name}
    </p>
  );
}

export default function Footer() {
  const settings = useStoreSettings();
  return (
    <footer className="site-footer">
      <div className="container">
        <Wordmark name={settings.storeName} />
      </div>
      <div className="container footer-grid footer-masthead">
        <div className="footer-about">
          <StoreBrand className="brand-light" />
          <p>Hệ thống bán lẻ điện thoại và phụ kiện chính hãng, có trợ lý AI tư vấn từ chọn máy đến hậu mãi.</p>
          <div className="social-links">
            <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FiFacebook /></a>
            <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram /></a>
            <a href={settings.youtube} target="_blank" rel="noreferrer" aria-label="Youtube"><FiYoutube /></a>
          </div>
        </div>
        <nav className="footer-column" aria-label="Mua sắm">
          <h2>Mua sắm</h2>
          <Link to="/products">Điện thoại</Link>
          <Link to="/accessories">Phụ kiện</Link>
          <Link to="/compare">So sánh</Link>
          <Link to="/reviews">Đánh giá</Link>
        </nav>
        <nav className="footer-column footer-link-rail" aria-label="Chính sách và hỗ trợ">
          <h2>Hỗ trợ</h2>
          <Link to="/order-lookup">Tra cứu đơn</Link>
          <Link to="/account?tab=orders">Đơn hàng của tôi</Link>
          <Link to="/policies/warranty">Bảo hành</Link>
          <Link to="/policies/returns">Đổi trả</Link>
          <Link to="/policies/shipping">Vận chuyển</Link>
          <Link to="/policies/payment">Thanh toán</Link>
        </nav>
        <div className="footer-column footer-contact-line">
          <h2>Liên hệ</h2>
          <span><FiMapPin /> {settings.address}</span>
          <a href={`tel:${settings.hotline.replace(/\s/g, '')}`}><FiPhone /> {settings.hotline}</a>
          <a href={`mailto:${settings.email}`}><FiMail /> {settings.email}</a>
          <Link to="/contact">Cửa hàng & liên hệ</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <span>© 2026 {settings.storeName}. Bảo lưu mọi quyền.</span>
          <span>Thanh toán: COD · Chuyển khoản VietQR</span>
        </div>
      </div>
    </footer>
  );
}
