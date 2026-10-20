const { OtpDeliveryService } = require('../src/services/otpDeliveryService');

describe('OtpDeliveryService', () => {
  it('simulates SMS delivery without an external request outside production', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'development' } });

    await expect(service.send('sms', '0912345678', '654321')).resolves.toEqual({
      deliveryTarget: '091***678',
      trackingId: null,
    });
  });

  it('fails closed in production until a real SMS provider is configured', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'production' } });

    await expect(service.send('sms', '0912345678', '654321')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('delivers production OTPs through the configured SMS provider', async () => {
    const smsProvider = { send: jest.fn().mockResolvedValue({ trackingId: 'SM123' }) };
    const service = new OtpDeliveryService({
      config: {
        nodeEnv: 'production',
        sms: { accountSid: 'AC123', authToken: 'secret', from: '+15005550006' },
      },
      smsProvider,
    });

    await expect(service.send('sms', '0912345678', '654321', 'registration')).resolves.toEqual({
      deliveryTarget: '091***678',
      trackingId: 'SM123',
    });
    expect(smsProvider.send).toHaveBeenCalledWith({
      to: '0912345678',
      body: 'Mã xác minh TechPhone: 654321',
    });
  });

  it('rejects unsupported OTP channels', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'development' } });

    await expect(service.send('email', 'user@example.com', '654321')).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
