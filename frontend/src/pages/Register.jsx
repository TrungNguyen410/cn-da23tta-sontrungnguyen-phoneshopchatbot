import { useState } from 'react';
import { FiKey, FiLock, FiPhone, FiUserPlus } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { isStrongEnoughPassword, isValidVietnamesePhone, validateRequired } from '../utils/validators';

export default function Register() {
  const navigate = useNavigate();
  const { requestRegistrationOtp, verifyRegistrationOtp, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState('');
  const [deliveryTarget, setDeliveryTarget] = useState('');
  const [isDebugOtp, setIsDebugOtp] = useState(false);

  const update = (key, value) => {
    setForm({ ...form, [key]: value });
    setErrors({ ...errors, [key]: '' });
  };

  const submitDetails = async (event) => {
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
      const result = await requestRegistrationOtp(payload);
      setDeliveryTarget(result.deliveryTarget || form.phone);
      setIsDebugOtp(Boolean(result.debugOtp));
      setStep('otp');
      toast.success(result.debugOtp ? `Mã OTP SMS thử nghiệm: ${result.debugOtp}` : 'Đã gửi mã OTP qua SMS');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) return toast.error('Vui lòng nhập mã OTP gồm 6 chữ số');
    setLoading(true);
    try {
      await verifyRegistrationOtp({ phone: form.phone, otp });
      logout();
      toast.success('Xác minh số điện thoại và đăng ký thành công. Vui lòng đăng nhập!');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">
      <div className="auth-visual"><div><FiUserPlus /><h1>Gia nhập cộng đồng<br />TechPhone</h1><p>Theo dõi đơn hàng, nhận ưu đãi và chăm sóc cá nhân hóa.</p></div></div>
      <div className="auth-panel">
        <Link className="brand" to="/"><span className="brand-mark">T</span><span>Tech<span>Phone</span></span></Link>
        <form className="auth-form" onSubmit={step === 'details' ? submitDetails : submitOtp}>
          <span className="eyebrow">{step === 'details' ? 'Tạo tài khoản mới' : 'Xác minh qua SMS'}</span>
          <h1>{step === 'details' ? 'Đăng ký thành viên' : 'Nhập mã OTP'}</h1>
          <p>{step === 'details'
            ? 'Mã xác minh sẽ được gửi qua SMS đến số điện thoại của bạn.'
            : isDebugOtp
              ? `Đang dùng SMS thử nghiệm miễn phí cho ${deliveryTarget}; nhập mã hiển thị trong thông báo.`
              : `Mã gồm 6 chữ số đã được gửi qua SMS đến ${deliveryTarget}.`}</p>
          {step === 'details' ? (
            <>
              <label className="input-with-icon"><span>Họ và tên</span><div><FiUserPlus /><input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></div>{errors.fullName && <small>{errors.fullName}</small>}</label>
              <label className="input-with-icon"><span>Số điện thoại</span><div><FiPhone /><input inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="0912 345 678" /></div>{errors.phone && <small>{errors.phone}</small>}</label>
              <div className="auth-two-columns">
                <label className="input-with-icon"><span>Mật khẩu</span><div><FiLock /><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} /></div>{errors.password && <small>{errors.password}</small>}</label>
                <label className="input-with-icon"><span>Xác nhận mật khẩu</span><div><FiLock /><input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></div>{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label>
              </div>
            </>
          ) : (
            <>
              <label className="input-with-icon otp-input"><span>Mã OTP</span><div><FiKey /><input inputMode="numeric" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="••••••" /></div></label>
              <button type="button" className="auth-text-button" onClick={() => setStep('details')}>Quay lại sửa thông tin</button>
            </>
          )}
          <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : step === 'details' ? 'Gửi mã xác minh' : 'Xác minh và đăng ký'}</button>
          <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </form>
      </div>
    </main>
  );
}
