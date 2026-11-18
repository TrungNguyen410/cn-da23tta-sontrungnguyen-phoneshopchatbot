const BaseRepository = require('./baseRepository');
const PaymentTransaction = require('../models/PaymentTransaction');

class PaymentTransactionRepository extends BaseRepository {
  constructor() {
    super(PaymentTransaction);
  }

  async ensureIndexes() {
    await PaymentTransaction.init();
  }

  async create(payload, session) {
    await this.ensureIndexes();
    if (!session) return super.create(payload);
    const [transaction] = await PaymentTransaction.create([payload], { session });
    return transaction.toJSON();
  }

  // Earlier SePay transfers for an order that were too small to settle it on their own.
  async sumPartialTransfers(orderId, session) {
    const [row] = await PaymentTransaction.aggregate([
      { $match: { orderId, provider: 'sepay', responseCode: 'UNDERPAID', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).session(session || null);
    return { total: row?.total || 0, count: row?.count || 0 };
  }

  async findByReference(reference, session) {
    const doc = await PaymentTransaction.findOne({ reference }).session(session || null);
    return doc?.toJSON() || null;
  }
}

module.exports = new PaymentTransactionRepository();
