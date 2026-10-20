export const SHIPPING_PROVINCES = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Cần Thơ',
  'Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'Hưng Yên',
  'Huế',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'TP. Hồ Chí Minh',
  'Tuyên Quang',
  'Vĩnh Long',
];

export function getShippingQuote({ province = '', subtotal = 0 } = {}) {
  if (Number(subtotal) >= 10000000) return { fee: 0, eta: '1 ngày', provider: 'TechPhone Express' };
  if (province === 'TP. Hồ Chí Minh') return { fee: 20000, eta: '1 ngày', provider: 'TechPhone Express' };
  if (province === 'Hà Nội' || province === 'Đà Nẵng') return { fee: 30000, eta: '2 ngày', provider: 'TechPhone Express' };
  return { fee: 40000, eta: '4 ngày', provider: 'TechPhone Express' };
}
