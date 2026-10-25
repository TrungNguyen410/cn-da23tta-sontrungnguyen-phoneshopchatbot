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

  async findPendingByIdempotencyKey(idempotencyKey, session) {
    if (!idempotencyKey) return null;
    await this.ensureIndexes();
    const doc = await PaymentTransaction.findOne({
      status: 'pending',
      $or: [
        { activeIdempotencyKey: idempotencyKey },
        { idempotencyKey, activeIdempotencyKey: { $exists: false } },
      ],
    }).session(session || null);
    return doc?.toJSON() || null;
  }

  async expirePendingBefore(idempotencyKey, cutoff, session) {
    if (!idempotencyKey) return null;
    const doc = await PaymentTransaction.findOneAndUpdate(
      { idempotencyKey, status: 'pending', createdAt: { $lte: cutoff } },
      { $set: { status: 'expired' }, $unset: { activeIdempotencyKey: 1 } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return doc?.toJSON() || null;
  }

  async findPendingByOrderId(orderId, session) {
    const doc = await PaymentTransaction.findOne({ orderId, status: 'pending' })
      .session(session || null);
    return doc?.toJSON() || null;
  }

  async expireOtherPending(orderId, transactionId, session) {
    return PaymentTransaction.updateMany(
      { orderId, _id: { $ne: transactionId }, status: 'pending' },
      { $set: { status: 'expired' }, $unset: { activeIdempotencyKey: 1 } },
      { session },
    );
  }

  async settle(id, payload, session) {
    const doc = await PaymentTransaction.findOneAndUpdate(
      { _id: id, status: { $ne: 'paid' } },
      { $set: payload, $unset: { activeIdempotencyKey: 1 } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return doc?.toJSON() || null;
  }
}

module.exports = new PaymentTransactionRepository();
