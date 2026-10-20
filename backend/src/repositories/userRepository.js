const BaseRepository = require('./baseRepository');
const User = require('../models/User');
const { normalizeVietnamesePhone } = require('../utils/phone');
const { buildRegex } = require('../utils/query');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByIdentifier(identifier, includePassword = false) {
    const rawIdentifier = String(identifier || '').trim();
    const phone = normalizeVietnamesePhone(rawIdentifier);
    const identifiers = [];
    if (phone) identifiers.push({ phone });
    if (rawIdentifier.includes('@')) identifiers.push({ email: rawIdentifier.toLowerCase() });
    if (!identifiers.length) return null;
    const query = User.findOne({
      isDeleted: false,
      $or: identifiers,
    });
    if (includePassword) query.select('+password');
    const user = await query;
    return user;
  }

  async findByEmail(email) {
    if (!email) return null;
    return User.findOne({ email: String(email).toLowerCase(), isDeleted: false });
  }

  async findByPhone(phone) {
    const normalized = normalizeVietnamesePhone(phone);
    if (!normalized) return null;
    return User.findOne({ phone: normalized, isDeleted: false });
  }

  async findByIdWithPassword(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('+password');
  }

  async findCustomersPage({ page, limit, search = '' }) {
    const filter = { role: 'customer' };
    if (search) {
      const pattern = buildRegex(search);
      filter.$or = [
        { fullName: pattern },
        { email: pattern },
        { phone: pattern },
      ];
    }
    const [items, total] = await Promise.all([
      this.findAll(filter, { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit }),
      this.count(filter),
    ]);
    return { items, total };
  }
}

module.exports = new UserRepository();
