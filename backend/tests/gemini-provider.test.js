const env = require('../src/config/env');
const geminiProvider = require('../src/services/aiProviders/geminiProvider');

describe('Gemini provider', () => {
  const original = { ...env.gemini };
  const originalFetch = global.fetch;

  afterEach(() => {
    Object.assign(env.gemini, original);
    global.fetch = originalFetch;
    geminiProvider.resetCooldowns();
  });

  it('skips a model whose quota is exhausted instead of retrying it', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'backup-model' });
    const quota = { ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED' };
    global.fetch = jest.fn().mockResolvedValue(quota);

    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] })).rejects.toMatchObject({ statusCode: 502 });
    expect(global.fetch.mock.calls.map(([url]) => url.match(/models\/([^:]+)/)[1])).toEqual(['primary-model', 'backup-model']);
    expect(geminiProvider.status().quotaExhausted).toEqual(['primary-model', 'backup-model']);

    global.fetch.mockClear();
    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] })).rejects.toMatchObject({ statusCode: 429 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reports configuration from GEMINI_API_KEY', () => {
    env.gemini.apiKey = '';
    expect(geminiProvider.isConfigured()).toBe(false);
    env.gemini.apiKey = 'key';
    expect(geminiProvider.isConfigured()).toBe(true);
  });

  it('posts system instruction, history and tools to generateContent', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'gemini-test', maxOutputTokens: 256 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: 'Xin chào' }] } }],
        usageMetadata: { totalTokenCount: 12 },
      }),
    });

    const result = await geminiProvider.generate({
      systemInstruction: 'Bạn là trợ lý',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      tools: [{ name: 'search_products', parameters: { type: 'object', properties: {} } }],
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe('Bạn là trợ lý');
    expect(body.tools[0].functionDeclarations[0].name).toBe('search_products');
    expect(body.generationConfig.maxOutputTokens).toBe(256);
    expect(result.content.parts[0].text).toBe('Xin chào');
    expect(result.usage.totalTokenCount).toBe(12);
  });

  it('turns API errors into 502 AppErrors without leaking the key', async () => {
    Object.assign(env.gemini, { apiKey: 'secret-key' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'quota' });

    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] }))
      .rejects.toMatchObject({ statusCode: 502, message: expect.not.stringContaining('secret-key') });
  });

  it('parses streamed SSE chunks, forwarding text and keeping function calls', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'gemini-test' });
    const encoder = new TextEncoder();
    const event = (parts) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts } }] })}\r\n\r\n`;
    const raw = event([{ text: 'Xin ' }]) + event([{ text: 'chào' }]) + event([{ functionCall: { name: 'search_products', args: {} } }]);
    // Split mid-event to make sure the parser buffers partial chunks.
    const body = [encoder.encode(raw.slice(0, 25)), encoder.encode(raw.slice(25))];
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body });
    const deltas = [];

    const result = await geminiProvider.stream(
      { systemInstruction: 'x', contents: [] },
      (text) => deltas.push(text),
    );

    expect(global.fetch.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:streamGenerateContent?alt=sse');
    expect(deltas).toEqual(['Xin ', 'chào']);
    expect(result.content.parts).toEqual([
      { text: 'Xin chào' },
      { functionCall: { name: 'search_products', args: {} } },
    ]);
  });

  it('retries overloaded models and then switches to the fallback model', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'backup-model' });
    const overloaded = { ok: false, status: 503, text: async () => 'high demand' };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(overloaded)
      .mockResolvedValueOnce(overloaded)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] }),
      });

    const result = await geminiProvider.generate({ systemInstruction: '', contents: [] });

    expect(global.fetch.mock.calls.map(([url]) => url.match(/models\/([^:]+)/)[1]))
      .toEqual(['primary-model', 'primary-model', 'backup-model']);
    expect(result.content.parts[0].text).toBe('ok');
  });

  it('sends toolConfig NONE when a text answer is forced', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: '' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] }),
    });

    await geminiProvider.generate({ systemInstruction: '', contents: [], tools: [{ name: 'search_products' }], toolMode: 'NONE' });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.toolConfig).toEqual({ functionCallingConfig: { mode: 'NONE' } });
    expect(body.tools[0].functionDeclarations[0].name).toBe('search_products');
  });

  it('walks a comma-separated fallback list when quotas run out', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'lite-a, lite-b' });
    const quota = { ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED' };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(quota)
      .mockResolvedValueOnce(quota)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] }),
      });

    const result = await geminiProvider.generate({ systemInstruction: '', contents: [] });

    expect(global.fetch.mock.calls.map(([url]) => url.match(/models\/([^:]+)/)[1]))
      .toEqual(['primary-model', 'lite-a', 'lite-b']);
    expect(result.content.parts[0].text).toBe('ok');
    expect(geminiProvider.status()).toMatchObject({
      fallbackModel: 'lite-a, lite-b',
      quotaExhausted: ['primary-model', 'lite-a'],
    });
  });

  it('waits between real requests only, not for models skipped while cooling down', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'lite-a' });
    const ok = { ok: true, json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] }) };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED' })
      .mockResolvedValue(ok);
    await geminiProvider.generate({ systemInstruction: '', contents: [] });

    // Primary is now cooling down: the next call goes straight to the fallback without any delay.
    const previousEnv = env.nodeEnv;
    env.nodeEnv = 'development';
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn().mockResolvedValue(ok);
      const result = await geminiProvider.generate({ systemInstruction: '', contents: [] });
      expect(result.content.parts[0].text).toBe('ok');
      expect(global.fetch.mock.calls.map(([url]) => url.match(/models\/([^:]+)/)[1])).toEqual(['lite-a']);
    } finally {
      jest.useRealTimers();
      env.nodeEnv = previousEnv;
    }
  });

  it('tries the fallback model when the primary times out or is unreachable', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'lite-a' });
    global.fetch = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] }),
      });

    const result = await geminiProvider.generate({ systemInstruction: '', contents: [] });

    // The timed-out primary is not retried; the fallback answers.
    expect(global.fetch.mock.calls.map(([url]) => url.match(/models\/([^:]+)/)[1])).toEqual(['primary-model', 'lite-a']);
    expect(result.content.parts[0].text).toBe('ok');
  });

  it('reports a connection error when every model is unreachable', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'lite-a' });
    global.fetch = jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] }))
      .rejects.toMatchObject({ statusCode: 502, message: expect.stringContaining('Không kết nối được Gemini API') });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors such as an invalid key', async () => {
    Object.assign(env.gemini, { apiKey: 'test-key', model: 'primary-model', fallbackModel: 'backup-model' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'API_KEY_INVALID' });

    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] })).rejects.toMatchObject({ statusCode: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('refuses to run without an API key', async () => {
    env.gemini.apiKey = '';
    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] }))
      .rejects.toMatchObject({ statusCode: 503 });
  });
});
