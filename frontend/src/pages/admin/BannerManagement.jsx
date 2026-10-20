import { bannerApi } from '../../api/bannerApi';
import SimpleCrudPage from '../../components/admin/SimpleCrudPage';

export default function BannerManagement() {
  return <SimpleCrudPage api={bannerApi} title="Danh sách banner" singular="Banner" createDefaults={{ title: '', description: '', image: '', link: '/products', active: true }} fields={[
    { key: 'title', label: 'Tiêu đề', required: true },
    { key: 'description', label: 'Mô tả', required: true },
    { key: 'image', label: 'Ảnh banner', type: 'image', required: true, full: true },
    { key: 'link', label: 'Đường dẫn', required: true },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
  ]} columns={[
    { key: 'banner', label: 'Banner', render: (item) => <div className="table-banner"><img src={item.image} alt="" /><span><strong>{item.title}</strong><small>{item.description}</small></span></div> },
    { key: 'link', label: 'Đường dẫn' },
    { key: 'active', label: 'Trạng thái', render: (item) => <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>{item.active ? 'Hiển thị' : 'Đã ẩn'}</span> },
  ]} />;
}
