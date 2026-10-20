import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { useStoreSettings } from '../hooks/useStoreSettings';

const policies = {
  warranty: {
    eyebrow: 'Hậu mãi',
    title: 'Chính sách bảo hành',
    intro: 'Thời hạn bảo hành cụ thể được ghi trên trang sản phẩm, đơn hàng hoặc phiếu bảo hành đi kèm.',
    sections: [
      ['Phạm vi áp dụng', 'Điện thoại và phụ kiện mua tại TechPhone, còn thông tin nhận diện đơn hàng và thuộc thời hạn bảo hành công bố cho từng sản phẩm.'],
      ['Cách yêu cầu hỗ trợ', 'Chuẩn bị mã đơn hàng, mô tả lỗi và hình ảnh nếu có; liên hệ hotline, email hoặc mang sản phẩm đến cửa hàng để kiểm tra.'],
      ['Kết quả xử lý', 'TechPhone kiểm tra tình trạng thực tế trước khi xác định sửa chữa, đổi sản phẩm hoặc chuyển trung tâm bảo hành của hãng.'],
    ],
  },
  returns: {
    eyebrow: 'Mua sắm an tâm',
    title: 'Chính sách đổi trả',
    intro: 'Website đang áp dụng mốc tham chiếu 30 ngày cho sản phẩm đáp ứng điều kiện; quyết định cuối cùng dựa trên kiểm tra thực tế.',
    sections: [
      ['Điều kiện tiếp nhận', 'Sản phẩm đúng đơn hàng, còn phụ kiện đi kèm và không có hư hỏng do sử dụng sai hướng dẫn, va đập hoặc vào nước.'],
      ['Sản phẩm lỗi kỹ thuật', 'TechPhone tiếp nhận kiểm tra và áp dụng phương án đổi, sửa hoặc bảo hành theo kết luận kỹ thuật và chính sách của hãng.'],
      ['Hoàn tiền', 'Phương thức và thời gian hoàn tiền phụ thuộc kênh thanh toán ban đầu và kết quả đối soát giao dịch.'],
    ],
  },
  shipping: {
    eyebrow: 'Giao nhận',
    title: 'Chính sách vận chuyển',
    intro: 'TechPhone giao hàng toàn quốc. Phí và ngày dự kiến được tính lại trên server theo tỉnh/thành và giá trị đơn.',
    sections: [
      ['Phí giao hàng', 'Đơn từ 10.000.000đ được miễn phí. Các mức phí còn lại hiển thị tại checkout trước khi khách xác nhận đơn.'],
      ['Theo dõi đơn', 'Mã vận đơn, đơn vị vận chuyển và ngày giao dự kiến xuất hiện trong trang tra cứu ngay khi nhân viên cập nhật.'],
      ['Khi nhận hàng', 'Kiểm tra tình trạng kiện hàng và thông tin người nhận trước khi ký nhận; liên hệ TechPhone ngay nếu bao bì có dấu hiệu bất thường.'],
    ],
  },
  payment: {
    eyebrow: 'Thanh toán',
    title: 'Chính sách thanh toán',
    intro: 'Khách có thể chọn COD, chuyển khoản thủ công hoặc cổng VNPay khi merchant đã được cấu hình.',
    sections: [
      ['Thanh toán online', 'Thông tin thẻ được nhập trên cổng VNPay. TechPhone không thu thập hoặc lưu số thẻ và CVV.'],
      ['Xác nhận giao dịch', 'Đơn chỉ chuyển sang đã thanh toán sau khi server nhận thông báo có chữ ký hợp lệ và số tiền khớp từ nhà cung cấp.'],
      ['Chuyển khoản thủ công', 'Đơn ở trạng thái chờ đối soát cho tới khi nhân viên xác nhận tiền đã vào tài khoản cửa hàng.'],
    ],
  },
};

export default function PolicyPage() {
  const { type } = useParams();
  const settings = useStoreSettings();
  const policy = policies[type];

  if (!policy) {
    return <main className="page-shell"><div className="container narrow-page"><h1>Không tìm thấy chính sách</h1><Link to="/">Về trang chủ</Link></div></main>;
  }

  return (
    <main className="page-shell policy-page">
      <div className="container policy-layout">
        <aside className="policy-index">
          <span className="eyebrow">Trung tâm chính sách</span>
          {Object.entries(policies).map(([key, item]) => (
            <Link className={key === type ? 'active' : ''} key={key} to={`/policies/${key}`}>{item.title}</Link>
          ))}
        </aside>
        <article className="policy-content">
          <span className="eyebrow">{policy.eyebrow}</span>
          <h1>{policy.title}</h1>
          <p className="policy-intro">{policy.intro}</p>
          {policy.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}
          <div className="policy-notice">
            <FiAlertCircle />
            <p>
              Đây là nội dung vận hành hiện có của {settings.storeName}. Điều khoản chi tiết theo từng hãng,
              sản phẩm và hợp đồng nhà cung cấp cần được chủ shop xác nhận trước khi dùng như cam kết pháp lý.
            </p>
          </div>
          <Link className="btn btn-light" to="/contact"><FiArrowLeft /> Liên hệ hỗ trợ</Link>
        </article>
      </div>
    </main>
  );
}
