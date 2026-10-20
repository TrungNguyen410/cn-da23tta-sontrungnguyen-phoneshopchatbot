import { useLocation } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';

const exactRoutes = {
  '/': {
    title: 'Điện thoại & Phụ kiện chính hãng',
    description: 'Khám phá điện thoại và phụ kiện chính hãng tại TechPhone, giá minh bạch và giao hàng toàn quốc.',
  },
  '/products': {
    title: 'Điện thoại',
    description: 'Danh sách điện thoại chính hãng với bộ lọc theo thương hiệu, mức giá và cấu hình.',
  },
  '/accessories': {
    title: 'Phụ kiện',
    description: 'Phụ kiện điện thoại chính hãng, tương thích rõ ràng và còn hàng được cập nhật.',
  },
  '/compare': {
    title: 'So sánh điện thoại',
    description: 'So sánh giá, cấu hình và tồn kho của tối đa bốn điện thoại.',
  },
  '/cart': {
    title: 'Giỏ hàng',
    description: 'Kiểm tra sản phẩm, số lượng, voucher và tổng tiền trong giỏ hàng TechPhone.',
  },
  '/checkout': {
    title: 'Thanh toán',
    description: 'Hoàn tất địa chỉ giao hàng và chọn phương thức thanh toán an toàn tại TechPhone.',
  },
  '/reviews': {
    title: 'Đánh giá khách hàng',
    description: 'Tham khảo các đánh giá đã được duyệt từ khách hàng TechPhone.',
  },
  '/contact': {
    title: 'Liên hệ & cửa hàng',
    description: 'Liên hệ TechPhone qua hotline, email hoặc địa chỉ cửa hàng.',
  },
  '/favorites': {
    title: 'Sản phẩm yêu thích',
    description: 'Xem lại điện thoại và phụ kiện bạn đã lưu tại TechPhone.',
  },
  '/order-lookup': {
    title: 'Tra cứu đơn hàng',
    description: 'Tra cứu trạng thái giao hàng bằng mã đơn và số điện thoại nhận hàng.',
  },
  '/account': {
    title: 'Tài khoản của tôi',
    description: 'Quản lý hồ sơ, mật khẩu và lịch sử đơn hàng TechPhone.',
  },
  '/login': {
    title: 'Đăng nhập',
    description: 'Đăng nhập tài khoản TechPhone để đồng bộ đơn hàng và sản phẩm yêu thích.',
  },
  '/register': {
    title: 'Đăng ký',
    description: 'Tạo tài khoản TechPhone và xác minh bằng mã OTP.',
  },
  '/forgot-password': {
    title: 'Khôi phục mật khẩu',
    description: 'Khôi phục mật khẩu tài khoản TechPhone bằng mã OTP.',
  },
};

const prefixRoutes = [
  ['/products/', { title: 'Chi tiết điện thoại', description: 'Thông tin, cấu hình, giá và đánh giá điện thoại tại TechPhone.' }],
  ['/accessories/', { title: 'Chi tiết phụ kiện', description: 'Thông tin, khả năng tương thích, giá và đánh giá phụ kiện tại TechPhone.' }],
  ['/order-success/', { title: 'Đặt hàng thành công', description: 'Thông tin xác nhận và theo dõi đơn hàng TechPhone.' }],
  ['/payment-result', { title: 'Kết quả thanh toán', description: 'Kiểm tra kết quả thanh toán đơn hàng TechPhone.' }],
  ['/policies/', { title: 'Chính sách mua hàng', description: 'Chính sách bảo hành, đổi trả, vận chuyển và thanh toán tại TechPhone.' }],
  ['/admin', { title: 'Quản trị cửa hàng', description: 'Khu vực quản trị TechPhone.' }],
];

export default function RouteMeta() {
  const { pathname } = useLocation();
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  const routeMeta = exactRoutes[normalizedPath]
    || prefixRoutes.find(([prefix]) => normalizedPath.startsWith(prefix))?.[1]
    || { title: 'Không tìm thấy trang', description: 'Trang bạn yêu cầu không tồn tại trên TechPhone.' };

  usePageMeta({
    ...routeMeta,
    canonicalPath: normalizedPath,
  });

  return null;
}
