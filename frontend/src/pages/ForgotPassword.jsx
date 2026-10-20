import { useState } from 'react';
import { FiKey, FiLock, FiPhone } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../api/authApi';
import { isStrongEnoughPassword } from '../utils/validators';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [form, setForm] = useState({
    identifier: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deliveryTarget, setDeliveryTarget] = useState('');
  const [isDebugOtp, setIsDebugOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const requestOtp = async (event) => {
    event.preventDefault();
    if (!form.identifier.trim()) return toast.error('Vui lòng nhập số điện thoại');
    setLoading(true);
    try {
      const result = await authApi.requestPasswordReset({
        identifier: form.identifier.trim(),
      });
      setDeliveryTarget(result.deliveryTarget || form.identifier);
      setIsDebugOtp(Boolean(result.debugOtp));
      setStep('reset');
      toast.success(result.debugOtp ? `Mã OTP thử nghiệm: ${result.debugOtp}` : 'Nếu tài khoản tồn tại, mã OTP đã được gửi');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(form.otp)) return toast.error('Mã OTP phải gồm 6 chữ số');
    if (!isStrongEnoughPassword(form.newPassword)) return toast.error('Mật khẩu mới cần ít nhất 6 ký tự');
    if (form.newPassword !== form.confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');
    setLoading(true);
    try {
      await authApi.resetPassword({
        identifier: form.identifier.trim(),
        otp: form.otp,
        newPassword: form.newPassword,
      });
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <div><FiKey /><h1>Khôi phục tài khoản<br />an toàn bằng OTP</h1><p>Mã chỉ có hiệu lực trong 10 phút và được dùng một lần.</p></div>
      </div>
      <div className="auth-panel">
        <Link className="brand" to="/"><span className="brand-mark">T</span><span>Tech<span>Phone</span></span></Link>
        <form className="auth-form" onSubmit={step === 'request' ? requestOtp : resetPassword}>
          <span className="eyebrow">Bảo mật tài khoản</span>
          <h1>{step === 'request' ? 'Quên mật khẩu' : 'Tạo mật khẩu mới'}</h1>
          <p>{step === 'request'
            ? 'Nhập số điện thoại tài khoản để nhận mã OTP qua SMS.'
            : isDebugOtp
              ? `Đang dùng SMS thử nghiệm miễn phí cho ${deliveryTarget}; nhập mã hiển thị trong thông báo.`
              : `Nhập mã SMS đã gửi đến ${deliveryTarget}.`}</p>
          {step === 'request' ? (
            <label className="input-with-icon">
              <span>Số điện thoại tài khoản</span>
              <div><FiPhone /><input inputMode="tel" autoComplete="tel" value={form.identifier} onChange={(event) => update('identifier', event.target.value)} placeholder="0912 345 678" /></div>
            </label>
          ) : (
            <>
              <label className="input-with-icon otp-input"><span>Mã OTP</span><div><FiKey /><input inputMode="numeric" maxLength="6" value={form.otp} onChange={(event) => update('otp', event.target.value.replace(/\D/g, ''))} placeholder="••••••" /></div></label>
              <label className="input-with-icon"><span>Mật khẩu mới</span><div><FiLock /><input type="password" value={form.newPassword} onChange={(event) => update('newPassword', event.target.value)} /></div></label>
              <label className="input-with-icon"><span>Xác nhận mật khẩu mới</span><div><FiLock /><input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></div></label>
              <button type="button" className="auth-text-button" onClick={() => setStep('request')}>Gửi lại hoặc sửa số điện thoại</button>
            </>
          )}
          <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : step === 'request' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}</button>
          <p className="auth-switch"><Link to="/login">Quay lại đăng nhập</Link></p>
        </form>
      </div>
    </main>
  );
}
