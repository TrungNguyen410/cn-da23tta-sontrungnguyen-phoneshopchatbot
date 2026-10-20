export default function ProductSort({ value, onChange }) {
  return (
    <label className="sort-control">
      <span>Sắp xếp:</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="newest">Mới nhất</option>
        <option value="price-asc">Giá tăng dần</option>
        <option value="price-desc">Giá giảm dần</option>
        <option value="best-selling">Bán chạy</option>
        <option value="rating">Đánh giá cao</option>
      </select>
    </label>
  );
}
