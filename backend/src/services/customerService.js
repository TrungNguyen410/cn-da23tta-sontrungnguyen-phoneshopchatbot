const orderRepository = require('../repositories/orderRepository');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { normalizeVietnamesePhone } = require('../utils/phone');

const customerUpdateFields = ['fullName', 'email', 'phone', 'address', 'role', 'status'];

class CustomerService {
  async list({ page = 1, limit = 20, search = '' } = {}) {
    const boundedPage = Math.min(Math.max(Number(page) || 1, 1), 1000000);
    const boundedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const boundedSearch = String(search || '').trim().slice(0, 100);
    const { items: customers, total } = await userRepository.findCustomersPage({
      page: boundedPage,
      limit: boundedLimit,
      search: boundedSearch,
    });
    const totals = await orderRepository.customerOrderTotals(customers.map((customer) => customer.id));
    const totalsByUser = new Map(totals.map((item) => [item._id, item]));
    const items = customers.map((customer) => ({
      ...customer,
      orderCount: totalsByUser.get(customer.id)?.orderCount || 0,
      totalSpent: totalsByUser.get(customer.id)?.totalSpent || 0,
    }));

    return {
      items,
      pagination: {
        page: boundedPage,
        limit: boundedLimit,
        total,
        totalPages: Math.ceil(total / boundedLimit),
      },
    };
  }

  async update(id, payload) {
    const dto = pick(payload, customerUpdateFields);
    if (Object.keys(dto).length === 0) throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
    if (Object.hasOwn(dto, 'phone')) {
      const phone = normalizeVietnamesePhone(dto.phone);
      if (!phone) throw new AppError('Số điện thoại Việt Nam không hợp lệ', 422);
      dto.phone = phone;
    }
    const existing = await userRepository.findById(id);
    if (!existing || existing.role !== 'customer') throw new AppError('Không tìm thấy khách hàng', 404);
    return userRepository.update(id, dto);
  }
}

module.exports = new CustomerService();
