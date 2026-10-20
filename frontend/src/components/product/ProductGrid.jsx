import EmptyState from '../common/EmptyState';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, type = 'product' }) {
  if (!products.length) {
    return <EmptyState title="Không tìm thấy sản phẩm" description="Hãy thử thay đổi từ khóa hoặc bộ lọc." />;
  }
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} type={type} />)}
    </div>
  );
}
