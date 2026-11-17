import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { useStoreSettings } from '../hooks/useStoreSettings';

const policies = {
  warranty: {
    eyebrow: 'Hậu mãi',
    title: 'Chính sách bảo hành',
    intro: 'Thời hạn bảo hành cụ thể được ghi trên trang sản phẩm, đơn hàng hoặc phiếu bảo hành đi kèm.',
    sections: [
      ['Phạm vi áp dụng', 'Điện thoại và phụ kiện mua tại PhoneShopAI, còn thông tin nhận diện đơn hàng và thuộc thời hạn bảo hành công bố cho từng sản phẩm.'],
      ['Cách yêu cầu hỗ trợ', 'Chuẩn bị mã đơn hàng, mô tả lỗi và hình ảnh nếu có; liên hệ hotline, email hoặc mang sản phẩm đến cửa hàng để kiểm tra.'],
      ['Kết quả xử lý', 'PhoneShopAI kiểm tra tình trạng thực tế trước khi xác định sửa chữa, đổi sản phẩm hoặc chuyển trung tâm bảo hành của hãng.'],
    ],
  },
  returns: {
    eyebrow: 'Mua sắm an tâm',
    title: 'Chính sách đổi trả',
    intro: 'Website đang áp dụng mốc tham chiếu 30 ngày cho sản phẩm đáp ứng điều kiện; quyết định cuối cùng dựa trên kiểm tra thực tế.',
    sections: [
      ['Điều kiện tiếp nhận', 'Sản phẩm đúng đơn hàng, còn phụ kiện đi kèm và không có hư hỏng do sử dụng sai hướng dẫn, va đập hoặc vào nước.'],
      ['Sản phẩm lỗi kỹ thuật', 'PhoneShopAI tiếp nhận kiểm tra và áp dụng phương án đổi, sửa hoặc bảo hành theo kết luận kỹ thuật và chính sách của hãng.'],
      ['Hoàn tiền', 'Phương thức và thời gian hoàn tiền phụ thuộc kênh thanh toán ban đầu và kết quả đối soát giao dịch.'],
    ],
  },
  shipping: {
    eyebrow: 'Giao nhận',
    title: 'Chính sách vận chuyển',
    intro: 'PhoneShopAI giao hàng toàn quốc. Phí và ngày dự kiến được tính lại trên server theo tỉnh/thành và giá trị đơn.',
    sections: [
      ['Phí giao hàng', 'Đơn từ 10.000.000đ được miễn phí. Các mức phí còn lại hiển thị tại checkout trước khi khách xác nhận đơn.'],
      ['Theo dõi đơn', 'Mã vận đơn, đơn vị vận chuyển và ngày giao dự kiến xuất hiện trong trang tra cứu ngay khi nhân viên cập nhật.'],
      ['Khi nhận hàng', 'Kiểm tra tình trạng kiện hàng và thông tin người nhận trước khi ký nhận; liên hệ PhoneShopAI ngay nếu bao bì có dấu hiệu bất thường.'],
    ],
  },
  payment: {
    eyebrow: 'Thanh toán',
    title: 'Chính sách thanh toán',
    intro: 'Khách có thể chọn COD, chuyển khoản thủ công hoặc cổng VNPay khi merchant đã được cấu hình.',
    sections: [
      ['Thanh toán online', 'Thông tin thẻ được nhập trên cổng VNPay. PhoneShopAI không thu thập hoặc lưu số thẻ và CVV.'],
      ['Xác nhận giao dịch', 'Đơn chỉ chuyển sang đã thanh toán sau khi server nhận thông báo có chữ ký hợp lệ và số tiền khớp từ nhà cung cấp.'],
      ['Chuyển khoản thủ công', 'Đơn ở trạng thái chờ đối soát cho tới khi nhân viên xác nhận tiền đã vào tài khoản cửa hàng.'],
    ],
  },
  // Meta (Facebook Login) requires a privacy policy URL and data deletion instructions: /privacy and /xoa-du-lieu.
  privacy: {
    path: '/privacy',
    eyebrow: 'Quyền riêng tư',
    title: 'Chính sách quyền riêng tư',
    intro: 'Trang này cho biết PhoneShopAI thu thập dữ liệu gì khi bạn mua hàng hoặc đăng nhập, dùng vào việc gì và bạn có những quyền gì với dữ liệu đó.',
    sections: [
      ['Dữ liệu chúng tôi thu thập', 'Khi đăng ký bằng số điện thoại: họ tên, số điện thoại và mật khẩu (lưu dạng mã hóa). Khi đăng nhập bằng Google hoặc Facebook: họ tên, địa chỉ email và ảnh đại diện mà Google/Facebook cho phép chia sẻ (quyền email và public_profile). Khi đặt hàng: tên, số điện thoại, địa chỉ nhận hàng và nội dung đơn hàng. Khi trò chuyện với trợ lý AI: nội dung tin nhắn bạn gửi.'],
      ['Mục đích sử dụng', 'Tạo và đăng nhập tài khoản, xử lý và giao đơn hàng, xác nhận thanh toán, trả lời câu hỏi của bạn và cải thiện tư vấn của trợ lý AI. Chúng tôi không bán dữ liệu cá nhân và không dùng dữ liệu Facebook/Google để quảng cáo.'],
      ['Bên thứ ba', 'Đăng nhập Google/Facebook chạy qua Firebase Authentication (Google). Trợ lý AI gửi nội dung câu hỏi tới Google Gemini để soạn câu trả lời. Thông tin giao hàng được chia sẻ với đơn vị vận chuyển; thanh toán online đi qua cổng thanh toán (VNPay, ngân hàng). Mỗi bên chỉ nhận phần dữ liệu cần cho việc của họ.'],
      ['Lưu trữ và bảo vệ', 'Dữ liệu được lưu trên máy chủ cơ sở dữ liệu của cửa hàng, truy cập qua kết nối mã hóa. Mật khẩu được băm, không ai đọc được. Dữ liệu đơn hàng được giữ trong thời gian cần cho bảo hành, đối soát và nghĩa vụ kế toán.'],
      ['Quyền của bạn', 'Bạn có thể xem và sửa thông tin trong trang Tài khoản, và yêu cầu xóa tài khoản cùng dữ liệu cá nhân theo hướng dẫn ở trang Xóa dữ liệu người dùng.'],
    ],
  },
  'data-deletion': {
    path: '/xoa-du-lieu',
    eyebrow: 'Quyền riêng tư',
    title: 'Hướng dẫn xóa dữ liệu người dùng',
    intro: 'Bạn có thể yêu cầu xóa tài khoản PhoneShopAI và dữ liệu cá nhân bất cứ lúc nào, kể cả khi bạn đăng nhập bằng Facebook hoặc Google.',
    sections: [
      ['Cách gửi yêu cầu', 'Gửi yêu cầu qua trang Liên hệ hoặc email/hotline của cửa hàng ở cuối trang, với tiêu đề "Yêu cầu xóa dữ liệu". Ghi rõ số điện thoại hoặc email của tài khoản và cách bạn đăng nhập (số điện thoại, Google hay Facebook).'],
      ['Chúng tôi xử lý thế nào', 'Sau khi xác minh bạn là chủ tài khoản, chúng tôi xóa tài khoản, thông tin cá nhân, địa chỉ đã lưu, danh sách yêu thích và lịch sử trò chuyện trong vòng 30 ngày, rồi báo lại cho bạn. Đơn hàng đã phát sinh chỉ được giữ ở dạng ẩn danh khi pháp luật yêu cầu lưu chứng từ.'],
      ['Gỡ quyền của ứng dụng trên Facebook', 'Trên Facebook, vào Cài đặt và quyền riêng tư → Cài đặt → Ứng dụng và trang web, chọn PhoneShopAI rồi bấm Gỡ. Facebook sẽ ngừng chia sẻ dữ liệu với chúng tôi; để xóa dữ liệu đã lưu tại cửa hàng, hãy gửi yêu cầu như trên.'],
      ['Gỡ quyền trên Google', 'Vào myaccount.google.com → Bảo mật → Ứng dụng và dịch vụ của bên thứ ba, chọn PhoneShopAI rồi xóa quyền truy cập.'],
    ],
  },
};

const policyPath = (key) => policies[key].path || `/policies/${key}`;

export default function PolicyPage({ type: fixedType }) {
  const params = useParams();
  const type = fixedType || params.type;
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
            <Link className={key === type ? 'active' : ''} key={key} to={policyPath(key)}>{item.title}</Link>
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
