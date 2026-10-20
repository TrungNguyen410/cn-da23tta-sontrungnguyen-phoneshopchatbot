import { useEffect, useState } from 'react';
import {
  FiCheck,
  FiBarChart2,
  FiChevronRight,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiZap,
} from 'react-icons/fi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productApi } from '../api/productApi';
import { accessoryApi } from '../api/accessoryApi';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ProductGrid from '../components/product/ProductGrid';
import ProductReview from '../components/product/ProductReview';
import RecentlyViewed from '../components/product/RecentlyViewed';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatCurrency } from '../utils/formatCurrency';
import { recommendAccessories, recommendProducts } from '../utils/merchandising';
import { trackEvent } from '../utils/analytics';
import { getComparedProducts, recordRecentlyViewedProduct, toggleComparedProduct } from '../utils/commercePreferences';

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [compatibleAccessories, setCompatibleAccessories] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });

  const productStructuredData = product ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        image: [product.image, ...(product.images || [])].filter(Boolean),
        description: product.description,
        sku: product.id,
        brand: { '@type': 'Brand', name: product.brand },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: product.price,
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: new URL(`/products/${product.id}`, window.location.origin).href,
        },
        ...(reviewSummary.count > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewSummary.average.toFixed(1),
            reviewCount: reviewSummary.count,
          },
        } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: window.location.origin },
          { '@type': 'ListItem', position: 2, name: 'Điện thoại', item: new URL('/products', window.location.origin).href },
          { '@type': 'ListItem', position: 3, name: product.name },
        ],
      },
    ],
  } : null;

  usePageMeta({
    title: product?.name || 'Chi tiết điện thoại',
    description: product?.description || 'Thông tin, giá bán và ưu đãi điện thoại chính hãng tại TechPhone.',
    image: product?.image,
    canonicalPath: product ? `/products/${product.id}` : window.location.pathname,
    type: 'product',
    structuredData: productStructuredData,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([productApi.getById(id), productApi.getAll(), accessoryApi.getAll()])
      .then(([detail, products, accessories]) => {
        setProduct(detail);
        setSelectedImage(detail.images?.[0] || detail.image);
        setQuantity(detail.stock > 0 ? 1 : 0);
        setRelated(recommendProducts(detail, products, 4));
        setCompatibleAccessories(recommendAccessories(detail, accessories, 4));
        recordRecentlyViewedProduct(detail.id);
        trackEvent('view_item', {
          item_id: detail.id,
          item_type: 'product',
          value: detail.price,
          currency: 'VND',
        });
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!product) return <EmptyState title="Không tìm thấy sản phẩm" description="Sản phẩm có thể đã ngừng kinh doanh." actionLabel="Xem sản phẩm khác" actionTo="/products" />;

  const requireLogin = () => navigate('/login', { state: { from: location } });
  const isOutOfStock = product.status !== 'active' || product.stock <= 0;
  const galleryImages = [...new Set([product.image, ...(product.images || [])].filter(Boolean))].slice(0, 5);
  const isCompared = getComparedProducts().includes(product.id);
  const toggleCompare = () => {
    const before = getComparedProducts();
    const next = toggleComparedProduct(product.id);
    if (!before.includes(product.id) && !next.includes(product.id)) {
      toast.info('Danh sách so sánh đã đủ 4 sản phẩm. Hãy bỏ một sản phẩm trước.');
      return;
    }
    toast.info(next.includes(product.id) ? `Đã thêm vào so sánh (${next.length}/4)` : 'Đã bỏ khỏi danh sách so sánh');
  };
  const add = () => {
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    addToCart(product, quantity);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
  };
  const buyNow = () => {
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    if (!isAuthenticated) return requireLogin();
    addToCart(product, quantity);
    navigate('/checkout');
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="breadcrumbs"><Link to="/">Trang chủ</Link><FiChevronRight /><Link to="/products">Điện thoại</Link><FiChevronRight /><span>{product.name}</span></nav>
        <section className="detail-grid">
          <div className="gallery">
            <div className="main-image"><img src={selectedImage} alt={product.name} /></div>
            <div className="thumbnail-row">
              {galleryImages.map((image, index) => (
                <button className={selectedImage === image ? 'active' : ''} key={image} onClick={() => setSelectedImage(image)}>
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="detail-info">
            <span className="detail-brand">{product.brand}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating"><span><FiStar /> {product.rating}</span><span>{product.sold} sản phẩm đã bán</span></div>
            <div className="detail-price">
              <strong>{formatCurrency(product.price)}</strong>
              <del>{formatCurrency(product.oldPrice)}</del>
              <span>Tiết kiệm {product.discountPercent}%</span>
            </div>
            <div className="quick-specs">
              <div><small>RAM</small><strong>{product.ram}</strong></div>
              <div><small>Bộ nhớ</small><strong>{product.storage}</strong></div>
              <div><small>Màn hình</small><strong>{product.screen.split(',')[0]}</strong></div>
              <div><small>Pin</small><strong>{product.battery}</strong></div>
            </div>
            <div className="promotion-box">
              <h3><FiZap /> Ưu đãi dành riêng cho bạn</h3>
              <p><FiCheck /> Giảm thêm 200.000đ khi thanh toán chuyển khoản</p>
              <p><FiCheck /> Tặng gói bảo hành mở rộng 12 tháng</p>
              <p><FiCheck /> Miễn phí giao hàng toàn quốc</p>
            </div>
            <div className="purchase-row">
              <div className="quantity-control large">
                <button disabled={isOutOfStock || quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                <span>{quantity}</span>
                <button disabled={isOutOfStock || quantity >= product.stock} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><FiPlus /></button>
              </div>
              <span className={`in-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
                <FiCheck /> {isOutOfStock ? 'Hết hàng' : `Còn ${product.stock} sản phẩm`}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn btn-outline-primary" disabled={isOutOfStock} onClick={add}><FiShoppingBag /> Thêm vào giỏ</button>
              <button className="btn btn-primary" disabled={isOutOfStock} onClick={buyNow}>{isOutOfStock ? 'Hết hàng' : 'Mua ngay'}</button>
              <button className="btn btn-light" onClick={toggleCompare}><FiBarChart2 /> {isCompared ? 'Bỏ so sánh' : 'So sánh'}</button>
            </div>
            <div className="detail-assurances">
              <span><FiShield /> Bảo hành 12 tháng</span>
              <span><FiTruck /> Giao nhanh toàn quốc</span>
            </div>
          </div>
        </section>

        <section className="detail-content-grid">
          <article className="panel description-panel"><h2>Mô tả sản phẩm</h2><p>{product.description}</p></article>
          <aside className="panel specs-panel">
            <h2>Thông số kỹ thuật</h2>
            {Object.entries(product.specifications).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
          </aside>
        </section>

        <ProductReview productId={product.id} onRequireLogin={requireLogin} onSummaryChange={setReviewSummary} />

        <RecentlyViewed currentId={product.id} />

        {compatibleAccessories.length > 0 && (
          <section className="product-section compatible-accessories-section">
            <div className="section-heading">
              <div><span>Cùng hãng hoặc dùng chung chuẩn kết nối</span><h2>Phụ kiện mua kèm</h2></div>
            </div>
            <ProductGrid products={compatibleAccessories} type="accessory" />
          </section>
        )}

        {related.length > 0 && (
          <section className="product-section related-section">
            <div className="section-heading"><div><span>Có thể bạn quan tâm</span><h2>Sản phẩm liên quan</h2></div></div>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </main>
  );
}
