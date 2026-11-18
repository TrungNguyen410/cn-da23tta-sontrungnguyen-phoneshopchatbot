import { useCallback, useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiAward,
  FiPause,
  FiPercent,
  FiPlay,
  FiRefreshCcw,
  FiSend,
  FiShield,
  FiStar,
  FiTruck,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { accessoryApi } from '../api/accessoryApi';
import { bannerApi } from '../api/bannerApi';
import { productApi } from '../api/productApi';
import Loading from '../components/common/Loading';
import Phone3D, { phoneTone } from '../components/common/Phone3D';
import RobotMascot from '../components/chat/RobotMascot';
import EmptyState from '../components/common/EmptyState';
import CategoryCarousel from '../components/home/CategoryCarousel';
import ProductGrid from '../components/product/ProductGrid';
import PersonalizedRecommendations from '../components/product/PersonalizedRecommendations';
import { brandShowcase } from '../utils/brandShowcase';
import { bestDeals, bestSellers, featuredAccessories } from '../utils/merchandising';
import { openAssistant } from '../utils/assistant';
import { formatCurrency } from '../utils/formatCurrency';

const ASK_PLACEHOLDER = 'Máy chụp ảnh đẹp dưới 15 triệu?';
const ASK_SUGGESTIONS = ['Máy nào pin trâu nhất?', 'Điện thoại chơi game mượt', 'Có mã giảm giá nào không?'];

// Paints the second half of a banner title with the holographic gradient.
function HoloTitle({ text = '' }) {
  const words = String(text).trim().split(/\s+/);
  if (words.length < 2) return <span className="holo-text">{text}</span>;
  const split = Math.floor(words.length / 2);
  return <>{words.slice(0, split).join(' ')} <span className="holo-text">{words.slice(split).join(' ')}</span></>;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerInteractionPaused, setBannerInteractionPaused] = useState(false);
  const [bannerUserPaused, setBannerUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHomeData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, accessoryData, bannerData] = await Promise.all([
        productApi.getAll(),
        accessoryApi.getAll(),
        bannerApi.getAll(),
      ]);
      setProducts(productData.filter((item) => item.status === 'active'));
      setAccessories(accessoryData.filter((item) => item.status === 'active'));
      setBanners(bannerData.filter((item) => item.active));
    } catch (requestError) {
      setError(requestError.friendlyMessage || 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const change = (event) => setReducedMotion(event.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);

  const bannerPaused = bannerInteractionPaused || bannerUserPaused || reducedMotion;
  useEffect(() => {
    if (banners.length < 2 || bannerPaused) return undefined;
    const timer = setInterval(() => setActiveBanner((current) => (current + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [bannerPaused, banners.length]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <main className="page-shell">
        <EmptyState title="Không thể tải trang chủ" description={error} />
        <div className="home-retry"><button className="btn btn-primary" onClick={loadHomeData}>Thử lại</button></div>
      </main>
    );
  }

  const hotProducts = bestSellers(products);
  const saleProducts = bestDeals(products);
  const highlightedAccessories = featuredAccessories(accessories);
  const brands = brandShowcase(products, accessories);
  const spotlight = hotProducts[0];
  const topDeal = saleProducts[0];

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div
            className="hero-slider"
            onMouseEnter={() => setBannerInteractionPaused(true)}
            onMouseLeave={() => setBannerInteractionPaused(false)}
            onFocus={() => setBannerInteractionPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setBannerInteractionPaused(false);
            }}
          >
            <span className="hero-floor" aria-hidden="true" />
            {banners.map((banner, index) => (
              <Link
                to={banner.link}
                className={`hero-slide ${index === activeBanner ? 'active' : ''}`}
                key={banner.id}
                aria-hidden={index !== activeBanner || undefined}
                tabIndex={index === activeBanner ? undefined : -1}
                style={index === activeBanner
                  ? undefined
                  : { visibility: 'hidden', pointerEvents: 'none' }}
              >
                <img src={banner.image} alt={banner.title} />
                <span className="hero-mobile-copy hero-copy" aria-hidden="true">
                  <em className="hero-eyebrow">Ưu đãi {String(index + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}</em>
                  <strong><HoloTitle text={banner.title} /></strong>
                  {banner.description && <small>{banner.description}</small>}
                  <b>Khám phá ngay <FiArrowRight /></b>
                </span>
              </Link>
            ))}
            <div className="hero-stage" aria-hidden="true">
              <Phone3D className="hero-phone hero-phone-back" tone="pink" ry={150} rx={10} rz={8} layers={8} />
              <Phone3D className="hero-phone hero-phone-front" tone="violet" ry={-20} rx={8} rz={-4} layers={10} />
              <span className="hero-chip hero-chip-installment"><FiPercent /><span><b>Trả góp 0%</b><small>Kỳ hạn 6–12 tháng</small></span></span>
              {spotlight && (
                <span className="hero-chip hero-chip-product"><FiStar /><span><b>{spotlight.name}</b><small>từ {formatCurrency(spotlight.price)}</small></span></span>
              )}
              <span className="hero-chip hero-chip-warranty"><FiShield /><span><b>Bảo hành chính hãng</b><small>1 đổi 1 nếu lỗi nhà sản xuất</small></span></span>
            </div>
            <form
              className="hero-ask"
              onSubmit={(event) => {
                event.preventDefault();
                openAssistant(question || ASK_PLACEHOLDER);
                setQuestion('');
              }}
            >
              <div className="hero-ask-box">
                <RobotMascot />
                <input
                  value={question}
                  maxLength={1000}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`Hỏi AI: "${ASK_PLACEHOLDER}"`}
                  aria-label="Hỏi trợ lý AI"
                />
                <button type="submit" aria-label="Gửi câu hỏi cho trợ lý AI"><FiSend /></button>
              </div>
              <div className="hero-ask-chips">
                {ASK_SUGGESTIONS.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => openAssistant(suggestion)}>{suggestion}</button>
                ))}
              </div>
            </form>
            <div className="slider-dots">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  className={index === activeBanner ? 'active' : ''}
                  onClick={() => setActiveBanner(index)}
                  aria-label={`Xem banner ${index + 1}`}
                  aria-pressed={index === activeBanner}
                />
              ))}
            </div>
            {banners.length > 1 && (
              <button
                type="button"
                className="slider-pause-button"
                aria-label={bannerUserPaused ? 'Tiếp tục banner' : 'Tạm dừng banner'}
                onClick={() => setBannerUserPaused((current) => !current)}
              >
                {bannerUserPaused ? <FiPlay /> : <FiPause />}
              </button>
            )}
          </div>
        </div>
      </section>

      {brands.length > 0 && (
        <section className="container category-section">
          <div className="section-heading compact">
            <div><span>Mua sắm dễ dàng</span><h2>Danh mục nổi bật</h2></div>
          </div>
          <CategoryCarousel categories={brands} />
        </section>
      )}

      <section className="container product-section">
        <div className="section-heading">
          <div><span>Xếp hạng theo số lượng đã bán</span><h2>Sản phẩm bán chạy</h2></div>
          <Link to="/products">Xem tất cả <FiArrowRight /></Link>
        </div>
        <ProductGrid products={hotProducts} />
      </section>

      <PersonalizedRecommendations products={products} />

      <section className="sale-band">
        <div className="container">
          <div className="section-heading light">
            <div><span>Giảm từ 10%, ưu tiên số tiền tiết kiệm cao</span><h2>Ưu đãi tiết kiệm nhất</h2></div>
            <Link to="/products">Săn ưu đãi <FiArrowRight /></Link>
          </div>
          <div className={topDeal ? 'sale-layout' : undefined}>
            {topDeal && (
              <Link className="sale-feature" to={`/products/${topDeal.id}`}>
                <span className="sale-feature-tag">Tiết kiệm nhất</span>
                <strong>Giảm {formatCurrency(topDeal.oldPrice - topDeal.price)} cho {topDeal.name}</strong>
                <ul>
                  <li>Giá chỉ còn {formatCurrency(topDeal.price)}</li>
                  <li>Còn {topDeal.stock} sản phẩm</li>
                  <li>Thanh toán COD hoặc chuyển khoản VietQR</li>
                </ul>
                <b>Mua ngay <FiArrowRight /></b>
                <Phone3D tone={phoneTone(topDeal.id)} ry={-24} rx={6} rz={-8} layers={8} />
              </Link>
            )}
            <ProductGrid products={topDeal ? saleProducts.slice(1, 7) : saleProducts} />
          </div>
        </div>
      </section>

      <section className="container product-section" id="accessories">
        <div className="section-heading">
          <div><span>Điểm từ 4.5 sao và có ít nhất 20 lượt bán</span><h2>Phụ kiện nổi bật</h2></div>
          <Link to="/accessories">Xem tất cả <FiArrowRight /></Link>
        </div>
        <ProductGrid products={highlightedAccessories} type="accessory" />
      </section>

      <section className="store-story">
        <div className="container store-story-grid">
          <div>
            <span className="eyebrow">An tâm chọn PhoneShopAI</span>
            <h2>Công nghệ tốt hơn, trải nghiệm gần gũi hơn</h2>
            <p>
              Mỗi thiết bị đều được kiểm định kỹ, công khai tình trạng và đi kèm chính sách bảo hành
              minh bạch. Đội ngũ của chúng tôi luôn sẵn sàng giúp bạn chọn đúng sản phẩm.
            </p>
            <Link className="btn btn-light btn-lg" to="/contact">Tìm hiểu về chúng tôi</Link>
          </div>
          <div className="story-stats">
            <div><strong>Kiểm định</strong><span>Tình trạng sản phẩm</span></div>
            <div><strong>Minh bạch</strong><span>Giá và phí giao hàng</span></div>
            <div><strong>Toàn quốc</strong><span>Phạm vi giao nhận</span></div>
            <div><strong>Hậu mãi</strong><span>Tra cứu và bảo hành</span></div>
          </div>
        </div>
      </section>

      <section className="container benefit-grid">
        <div><FiShield /><span><strong>Sản phẩm kiểm định</strong><small>Chất lượng được cam kết</small></span></div>
        <div><FiTruck /><span><strong>Giao hàng toàn quốc</strong><small>Nhanh chóng, an toàn</small></span></div>
        <div><FiRefreshCcw /><span><strong>Đổi trả linh hoạt</strong><small>Trong vòng 30 ngày</small></span></div>
        <div><FiAward /><span><strong>Bảo hành tận tâm</strong><small>Hỗ trợ rõ ràng</small></span></div>
      </section>
    </>
  );
}
