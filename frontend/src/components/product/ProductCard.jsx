import { useEffect, useState } from 'react';
import { FiBarChart2, FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { STORAGE_KEYS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { storage } from '../../utils/storage';
import { getComparedProducts, toggleComparedProduct } from '../../utils/commercePreferences';

export default function ProductCard({ product, type = 'product' }) {
  const { addToCart } = useCart();
  const detailPath = type === 'accessory' ? `/accessories/${product.id}` : `/products/${product.id}`;
  const { user, toggleWishlist } = useAuth();
  const [favorite, setFavorite] = useState(() => (user?.wishlist || storage.get(STORAGE_KEYS.wishlist, [])).includes(product.id));
  const [compared, setCompared] = useState(() => getComparedProducts().includes(product.id));
  const isOutOfStock = product.status !== 'active' || product.stock <= 0;

  useEffect(() => {
    const sync = () => setFavorite((user?.wishlist || storage.get(STORAGE_KEYS.wishlist, [])).includes(product.id));
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, [product.id, user?.wishlist]);

  useEffect(() => {
    const sync = () => setCompared(getComparedProducts().includes(product.id));
    window.addEventListener('compare-updated', sync);
    return () => window.removeEventListener('compare-updated', sync);
  }, [product.id]);

  const add = () => {
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    addToCart(product, 1, type);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };
  const toggleFavorite = async () => {
    try {
      const nextWishlist = await toggleWishlist(product.id);
      setFavorite(nextWishlist.includes(product.id));
      toast.success(nextWishlist.includes(product.id) ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');
    } catch (error) {
      toast.error(error.friendlyMessage || 'Không thể cập nhật danh sách yêu thích');
    }
  };
  const toggleCompare = () => {
    const before = getComparedProducts();
    const next = toggleComparedProduct(product.id);
    if (!before.includes(product.id) && !next.includes(product.id)) {
      toast.info('Danh sách so sánh đã đủ 4 sản phẩm');
      return;
    }
    setCompared(next.includes(product.id));
    toast.info(next.includes(product.id) ? `Đã thêm vào so sánh (${next.length}/4)` : 'Đã bỏ khỏi so sánh');
  };

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-card-link">
        <div className="product-image-wrap">
          <img src={product.image} alt={product.name} loading="lazy" />
          {product.discountPercent > 0 && <span className="discount-badge">-{product.discountPercent}%</span>}
          {isOutOfStock && <span className="stock-badge">Hết hàng</span>}
        </div>
        <div className="product-card-body">
          <span className="product-brand">{product.brand}</span>
          <h3>{product.name}</h3>
          {type === 'product' && (
            <div className="spec-chips">
              <span>{product.ram}</span>
              <span>{product.storage}</span>
            </div>
          )}
          <div className="price-row">
            <strong>{formatCurrency(product.price)}</strong>
            {product.oldPrice > product.price && <del>{formatCurrency(product.oldPrice)}</del>}
          </div>
          <div className="product-meta">
            <span><FiStar /> {product.rating}</span>
            <span>Đã bán {product.sold}</span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={`wishlist-button ${favorite ? 'active' : ''}`}
        aria-label={favorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        aria-pressed={favorite}
        onClick={toggleFavorite}
      >
        <FiHeart />
      </button>
      {type === 'product' && (
        <button
          type="button"
          className={`compare-card-button ${compared ? 'active' : ''}`}
          aria-label={compared ? 'Bỏ khỏi so sánh' : 'Thêm vào so sánh'}
          aria-pressed={compared}
          onClick={toggleCompare}
        >
          <FiBarChart2 />
        </button>
      )}
      <div className="product-card-actions">
        <button className="add-cart-button" disabled={isOutOfStock} onClick={add}>
          <FiShoppingCart /> {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>
    </article>
  );
}
