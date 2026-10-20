import { useEffect, useState } from 'react';
import { FiGlobe, FiMail, FiMapPin, FiPhone, FiSave, FiSettings } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { settingsApi } from '../../api/settingsApi';
import { getStoreSettings, saveStoreSettings } from '../../utils/storeSettings';
import { isValidEmail, validateRequired } from '../../utils/validators';
import AdminImageUpload from '../../components/admin/AdminImageUpload';

export default function SettingManagement() {
  const [form, setForm] = useState(getStoreSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    settingsApi.getPublic()
      .then((settings) => {
        if (active) setForm(saveStoreSettings(settings));
      })
      .catch((error) => {
        if (active) toast.error(error.friendlyMessage || error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const update = (key, value) => setForm({ ...form, [key]: value });
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (event.currentTarget.querySelector('[data-uploading="true"]')) {
      toast.error('Vui lòng chờ ảnh tải lên hoàn tất');
      return;
    }
    const errors = validateRequired({
      storeName: form.storeName,
      hotline: form.hotline,
      email: form.email,
      address: form.address,
    });
    if (form.email && !isValidEmail(form.email)) errors.email = 'Email không đúng định dạng';
    if (Object.keys(errors).length) return toast.error(Object.values(errors)[0]);
    const nextSettings = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    );
    setSaving(true);
    try {
      const saved = await settingsApi.saveAll(nextSettings);
      setForm(saveStoreSettings(saved));
      toast.success('Đã lưu cài đặt hệ thống');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="settings-layout" onSubmit={save}>
      <section className="admin-card settings-card">
        <div className="settings-heading"><FiSettings /><div><h2>Thông tin cửa hàng</h2><p>Thông tin hiển thị trên website và hóa đơn.</p></div></div>
        <div className="form-grid">
          <label className="form-field full"><span>Tên cửa hàng</span><input value={form.storeName} onChange={(event) => update('storeName', event.target.value)} /></label>
          <label className="form-field"><span><FiPhone /> Hotline</span><input value={form.hotline} onChange={(event) => update('hotline', event.target.value)} /></label>
          <label className="form-field"><span><FiMail /> Email</span><input value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          <label className="form-field full"><span><FiMapPin /> Địa chỉ</span><textarea rows="3" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <AdminImageUpload label="Logo cửa hàng" value={form.logo} onChange={(value) => update('logo', value)} />
        </div>
      </section>
      <section className="admin-card settings-card">
        <div className="settings-heading"><FiGlobe /><div><h2>Mạng xã hội</h2><p>Các kênh chính thức của TechPhone.</p></div></div>
        <div className="form-grid">
          <label className="form-field full"><span>Facebook</span><input value={form.facebook} onChange={(event) => update('facebook', event.target.value)} /></label>
          <label className="form-field full"><span>Instagram</span><input value={form.instagram} onChange={(event) => update('instagram', event.target.value)} /></label>
          <label className="form-field full"><span>YouTube</span><input value={form.youtube} onChange={(event) => update('youtube', event.target.value)} /></label>
          <label className="form-field full"><span>Zalo URL (tùy chọn)</span><input value={form.zaloUrl || ''} onChange={(event) => update('zaloUrl', event.target.value)} placeholder="https://zalo.me/..." /></label>
        </div>
      </section>
      <div className="settings-actions">
        <button className="btn btn-primary" disabled={loading || saving}>
          <FiSave /> {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
        </button>
      </div>
    </form>
  );
}
