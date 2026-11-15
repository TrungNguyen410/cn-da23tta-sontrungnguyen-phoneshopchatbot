const crypto = require('crypto');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');
const voucherRepository = require('../repositories/voucherRepository');

const GIFT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const giftCode = () => `TRIAN${Array.from(
  crypto.randomBytes(6),
  (byte) => GIFT_CODE_ALPHABET[byte % GIFT_CODE_ALPHABET.length],
).join('')}`;
const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

class VoucherService {
  async list() {
    return voucherRepository.findAll({}, { sort: { createdAt: -1 } });
  }

  async getById(id) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) throw new AppError('Không tìm thấy mã giảm giá', 404);
    return voucher;
  }

  async create(payload) {
    return voucherRepository.create({ ...payload, code: payload.code.toUpperCase() });
  }

  async update(id, payload) {
    const nextPayload = { ...payload };
    if (payload.code) nextPayload.code = payload.code.toUpperCase();
    return voucherRepository.update(id, nextPayload);
  }

  async remove(id) {
    return voucherRepository.softDelete(id);
  }

  async validate(code, subtotal, user = null) {
    const voucher = await voucherRepository.findByCode(code);
    if (!voucher || !voucher.active) throw new AppError('Mã giảm giá không hợp lệ', 400);
    // Someone else's gift voucher looks exactly like an unknown code.
    if (voucher.assignedUserId && voucher.assignedUserId !== user?.id) {
      throw new AppError('Mã giảm giá không hợp lệ', 400);
    }
    if (voucher.quantity && voucher.used >= voucher.quantity) throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
    if (Number(subtotal) < voucher.minOrder) throw new AppError('Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá', 400);

    const today = new Date();
    const start = new Date(voucher.startDate);
    const end = new Date(voucher.endDate);
    end.setHours(23, 59, 59, 999);
    if (today < start || today > end) throw new AppError('Mã giảm giá chưa đến hạn hoặc đã hết hạn sử dụng', 400);

    return voucher;
  }

  async reserve(code, subtotal, session, user = null) {
    const voucher = await voucherRepository.reserve(code, subtotal, new Date(), session, user?.id || null);
    if (voucher) return voucher;
    await this.validate(code, subtotal, user);
    throw new AppError('Không thể giữ lượt sử dụng mã giảm giá', 409);
  }

  async release(code, session) {
    return voucherRepository.release(code, session);
  }

  status(voucher, now = new Date()) {
    if (voucher.quantity && voucher.used >= voucher.quantity) return 'used';
    if (now > endOfDay(voucher.endDate)) return 'expired';
    if (!voucher.active) return 'inactive';
    if (now < new Date(voucher.startDate)) return 'upcoming';
    return 'available';
  }

  async listForUser(userId) {
    const vouchers = await voucherRepository.findAssignedTo(userId);
    return vouchers.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrder: voucher.minOrder,
      maxDiscount: voucher.maxDiscount,
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      note: voucher.note,
      status: this.status(voucher),
    }));
  }

  // One-use voucher for a loyal customer, generated from the dashboard's top-customer list.
  async giftToCustomer(customerId, payload) {
    const customer = await userRepository.findById(customerId);
    if (!customer || customer.role !== 'customer') throw new AppError('Không tìm thấy khách hàng', 404);
    if (endOfDay(payload.endDate) < new Date()) throw new AppError('Ngày hết hạn phải từ hôm nay trở đi', 422);
    const fields = {
      type: payload.type,
      value: Number(payload.value),
      minOrder: Number(payload.minOrder || 0),
      maxDiscount: payload.type === 'percent' ? Number(payload.maxDiscount || 0) : 0,
      quantity: 1,
      used: 0,
      startDate: new Date(),
      endDate: new Date(payload.endDate),
      active: true,
      assignedUserId: customer.id,
      note: String(payload.note || '').trim() || `Tri ân khách hàng ${customer.fullName}`,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await voucherRepository.create({ ...fields, code: giftCode() });
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
    throw new AppError('Không tạo được mã voucher, vui lòng thử lại', 503);
  }
}

module.exports = new VoucherService();
