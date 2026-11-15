import { SHIPPING_PROVINCES } from '../../utils/shipping';
import { matchWard } from '../../utils/wards';

// Receiver form shared by checkout and the account page. Since 01/07/2025 an address is
// province + ward/commune (no district), so the ward list follows the chosen province.
export default function ShippingAddressFields({ idPrefix, value, errors = {}, onChange, wards = [], wardsFailed = false }) {
  const errorProps = (key) => ({
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `${idPrefix}-${key}-error` : undefined,
  });
  const errorText = (key) => errors[key] && <small id={`${idPrefix}-${key}-error`}>{errors[key]}</small>;
  const listId = `${idPrefix}-ward-options`;
  const changeProvince = (province) => {
    onChange('province', province);
    onChange('ward', '');
  };
  const settleWard = () => {
    const official = matchWard(wards, value.ward);
    if (official && official !== value.ward) onChange('ward', official);
  };

  return (
    <div className="form-grid">
      <label className="form-field">
        <span>Họ và tên *</span>
        <input {...errorProps('fullName')} autoComplete="name" value={value.fullName} onChange={(event) => onChange('fullName', event.target.value)} />
        {errorText('fullName')}
      </label>
      <label className="form-field">
        <span>Số điện thoại *</span>
        <input {...errorProps('phone')} type="tel" autoComplete="tel" value={value.phone} onChange={(event) => onChange('phone', event.target.value)} />
        {errorText('phone')}
      </label>
      <label className="form-field full">
        <span>Email *</span>
        <input {...errorProps('email')} type="email" autoComplete="email" value={value.email} onChange={(event) => onChange('email', event.target.value)} />
        {errorText('email')}
      </label>
      <label className="form-field">
        <span>Tỉnh/thành phố *</span>
        <select {...errorProps('province')} value={value.province} onChange={(event) => changeProvince(event.target.value)}>
          <option value="">Chọn tỉnh/thành phố</option>
          {SHIPPING_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
        </select>
        {errorText('province')}
      </label>
      <label className="form-field">
        <span>Phường/xã/đặc khu *</span>
        <input
          {...errorProps('ward')}
          list={wards.length ? listId : undefined}
          value={value.ward}
          disabled={!value.province}
          placeholder={value.province ? 'Gõ để tìm, ví dụ: Sài Gòn' : 'Chọn tỉnh/thành trước'}
          onChange={(event) => onChange('ward', event.target.value)}
          onBlur={settleWard}
        />
        {wards.length > 0 && (
          <datalist id={listId}>
            {wards.map((ward) => <option key={ward} value={ward} />)}
          </datalist>
        )}
        {errorText('ward') || (wardsFailed && <small className="field-hint">Không tải được danh sách phường/xã, bạn có thể nhập tay.</small>)}
      </label>
      <label className="form-field full">
        <span>Số nhà, tên đường *</span>
        <input {...errorProps('address')} autoComplete="street-address" value={value.address} placeholder="Ví dụ: 12 Lê Lợi" onChange={(event) => onChange('address', event.target.value)} />
        {errorText('address')}
      </label>
    </div>
  );
}
