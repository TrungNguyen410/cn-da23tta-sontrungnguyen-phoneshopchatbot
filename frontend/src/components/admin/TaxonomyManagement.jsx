import SimpleCrudPage from './SimpleCrudPage';

export default function TaxonomyManagement({ api, type }) {
  const isBrand = type === 'brand';
  const label = type === 'category' ? 'Danh mục' : 'Thương hiệu';
  return <SimpleCrudPage api={api} title={`Danh sách ${label.toLowerCase()}`} singular={label} createDefaults={isBrand ? { name: '', logo: '', description: '', active: true } : { name: '', description: '', active: true }} fields={[
    { key: 'name', label: `Tên ${label.toLowerCase()}`, required: true, full: true },
    ...(isBrand ? [{ key: 'logo', label: 'Logo thương hiệu', type: 'image', full: true }] : []),
    { key: 'description', label: 'Mô tả', type: 'textarea', full: true },
    { key: 'active', label: 'Đang hoạt động', type: 'checkbox' },
  ]} columns={[
    { key: 'name', label },
    { key: 'active', label: 'Trạng thái', render: (item) => <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>{item.active ? 'Hoạt động' : 'Tạm ẩn'}</span> },
  ]} />;
}
