const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const orderRepository = require('../repositories/orderRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const orderService = require('./orderService');
const vnpayProvider = require('./paymentProviders/vnpayProvider');
const withTransaction = require('../utils/withTransaction');

const PAYMENT_URL_TTL_MS = 15 * 60 * 1000;

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
