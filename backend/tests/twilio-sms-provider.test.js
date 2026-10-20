const { TwilioProvider } = require('../src/services/smsProviders/twilioProvider');

describe('TwilioProvider', () => {
  it('sends Vietnamese numbers in E.164 form without exposing the OTP in logs', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: 'SM123' }),
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const provider = new TwilioProvider({
      accountSid: 'AC123',
      authToken: 'secret',
      from: '+15005550006',
      fetchImpl,
    });

    await expect(provider.send({ to: '0912345678', body: 'Ma xac minh TechPhone: 123456' }))
      .resolves.toEqual({ trackingId: 'SM123' });

    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    expect(request).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from('AC123:secret').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    expect(request.body.toString()).toContain('To=%2B84912345678');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('maps timeout and provider failures to a safe 503 error', async () => {
    const provider = new TwilioProvider({
      accountSid: 'AC123',
      authToken: 'secret',
      from: '+15005550006',
      fetchImpl: jest.fn().mockRejectedValue(new Error('socket timeout')),
    });

    await expect(provider.send({ to: '0912345678', body: 'secret body' }))
      .rejects.toMatchObject({ statusCode: 503 });
  });

  it('maps a non-2xx Twilio response to a safe 503 without exposing its body', async () => {
    const provider = new TwilioProvider({
      accountSid: 'AC123',
      authToken: 'secret',
      from: '+15005550006',
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'private Twilio quota details',
      }),
    });

    await expect(provider.send({ to: '0912345678', body: 'secret OTP body' }))
      .rejects.toMatchObject({
        statusCode: 503,
        message: expect.not.stringMatching(/Twilio|quota|OTP|429/i),
      });
  });
});
