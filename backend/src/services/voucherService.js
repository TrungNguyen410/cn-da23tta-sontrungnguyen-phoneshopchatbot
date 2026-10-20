const AppError = require('../utils/AppError');
const voucherRepository = require('../repositories/voucherRepository');

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

  async validate(code, subtotal) {
    const voucher = await voucherRepository.findByCode(code);
    if (!voucher || !voucher.active) throw new AppError('Mã giảm giá không hợp lệ', 400);
    if (voucher.quantity && voucher.used >= voucher.quantity) throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
    if (Number(subtotal) < voucher.minOrder) throw new AppError('Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá', 400);

    const today = new Date();
    const start = new Date(voucher.startDate);
    const end = new Date(voucher.endDate);
    end.setHours(23, 59, 59, 999);
    if (today < start || today > end) throw new AppError('Mã giảm giá chưa đến hạn hoặc đã hết hạn sử dụng', 400);

    return voucher;
  }

  async reserve(code, subtotal, session) {
    const voucher = await voucherRepository.reserve(code, subtotal, new Date(), session);
    if (voucher) return voucher;
    await this.validate(code, subtotal);
    throw new AppError('Không thể giữ lượt sử dụng mã giảm giá', 409);
  }

  async release(code, session) {
    return voucherRepository.release(code, session);
  }
}

module.exports = new VoucherService();
