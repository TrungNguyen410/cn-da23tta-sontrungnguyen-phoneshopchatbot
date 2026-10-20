const {
  createPaymentUrl,
  signParams,
  verifyCallback,
} = require('../src/services/paymentProviders/vnpayProvider');

describe('VNPay provider', () => {
  const config = {
    tmnCode: 'TESTCODE',
    hashSecret: 'test-vnpay-secret',
    paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: 'http://localhost:5000/api/payments/vnpay/return',
    version: '2.1.0',
  };

  it('creates a signed sandbox URL without collecting card details', () => {
    const url = new URL(
      createPaymentUrl({
        amount: 125000,
        config,
        ipAddress: '127.0.0.1',
        orderInfo: 'Thanh toan don hang TP001',
        reference: 'TP001',
        now: new Date(2026, 6, 28, 10, 30, 0),
      }),
    );

    expect(url.origin + url.pathname).toBe(config.paymentUrl);
    expect(url.searchParams.get('vnp_Amount')).toBe('12500000');
    expect(url.searchParams.get('vnp_TxnRef')).toBe('TP001');
    expect(url.searchParams.get('vnp_SecureHash')).toHaveLength(128);
  });

  it('accepts only callbacks whose signed fields are unchanged', () => {
    const query = {
      vnp_Amount: '12500000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'TP001',
    };
    const signed = { ...query, vnp_SecureHash: signParams(query, config.hashSecret) };

    expect(verifyCallback(signed, config.hashSecret)).toBe(true);
    expect(verifyCallback({ ...signed, vnp_Amount: '100' }, config.hashSecret)).toBe(false);
  });
});
