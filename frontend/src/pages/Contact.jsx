import { useState } from 'react';
import { FiChevronDown, FiClock, FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { contactApi } from '../api/contactApi';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { isValidEmail, isValidVietnamesePhone, validateRequired } from '../utils/validators';

const faqs = [
  ['TechPhone có giao hàng toàn quốc không?', 'Có. Chúng tôi giao hàng toàn quốc, miễn phí với đơn hàng từ 10 triệu đồng.'],
  ['Sản phẩm được bảo hành bao lâu?', 'Điện thoại và phụ kiện được bảo hành từ 6 đến 24 tháng tùy sản phẩm.'],
  ['Tôi có thể đổi trả sản phẩm không?', 'Bạn có thể đổi trả trong 30 ngày nếu sản phẩm đáp ứng điều kiện chính sách.'],
  ['TechPhone có hỗ trợ thu cũ đổi mới?', 'Có. Vui lòng mang thiết bị đến cửa hàng để được kiểm tra và định giá trực tiếp.'],
];

export default function Contact() {
  const settings = useStoreSettings();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [openFaq, setOpenFaq] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequired(form);
    if (form.email && !isValidEmail(form.email)) nextErrors.email = 'Email không hợp lệ';
    if (form.phone && !isValidVietnamesePhone(form.phone)) nextErrors.phone = 'Số điện thoại không hợp lệ';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng hoàn thiện biểu mẫu');
    setSubmitting(true);
    try {
      await contactApi.create(form);
      setForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
      window.dispatchEvent(new CustomEvent('contact-updated'));
      toast.success(`Đã gửi liên hệ. ${settings.storeName} sẽ phản hồi sớm nhất!`);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell contact-page">
      <div className="container">
        <div className="page-hero"><div><span>Chúng tôi luôn lắng nghe</span><h1>Liên hệ {settings.storeName}</h1><p>Cần tư vấn sản phẩm, bảo hành hay đơn hàng? Đội ngũ hỗ trợ luôn sẵn sàng.</p></div><FiSend /></div>
        <div className="contact-cards">
          <div><FiPhone /><span><small>Hotline</small><strong>{settings.hotline}</strong><p>8:00 - 22:00 mỗi ngày</p></span></div>
          <div><FiMail /><span><small>Email</small><strong>{settings.email}</strong><p>Phản hồi trong 24 giờ</p></span></div>
          <div><FiMapPin /><span><small>Cửa hàng</small><strong>{settings.address}</strong><p>Đón tiếp trực tiếp tại cửa hàng</p></span></div>
          <div><FiClock /><span><small>Giờ mở cửa</small><strong>8:00 - 21:30</strong><p>Thứ Hai đến Chủ Nhật</p></span></div>
        </div>
        <div className="contact-layout">
          <form className="panel contact-form" onSubmit={submit}>
            <h2>Gửi yêu cầu hỗ trợ</h2><p>Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại với bạn.</p>
            <div className="form-grid">
              <label className="form-field"><span>Họ và tên *</span><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />{errors.fullName && <small>{errors.fullName}</small>}</label>
              <label className="form-field"><span>Số điện thoại *</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />{errors.phone && <small>{errors.phone}</small>}</label>
              <label className="form-field full"><span>Email *</span><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{errors.email && <small>{errors.email}</small>}</label>
              <label className="form-field full"><span>Chủ đề *</span><input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />{errors.subject && <small>{errors.subject}</small>}</label>
              <label className="form-field full"><span>Nội dung *</span><textarea rows="5" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />{errors.message && <small>{errors.message}</small>}</label>
            </div>
            <button className="btn btn-primary" disabled={submitting}><FiSend /> {submitting ? 'Đang gửi...' : 'Gửi liên hệ'}</button>
          </form>
          <div className="map-placeholder"><FiMapPin /><strong>{settings.storeName} Flagship Store</strong><span>{settings.address}</span><a href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`} target="_blank" rel="noreferrer">Mở Google Maps</a></div>
        </div>
        <section className="faq-section">
          <div className="section-heading"><div><span>Hỗ trợ nhanh</span><h2>Câu hỏi thường gặp</h2></div></div>
          <div className="faq-list">{faqs.map(([question, answer], index) => <article className={openFaq === index ? 'open' : ''} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><strong>{question}</strong><FiChevronDown /></button><p>{answer}</p></article>)}</div>
        </section>
      </div>
    </main>
  );
}
