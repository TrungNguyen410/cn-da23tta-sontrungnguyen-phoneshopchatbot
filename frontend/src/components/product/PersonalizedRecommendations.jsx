import { getRecentlyViewedProducts } from '../../utils/commercePreferences';
import { recommendFromHistory } from '../../utils/merchandising';
import ProductGrid from './ProductGrid';

export default function PersonalizedRecommendations({ products }) {
  const historyIds = getRecentlyViewedProducts();
  if (!historyIds.length) return null;
  const recommendations = recommendFromHistory(products, historyIds, 4);
  if (!recommendations.length) return null;

  return (
    <section className="container product-section personalized-section">
      <div className="section-heading">
        <div>
          <span>Dựa trên sản phẩm đã xem trên thiết bị này</span>
          <h2>Gợi ý phù hợp để xem tiếp</h2>
        </div>
      </div>
      <ProductGrid products={recommendations} />
    </section>
  );
}
