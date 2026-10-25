const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const orderRepository = require('../repositories/orderRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const orderService = require('./orderService');
const vnpayProvider = require('./paymentProviders/vnpayProvider');
const withTransaction = require('../utils/withTransaction');
const { extractOrderNumber } = require('../utils/orderNumber');

const PAYMENT_URL_TTL_MS = 15 * 60 * 1000;
const SETTLED_PAYMENT_STATUSES = ['paid', 'refund_required', 'refunded'];

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

class PaymentService {
  getVnpayConfig() {
    return {
      ...env.vnpay,
      tmnCode: String(env.vnpay.tmnCode || '').trim(),
      hashSecret: String(env.vnpay.hashSecret || '').trim(),
    };
  }

  getConfig() {
    const bank = {
      name: String(env.bank.name || '').trim(),
      bin: String(env.bank.bin || '').trim(),
      accountNumber: String(env.bank.accountNumber || '').trim(),
      accountName: String(env.bank.accountName || '').trim(),
    };
    const momo = {
      phone: String(env.momo.phone || '').trim(),
      accountName: String(env.momo.accountName || '').trim(),
    };
    const bankEnabled = Boolean(
      bank.name && bank.bin && bank.accountNumber && bank.accountName,
    );
    const momoEnabled = Boolean(momo.phone && momo.accountName);
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
        momo: {
          enabled: momoEnabled,
          ...(momoEnabled
            ? { display: { phone: momo.phone, accountName: momo.accountName } }
            : {}),
        },
        vnpay: {
          enabled: Boolean(
            this.getVnpayConfig().tmnCode && this.getVnpayConfig().hashSecret,
          ),
          mode: env.nodeEnv === 'production' ? 'production' : 'sandbox',
        },
      },
    };
  }

  assertVnpayConfigured() {
    const config = this.getVnpayConfig();
    if (!config.tmnCode || !config.hashSecret) {
      throw new AppError('VNPay chưa được cấu hình. Vui lòng thêm VNPAY_TMN_CODE và VNPAY_HASH_SECRET.', 503);
    }
    return config;
  }

  async createVnpayCheckout(payload, user, metadata = {}) {
    const vnpayConfig = this.assertVnpayConfigured();

    const idempotencyKey = orderService.buildIdempotencyKey(
      metadata.idempotencyKey,
      user,
      payload.customer,
    );
    const order = await orderService.create(
      { ...payload, paymentMethod: 'card' },
      user,
      { idempotencyKey: metadata.idempotencyKey },
    );
    if (
      order.status === 'cancelled'
      || ['paid', 'refund_required', 'refunded'].includes(order.paymentStatus)
    ) {
      throw new AppError('Đơn hàng này đã được thanh toán', 409);
    }
    const reference =
      `${order.orderNumber}${Date.now().toString().slice(-6)}${crypto.randomBytes(3).toString('hex')}`;

    const paymentUrl = vnpayProvider.createPaymentUrl({
      amount: order.total,
      config: vnpayConfig,
      ipAddress: metadata.ipAddress,
      orderInfo: `Thanh toan don hang ${order.orderNumber}`,
      reference,
    });
    await paymentTransactionRepository.ensureIndexes();
    try {
      return await withTransaction(async (session) => {
        const currentOrder = await orderRepository.findById(order.id, { session });
        if (
          !currentOrder
          || currentOrder.status === 'cancelled'
          || ['paid', 'refund_required', 'refunded'].includes(currentOrder.paymentStatus)
        ) {
          throw new AppError('Đơn hàng này không còn đủ điều kiện thanh toán', 409);
        }

        const existing = await paymentTransactionRepository.findPendingByIdempotencyKey(
          idempotencyKey,
          session,
        );
        if (existing) {
          const stale =
            new Date(existing.createdAt).getTime() <= Date.now() - PAYMENT_URL_TTL_MS;
          if (!stale) {
            const payableOrder = await orderRepository.updateState(
              currentOrder.id,
              {
                status: { $ne: 'cancelled' },
                paymentStatus: { $in: ['pending', 'failed'] },
              },
              {
                paymentReference: existing.reference,
                paymentStatus: 'pending',
              },
              session,
            );
            if (!payableOrder) throw new AppError('Đơn hàng này không còn đủ điều kiện thanh toán', 409);
            return {
              order: payableOrder,
              paymentUrl: existing.rawResponse?.paymentUrl,
              transaction: existing,
            };
          }
          await paymentTransactionRepository.expirePendingBefore(
            idempotencyKey,
            new Date(Date.now() - PAYMENT_URL_TTL_MS),
            session,
          );
        }

        const transaction = await paymentTransactionRepository.create({
          orderId: currentOrder.id,
          provider: 'vnpay',
          method: 'card',
          amount: currentOrder.total,
          reference,
          idempotencyKey: idempotencyKey || undefined,
          activeIdempotencyKey: idempotencyKey || undefined,
          rawResponse: { paymentUrl },
        }, session);
        const payableOrder = await orderRepository.updateState(
          currentOrder.id,
          {
            status: { $ne: 'cancelled' },
            paymentStatus: { $in: ['pending', 'failed'] },
          },
          { paymentReference: reference, paymentStatus: 'pending' },
          session,
        );
        if (!payableOrder) throw new AppError('Đơn hàng này không còn đủ điều kiện thanh toán', 409);
        return { order: payableOrder, paymentUrl, transaction };
      });
    } catch (error) {
      if (idempotencyKey && error?.code === 11000) {
        const winner = await paymentTransactionRepository.findPendingByIdempotencyKey(
          idempotencyKey,
        );
        if (winner) {
          const winnerOrder = await orderRepository.findById(winner.orderId);
          if (
            !winnerOrder
            || winnerOrder.status === 'cancelled'
            || ['paid', 'refund_required', 'refunded'].includes(winnerOrder.paymentStatus)
          ) {
            throw new AppError('Đơn hàng này không còn đủ điều kiện thanh toán', 409);
          }
          return {
            order: winnerOrder,
            paymentUrl: winner.rawResponse?.paymentUrl,
            transaction: winner,
          };
        }
      }
      throw error;
    }
  }

  async processVnpayIpn(query) {
    if (!vnpayProvider.verifyCallback(query, this.getVnpayConfig().hashSecret)) {
      return { RspCode: '97', Message: 'Chữ ký không hợp lệ' };
    }

    const paid = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    return withTransaction(async (session) => {
      const transaction = await paymentTransactionRepository.findByReference(
        query.vnp_TxnRef,
        session,
      );
      if (!transaction) return { RspCode: '01', Message: 'Không tìm thấy đơn hàng' };
      if (Number(query.vnp_Amount) / 100 !== transaction.amount) {
        return { RspCode: '04', Message: 'Số tiền không hợp lệ' };
      }
      if (transaction.status === 'paid') {
        return { RspCode: '02', Message: 'Đơn hàng đã được xác nhận trước đó' };
      }
      const order = await orderRepository.findById(transaction.orderId, { session });
      if (!order) return { RspCode: '01', Message: 'Không tìm thấy đơn hàng' };
      if (order.paymentStatus === 'paid') {
        return { RspCode: '02', Message: 'Đơn hàng đã được xác nhận trước đó' };
      }

      await paymentTransactionRepository.settle(
        transaction.id,
        {
          status: paid ? 'paid' : 'failed',
          providerTransactionId: query.vnp_TransactionNo || '',
          bankCode: query.vnp_BankCode || '',
          responseCode: query.vnp_ResponseCode || '',
          rawResponse: query,
          paidAt: paid ? new Date() : null,
        },
        session,
      );
      if (paid) {
        const nextPaymentState = order.status === 'cancelled'
          ? { paymentStatus: 'refund_required' }
          : { paymentStatus: 'paid', status: 'confirmed' };
        const updatedOrder = await orderRepository.updateState(
          order.id,
          order.status === 'cancelled'
            ? { status: 'cancelled', paymentStatus: { $nin: ['paid', 'refunded'] } }
            : {
                status: { $ne: 'cancelled' },
                paymentStatus: { $nin: ['paid', 'refund_required', 'refunded'] },
              },
          nextPaymentState,
          session,
        );
        if (!updatedOrder) {
          throw new AppError('Trạng thái thanh toán của đơn hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        await paymentTransactionRepository.expireOtherPending(
          transaction.orderId,
          transaction.id,
          session,
        );
      } else {
        const activeAttempt = await paymentTransactionRepository.findPendingByOrderId(
          transaction.orderId,
          session,
        );
        if (!activeAttempt && order.status !== 'cancelled') {
          await orderRepository.updateState(
            transaction.orderId,
            {
              status: { $ne: 'cancelled' },
              paymentStatus: { $in: ['pending', 'failed'] },
            },
            { paymentStatus: 'failed' },
            session,
          );
        }
      }
      return { RspCode: '00', Message: 'Confirm Success' };
    });
  }

  verifyVnpayReturn(query) {
    return vnpayProvider.verifyCallback(query, this.getVnpayConfig().hashSecret);
  }

  createResultProof(query) {
    if (!this.verifyVnpayReturn(query)) return '';
    return jwt.sign(
      {
        provider: 'vnpay',
        reference: query.vnp_TxnRef || '',
        code: query.vnp_ResponseCode || '',
      },
      env.jwtAccessSecret,
      {
        expiresIn: '5m',
        audience: 'vnpay-result',
        issuer: 'techphone',
      },
    );
  }

  async reconcileManualPayment(orderId, payload, actor) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (!['bank', 'momo'].includes(order.paymentMethod)) {
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

  verifyResultProof(proof) {
    try {
      const payload = jwt.verify(proof, env.jwtAccessSecret, {
        audience: 'vnpay-result',
        issuer: 'techphone',
      });
      if (payload.provider !== 'vnpay') throw new Error('Nhà cung cấp thanh toán không hợp lệ');
      return {
        valid: true,
        reference: payload.reference,
        code: payload.code,
      };
    } catch {
      throw new AppError('Thông tin xác minh kết quả thanh toán không hợp lệ hoặc đã hết hạn', 400);
    }
  }
}

module.exports = new PaymentService();
