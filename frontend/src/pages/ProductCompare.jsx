import { useCallback, useEffect, useState } from 'react';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import LoadError from '../components/common/LoadError';
import { getComparedProducts, removeComparedProduct } from '../utils/commercePreferences';
import { formatCurrency } from '../utils/formatCurrency';

const rows = [
  ['Giá hiện tại', (item) => formatCurrency(item.price)],
  ['Thương hiệu', (item) => item.brand],
  ['RAM', (item) => item.ram],
  ['Bộ nhớ', (item) => item.storage],
  ['Màn hình', (item) => item.screen],
  ['Pin', (item) => item.battery],
  ['Đánh giá', (item) => `${item.rating}/5`],
  ['Tồn kho', (item) => (item.stock > 0 ? `Còn ${item.stock}` : 'Hết hàng')],
];

export default function ProductCompare() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return productApi.getAll()
      .then((items) => {
        const ids = getComparedProducts();
        setProducts(ids.map((id) => items.find((item) => item.id === id)).filter(Boolean));
      })
      .catch((loadError) => setError(loadError.friendlyMessage || loadError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  const remove = (id) => { removeComparedProduct(id); load(); };

  if (loading) return <Loading />;
  if (error) return <main className="page-shell"><div className="container narrow-page"><LoadError message={error} onRetry={load} /></div></main>;
  if (!products.length) return <main className="page-shell"><div className="container narrow-page"><EmptyState title="Chưa có sản phẩm để so sánh" description="Chọn tối đa 4 điện thoại từ trang chi tiết để xem khác biệt thông số." actionLabel="Xem điện thoại" actionTo="/products" /></div></main>;

  return (
    <main className="page-shell compare-page">
      <div className="container">
        <div className="page-title-row"><div><span className="eyebrow">Chọn thông minh hơn</span><h1>So sánh điện thoại</h1></div><Link className="btn btn-outline-primary" to="/products"><FiArrowLeft /> Xem thêm</Link></div>
        <div className="compare-scroll panel">
          <table className="compare-table">
            <thead><tr><th>Thông số</th>{products.map((item) => <th key={item.id}><button className="compare-remove" onClick={() => remove(item.id)} aria-label={`Bỏ ${item.name} khỏi so sánh`}><FiX /></button><img src={item.image} alt="" /><Link to={`/products/${item.id}`}>{item.name}</Link></th>)}</tr></thead>
            <tbody>{rows.map(([label, render]) => {
              const values = products.map(render);
              const isDifferent = new Set(values).size > 1;
              return <tr key={label}><th>{label}</th>{products.map((item, index) => <td className={isDifferent ? 'is-different' : ''} key={item.id}>{values[index]}</td>)}</tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
