import { FiRotateCcw } from 'react-icons/fi';

export default function ProductFilter({ filters, options, onChange, onReset }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });
  return (
    <aside className="product-filter">
      <div className="filter-heading">
        <h3>Bộ lọc sản phẩm</h3>
        <button onClick={onReset}><FiRotateCcw /> Đặt lại</button>
      </div>
      <div className="filter-group">
        <label>Thương hiệu</label>
        <select value={filters.brand} onChange={(event) => update('brand', event.target.value)}>
          <option value="">Tất cả thương hiệu</option>
          {options.brands.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Khoảng giá</label>
        <select value={filters.price} onChange={(event) => update('price', event.target.value)}>
          <option value="">Tất cả mức giá</option>
          <option value="0-10000000">Dưới 10 triệu</option>
          <option value="10000000-20000000">10 - 20 triệu</option>
          <option value="20000000-30000000">20 - 30 triệu</option>
          <option value="30000000-999999999">Trên 30 triệu</option>
        </select>
      </div>
      <div className="filter-group">
        <label>RAM</label>
        <select value={filters.ram} onChange={(event) => update('ram', event.target.value)}>
          <option value="">Tất cả dung lượng</option>
          {options.ram.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Bộ nhớ</label>
        <select value={filters.storage} onChange={(event) => update('storage', event.target.value)}>
          <option value="">Tất cả bộ nhớ</option>
          {options.storage.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Dung lượng pin</label>
        <select value={filters.battery} onChange={(event) => update('battery', event.target.value)}>
          <option value="">Tất cả</option>
          <option value="5000">Từ 5.000 mAh</option>
          <option value="4700">Từ 4.700 mAh</option>
        </select>
      </div>
    </aside>
  );
}
