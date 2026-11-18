import { useState } from 'react';
import { FiLock, FiPhone, FiUserPlus } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { isStrongEnoughPassword, isValidVietnamesePhone, validateRequired } from '../utils/validators';
import SocialLoginButtons from '../components/common/SocialLoginButtons';
import AuthShowcase from '../components/auth/AuthShowcase';
import StoreBrand from '../components/common/StoreBrand';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm({ ...form, [key]: value });
    setErrors({ ...errors, [key]: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequired(form);
    if (form.phone && !isValidVietnamesePhone(form.phone)) nextErrors.phone = 'Số điện thoại Việt Nam không hợp lệ';
    if (form.password && !isStrongEnoughPassword(form.password)) nextErrors.password = 'Mật khẩu cần ít nhất 6 ký tự';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng kiểm tra thông tin đăng ký');
    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await register(payload);
      toast.success('Đăng ký thành công. Vui lòng đăng nhập!');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  const enter = (session) => {
    toast.success(`Chào mừng ${session.user.fullName}`);
    navigate('/', { replace: true });
  };

  return (
    <main className="auth-page register-page">
      <div className="auth-visual">
        <AuthShowcase />
        <div><FiUserPlus /><h1>Gia nhập cộng đồng<br />PhoneShopAI</h1><p>Theo dõi đơn hàng, nhận ưu đãi và chăm sóc cá nhân hóa.</p></div>
      </div>
      <div className="auth-panel">
        <StoreBrand />
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">Tạo tài khoản mới</span>
          <h1>Đăng ký thành viên</h1>
          <p>Dùng số điện thoại và mật khẩu để đăng nhập, hoặc tiếp tục nhanh với Google/Facebook.</p>
          <label className="input-with-icon"><span>Họ và tên</span><div><FiUserPlus /><input autoComplete="name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></div>{errors.fullName && <small>{errors.fullName}</small>}</label>
          <label className="input-with-icon"><span>Số điện thoại</span><div><FiPhone /><input inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="0912 345 678" /></div>{errors.phone && <small>{errors.phone}</small>}</label>
          <div className="auth-two-columns">
            <label className="input-with-icon"><span>Mật khẩu</span><div><FiLock /><input type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} /></div>{errors.password && <small>{errors.password}</small>}</label>
            <label className="input-with-icon"><span>Xác nhận mật khẩu</span><div><FiLock /><input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></div>{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label>
          </div>
          <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</button>
          <SocialLoginButtons onSignedIn={enter} disabled={loading} />
          <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </form>
      </div>
    </main>
  );
}
