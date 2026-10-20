const AppError = require('../../utils/AppError');

const toE164 = (phone) => `+84${String(phone).replace(/^0/, '')}`;

class TwilioProvider {
  constructor({ accountSid, authToken, from, fetchImpl = fetch }) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.from = from;
    this.fetchImpl = fetchImpl;
  }

  async send({ to, body }) {
    const form = new URLSearchParams({ To: toE164(to), From: this.from, Body: body });

    try {
      const response = await this.fetchImpl(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error(`SMS provider status ${response.status}`);
      const result = await response.json();
      return { trackingId: result.sid || null };
    } catch {
      throw new AppError('Không thể gửi SMS xác minh. Vui lòng thử lại sau.', 503);
    }
  }
}

module.exports = { TwilioProvider, toE164 };
