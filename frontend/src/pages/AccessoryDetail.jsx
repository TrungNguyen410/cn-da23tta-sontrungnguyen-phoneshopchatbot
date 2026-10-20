import { useEffect, useState } from 'react';
import { FiCheck, FiChevronRight, FiMinus, FiPlus, FiShoppingBag, FiStar } from 'react-icons/fi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { accessoryApi } from '../api/accessoryApi';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import ProductGrid from '../components/product/ProductGrid';
import ProductReview from '../components/product/ProductReview';
import { useCart } from '../hooks/useCart';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatCurrency } from '../utils/formatCurrency';
import { trackEvent } from '../utils/analytics';

export default function AccessoryDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [accessory, setAccessory] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: accessory?.name || 'Chi tiết phụ kiện',
    description: accessory?.description || 'Phụ kiện chính hãng tại TechPhone.',
    image: accessory?.image,
    canonicalPath: accessory ? `/accessories/${accessory.id}` : window.location.pathname,
    type: 'product',
    structuredData: accessory ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: accessory.name,
      image: accessory.image,
      description: accessory.description,
      sku: accessory.id,
      brand: { '@type': 'Brand', name: accessory.brand },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'VND',
        price: accessory.price,
        availability: accessory.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    } : null,
  });

  useEffect(() => {
    Promise.all([accessoryApi.getById(id), accessoryApi.getAll()])
      .then(([detail, items]) => {
        setAccessory(detail);
        setSelectedImage(detail.images?.[0] || detail.image);
        setQuantity(detail.stock > 0 ? 1 : 0);
        setRelated(items.filter((item) => item.id !== id).slice(0, 4));
        trackEvent('view_item', {
          item_id: detail.id,
          item_type: 'accessory',
          value: detail.price,
          currency: 'VND',
        });
      })
      .catch(() => setAccessory(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!accessory) return <EmptyState title="Không tìm thấy phụ kiện" actionLabel="Về trang chủ" />;

  const isOutOfStock = accessory.status !== 'active' || accessory.stock <= 0;
  const galleryImages = [...new Set([accessory.image, ...(accessory.images || [])].filter(Boolean))].slice(0, 5);
  const requireLogin = () => navigate('/login', { state: { from: location } });
  const add = () => {
    if (isOutOfStock) return toast.error('Phụ kiện đã hết hàng');
    addToCart(accessory, quantity, 'accessory');
    toast.success('Đã thêm phụ kiện vào giỏ hàng');
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="breadcrumbs"><Link to="/">Trang chủ</Link><FiChevronRight /><span>Phụ kiện</span><FiChevronRight /><span>{accessory.name}</span></nav>
        <section className="detail-grid">
          <div className="gallery">
            <div className="main-image"><img src={selectedImage} alt={accessory.name} /></div>
            {galleryImages.length > 1 && (
              <div className="thumbnail-row">
                {galleryImages.map((image, index) => (
                  <button className={selectedImage === image ? 'active' : ''} key={image} onClick={() => setSelectedImage(image)}>
                    <img src={image} alt={`${accessory.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="detail-info">
            <span className="detail-brand">{accessory.brand} · {accessory.category}</span>
            <h1>{accessory.name}</h1>
            <div className="detail-rating"><span><FiStar /> {accessory.rating}</span><span>Đã bán {accessory.sold}</span></div>
            <div className="detail-price"><strong>{formatCurrency(accessory.price)}</strong><del>{formatCurrency(accessory.oldPrice)}</del><span>-{accessory.discountPercent}%</span></div>
            <p className="detail-description">{accessory.description}</p>
            <div className="promotion-box">
              <h3>Quyền lợi mua hàng</h3>
              <p><FiCheck /> Sản phẩm chính hãng, đầy đủ phụ kiện</p>
              <p><FiCheck /> Đổi mới trong 30 ngày nếu lỗi kỹ thuật</p>
              <p><FiCheck /> Bảo hành 12 tháng tại TechPhone</p>
            </div>
            <div className="purchase-row">
              <div className="quantity-control large">
                <button disabled={isOutOfStock || quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button><span>{quantity}</span>
                <button disabled={isOutOfStock || quantity >= accessory.stock} onClick={() => setQuantity(Math.min(accessory.stock, quantity + 1))}><FiPlus /></button>
              </div>
              <span className={`in-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
                <FiCheck /> {isOutOfStock ? 'Hết hàng' : `Còn ${accessory.stock} sản phẩm`}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn btn-outline-primary" disabled={isOutOfStock} onClick={add}><FiShoppingBag /> Thêm vào giỏ</button>
              <button className="btn btn-primary" disabled={isOutOfStock} onClick={() => { add(); navigate('/cart'); }}>
                {isOutOfStock ? 'Hết hàng' : 'Xem giỏ hàng'}
              </button>
            </div>
          </div>
        </section>
        <section className="detail-content-grid single">
          <article className="panel description-panel"><h2>Thông tin phụ kiện</h2><p>{accessory.description}</p></article>
          <aside className="panel specs-panel"><h2>Thông số</h2>{Object.entries(accessory.specifications).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</aside>
        </section>
        <ProductReview accessoryId={accessory.id} onRequireLogin={requireLogin} />
        <section className="product-section related-section">
          <div className="section-heading"><div><span>Gợi ý thêm</span><h2>Phụ kiện khác</h2></div></div>
          <ProductGrid products={related} type="accessory" />
        </section>
      </div>
    </main>
  );
}
