import { useEffect, useState } from 'react';
import { productApi } from '../../api/productApi';
import { getRecentlyViewedProducts } from '../../utils/commercePreferences';
import ProductGrid from './ProductGrid';

export default function RecentlyViewed({ currentId }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productApi.getAll().then((items) => {
      const ids = getRecentlyViewedProducts().filter((id) => id !== currentId);
      setProducts(ids.map((id) => items.find((item) => item.id === id)).filter(Boolean).slice(0, 4));
    }).catch(() => setProducts([]));
  }, [currentId]);

  if (!products.length) return null;
  return (
    <section className="product-section recently-viewed-section">
      <div className="section-heading"><div><span>Xem lại nhanh</span><h2>Sản phẩm bạn đã xem</h2></div></div>
      <ProductGrid products={products} />
    </section>
  );
}
