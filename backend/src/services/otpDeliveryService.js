const env = require('../config/env');
const AppError = require('../utils/AppError');
const { maskPhone } = require('../utils/phone');
const { TwilioProvider } = require('./smsProviders/twilioProvider');

const createSmsProvider = (config, smsProvider) => {
  const sms = config.sms || {};
  const values = [sms.accountSid, sms.authToken, sms.from];

  if (values.every(Boolean)) return smsProvider || new TwilioProvider(sms);
  return null;
};

class OtpDeliveryService {
  constructor({ config = env, smsProvider } = {}) {
    this.config = config;
    this.smsProvider = createSmsProvider(config, smsProvider);
  }

  async sms(target, code) {
    if (this.smsProvider) {
      const { trackingId } = await this.smsProvider.send({
        to: target,
        body: `Mã xác minh TechPhone: ${code}`,
      });
      return { deliveryTarget: maskPhone(target), trackingId };
    }

    if (this.config.nodeEnv === 'production') {
      throw new AppError('Dịch vụ SMS chưa được cấu hình. Vui lòng thử lại sau.', 503);
    }

    return { deliveryTarget: maskPhone(target), trackingId: null };
  }

  async send(channel, target, code) {
    if (channel !== 'sms') throw new AppError('Kênh nhận OTP không được hỗ trợ', 422);
    return this.sms(target, code);
  }
}

module.exports = new OtpDeliveryService();
module.exports.OtpDeliveryService = OtpDeliveryService;
module.exports.createSmsProvider = createSmsProvider;
