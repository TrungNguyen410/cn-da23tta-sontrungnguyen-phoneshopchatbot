import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../api/productApi';
import Loading from '../components/common/Loading';
import LoadError from '../components/common/LoadError';
import Pagination from '../components/common/Pagination';
import SearchBox from '../components/common/SearchBox';
import ProductFilter from '../components/product/ProductFilter';
import ProductGrid from '../components/product/ProductGrid';
import ProductSort from '../components/product/ProductSort';
import { useDebounce } from '../hooks/useDebounce';
import { trackEvent } from '../utils/analytics';

const initialFilters = { brand: '', price: '', ram: '', storage: '', battery: '' };
const PAGE_SIZE = 9;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({ ...initialFilters, brand: searchParams.get('brand') || '' });
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [mobileFilter, setMobileFilter] = useState(false);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return productApi.getAll()
      .then(setProducts)
      .catch((loadError) => setError(loadError.friendlyMessage || loadError.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (debouncedSearch) next.set('q', debouncedSearch);
      else next.delete('q');
      return next;
    }, { replace: true });
    setPage(1);
  }, [debouncedSearch, setSearchParams]);

  const urlSearch = searchParams.get('q') || '';
  const urlBrand = searchParams.get('brand') || '';
  useEffect(() => {
    setSearch(urlSearch);
    setFilters((current) => (
      current.brand === urlBrand ? current : { ...current, brand: urlBrand }
    ));
    setPage(1);
  }, [urlBrand, urlSearch]);

  const updateFilters = (next) => {
    setFilters(next);
    if (next.brand !== filters.brand) {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (next.brand) params.set('brand', next.brand);
        else params.delete('brand');
        return params;
      }, { replace: true });
    }
    setPage(1);
  };

  const resetFilters = () => updateFilters(initialFilters);

  useEffect(() => {
    if (debouncedSearch) trackEvent('search', { query_length: debouncedSearch.length });
  }, [debouncedSearch]);

  const options = useMemo(
    () => ({
      brands: [...new Set(products.map((item) => item.brand))].sort(),
      ram: [...new Set(products.map((item) => item.ram))].sort(),
      storage: [...new Set(products.map((item) => item.storage))].sort(),
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();
    const result = products.filter((product) => {
      const [minPrice, maxPrice] = filters.price ? filters.price.split('-').map(Number) : [0, Infinity];
      const battery = Number.parseInt(product.battery, 10);
      return (
        product.status === 'active' &&
        (!keyword || `${product.name} ${product.brand}`.toLowerCase().includes(keyword)) &&
        (!filters.brand || product.brand === filters.brand) &&
        (!filters.price || (product.price >= minPrice && product.price <= maxPrice)) &&
        (!filters.ram || product.ram === filters.ram) &&
        (!filters.storage || product.storage === filters.storage) &&
        (!filters.battery || battery >= Number(filters.battery))
      );
    });
    return result.sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'best-selling') return b.sold - a.sold;
      if (sort === 'rating') return b.rating - a.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [debouncedSearch, filters, products, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleProducts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loading />;
  if (error) {
    return <main className="page-shell"><div className="container"><LoadError message={error} onRetry={load} /></div></main>;
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-hero small">
          <div><span>Khám phá thiết bị phù hợp</span><h1>Điện thoại chính hãng</h1></div>
          <p>So sánh dễ dàng, ưu đãi minh bạch và bảo hành tận tâm.</p>
        </div>
        <div className="catalog-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc thương hiệu..." />
          <button className="mobile-filter-button" onClick={() => setMobileFilter(true)}><FiFilter /> Bộ lọc</button>
          <ProductSort value={sort} onChange={(value) => { setSort(value); setPage(1); }} />
        </div>
        <div className="catalog-layout">
          <div className={`filter-mobile-wrap ${mobileFilter ? 'open' : ''}`}>
            <button className="filter-mobile-close" onClick={() => setMobileFilter(false)}><FiX /></button>
            <ProductFilter
              filters={filters}
              options={options}
              onChange={updateFilters}
              onReset={resetFilters}
            />
          </div>
          {mobileFilter && <div className="drawer-overlay" onClick={() => setMobileFilter(false)} />}
          <div className="catalog-results">
            <div className="result-count"><FiSearch /> Tìm thấy <strong>{filtered.length}</strong> sản phẩm</div>
            <ProductGrid products={visibleProducts} />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </main>
  );
}
