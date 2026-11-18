const crypto = require('crypto');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const orderRepository = require('../repositories/orderRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const withTransaction = require('../utils/withTransaction');
const { extractOrderNumber } = require('../utils/orderNumber');

const SETTLED_PAYMENT_STATUSES = ['paid', 'refund_required', 'refunded'];

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

class PaymentService {
  getConfig() {
    const bank = {
      name: String(env.bank.name || '').trim(),
      bin: String(env.bank.bin || '').trim(),
      accountNumber: String(env.bank.accountNumber || '').trim(),
      accountName: String(env.bank.accountName || '').trim(),
    };
    const bankEnabled = Boolean(
      bank.name && bank.bin && bank.accountNumber && bank.accountName,
    );
    return {
      providers: {
        cod: { enabled: true },
        bank: {
          enabled: bankEnabled,
          ...(bankEnabled
            ? {
                autoConfirm: Boolean(env.sepay?.webhookApiKey),
                display: {
                  bankName: bank.name,
                  bankBin: bank.bin,
                  accountNumber: bank.accountNumber,
                  accountName: bank.accountName,
                },
              }
            : {}),
        },
      },
    };
  }

  async reconcileManualPayment(orderId, payload, actor) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (order.paymentMethod !== 'bank') {
      throw new AppError('Đơn hàng không dùng thanh toán thủ công', 409);
    }
    if (!['pending', 'failed'].includes(order.paymentStatus)) {
      throw new AppError('Thanh toán đã được đối soát', 409);
    }
    if (payload.status === order.paymentStatus) {
      throw new AppError('Thanh toán đã ở trạng thái này', 409);
    }

    const shouldConfirmOrder = payload.status === 'paid' && order.status === 'pending';
    const updatedOrder = await orderRepository.updateState(
      orderId,
      {
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        ...(shouldConfirmOrder ? { status: order.status } : {}),
      },
      {
        paymentStatus: payload.status,
        paymentReference: payload.reference || '',
        paymentAudit: {
          confirmedBy: actor.id,
          confirmedAt: new Date(),
          note: payload.note || '',
        },
        ...(shouldConfirmOrder ? { status: 'confirmed' } : {}),
      },
    );
    if (!updatedOrder) {
      throw new AppError('Trạng thái thanh toán vừa thay đổi. Vui lòng thử lại.', 409);
    }
    return updatedOrder;
  }

  assertSepayAuthorized(authorization) {
    const apiKey = String(env.sepay?.webhookApiKey || '').trim();
    if (!apiKey) throw new AppError('SePay chưa được cấu hình', 503);
    const match = /^Apikey\s+(.+)$/i.exec(String(authorization || '').trim());
    if (!match || !safeEqual(match[1].trim(), apiKey)) {
      throw new AppError('Webhook SePay không hợp lệ', 401);
    }
  }

  extractOrderNumber(...texts) {
    return extractOrderNumber(...texts);
  }

  async processSepayWebhook(payload = {}, authorization = '') {
    this.assertSepayAuthorized(authorization);

    const providerTransactionId = String(payload.id ?? '').trim();
    const amount = Number(payload.transferAmount);
    if (!providerTransactionId || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Dữ liệu webhook SePay không hợp lệ', 400);
    }
    if (String(payload.transferType || '').toLowerCase() !== 'in') {
      return { matched: false, reason: 'not_incoming' };
    }

    const orderNumber = this.extractOrderNumber(payload.code, payload.content, payload.description);
    if (!orderNumber) return { matched: false, reason: 'order_number_missing' };

    const reference = `SEPAY-${providerTransactionId}`;
    await paymentTransactionRepository.ensureIndexes();
    try {
      return await withTransaction(async (session) => {
        if (await paymentTransactionRepository.findByReference(reference, session)) {
          return { matched: true, duplicate: true, orderNumber };
        }

        const order = await orderRepository.findByOrderNumber(orderNumber, session);
        if (!order || order.paymentMethod !== 'bank') {
          return { matched: false, reason: 'order_not_found', orderNumber };
        }

        const alreadySettled = SETTLED_PAYMENT_STATUSES.includes(order.paymentStatus);
        // Customers may split a payment over several transfers (daily bank limits), so earlier
        // short transfers count towards the total.
        const earlier = alreadySettled
          ? { total: 0, count: 0 }
          : await paymentTransactionRepository.sumPartialTransfers(order.id, session);
        const received = earlier.total + amount;
        const fullyPaid = !alreadySettled && received >= order.total;
        let responseCode = 'UNDERPAID';
        if (alreadySettled) responseCode = 'OVERPAID';
        else if (fullyPaid) responseCode = 'MATCHED';
        await paymentTransactionRepository.create({
          orderId: order.id,
          provider: 'sepay',
          method: 'bank',
          amount,
          reference,
          status: fullyPaid ? 'paid' : 'failed',
          providerTransactionId,
          bankCode: String(payload.gateway || ''),
          responseCode,
          rawResponse: payload,
          paidAt: fullyPaid ? new Date() : null,
        }, session);

        if (alreadySettled) {
          // Money for an order that is already settled (e.g. the QR was paid twice) must be refunded,
          // so it is written on the order where admins see the payment audit.
          const extra = `Nhận thêm ${amount.toLocaleString('vi-VN')}đ (${reference}) sau khi đơn đã thanh toán, cần hoàn cho khách.`;
          await orderRepository.updateState(order.id, {}, {
            'paymentAudit.note': [order.paymentAudit?.note, extra].filter(Boolean).join(' '),
          }, session);
          return { matched: true, orderNumber, paymentStatus: order.paymentStatus, duplicate: true, overpaid: true };
        }
        if (!fullyPaid) {
          return { matched: true, orderNumber, paymentStatus: order.paymentStatus, underpaid: true };
        }

        const cancelled = order.status === 'cancelled';
        const updatedOrder = await orderRepository.updateState(
          order.id,
          { paymentStatus: { $nin: SETTLED_PAYMENT_STATUSES } },
          {
            paymentStatus: cancelled ? 'refund_required' : 'paid',
            paymentReference: reference,
            paymentAudit: {
              confirmedBy: null,
              confirmedAt: new Date(),
              note: earlier.count
                ? `Tự động xác nhận qua SePay (${payload.gateway || 'ngân hàng'}), đã nhận đủ qua ${earlier.count + 1} lần chuyển`
                : `Tự động xác nhận qua SePay (${payload.gateway || 'ngân hàng'})`,
            },
            ...(!cancelled && order.status === 'pending' ? { status: 'confirmed' } : {}),
          },
          session,
        );
        if (!updatedOrder) {
          throw new AppError('Trạng thái thanh toán của đơn hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return { matched: true, orderNumber, paymentStatus: updatedOrder.paymentStatus };
      });
    } catch (error) {
      if (error?.code === 11000) return { matched: true, duplicate: true, orderNumber };
      throw error;
    }
  }
}

module.exports = new PaymentService();
