const env = require('../src/config/env');
const geminiProvider = require('../src/services/aiProviders/geminiProvider');

describe('Gemini provider', () => {
  const original = { ...env.gemini };
  const originalFetch = global.fetch;

  afterEach(() => {
    Object.assign(env.gemini, original);
    global.fetch = originalFetch;
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

  it('refuses to run without an API key', async () => {
    env.gemini.apiKey = '';
    await expect(geminiProvider.generate({ systemInstruction: '', contents: [] }))
      .rejects.toMatchObject({ statusCode: 503 });
  });
});
