const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Overloaded models (500/503) are retried once, then the fallback models are tried in order.
const OVERLOADED_STATUSES = new Set([500, 503]);
const RETRY_DELAY_MS = 1200;
// A 429 means the quota (free tier: requests per day per model) is used up, so retrying is
// pointless: the model is skipped for a while and the chatbot answers offline immediately.
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
const cooldownUntil = new Map();

const isConfigured = () => Boolean(env.gemini.apiKey);

const isCoolingDown = (model) => (cooldownUntil.get(model) || 0) > Date.now();

// GEMINI_FALLBACK_MODEL may list several models separated by commas; each one has its own
// free-tier quota, so the chatbot keeps answering with AI after the primary model runs out.
const fallbackModels = () => String(env.gemini.fallbackModel || '')
  .split(',')
  .map((model) => model.trim())
  .filter((model) => model && model !== env.gemini.model);

const status = () => ({
  configured: isConfigured(),
  model: env.gemini.model,
  fallbackModel: fallbackModels().join(', '),
  quotaExhausted: [env.gemini.model, ...fallbackModels()].filter((model) => model && isCoolingDown(model)),
});

const resetCooldowns = () => cooldownUntil.clear();

// toolMode 'NONE' keeps the tool declarations (the history has function calls) but forces a text answer.
const buildBody = ({ systemInstruction, contents, tools = [], toolMode }) => ({
  systemInstruction: { parts: [{ text: systemInstruction }] },
  contents,
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: env.gemini.maxOutputTokens,
  },
  ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
  ...(tools.length && toolMode ? { toolConfig: { functionCallingConfig: { mode: toolMode } } } : {}),
});

const modelAttempts = () => [env.gemini.model, env.gemini.model, ...fallbackModels()];

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// POSTs to models/<model>:<method>, retrying overloaded models. Returns the ok Response.
const post = async (method, payload) => {
  if (!isConfigured()) throw new AppError('Chatbot AI chưa được cấu hình GEMINI_API_KEY', 503);

  const attempts = modelAttempts();
  let lastError = new AppError('Gemini API đã hết hạn mức, tạm dùng chế độ offline', 429);
  for (let index = 0; index < attempts.length; index += 1) {
    const model = attempts[index];
    if (isCoolingDown(model)) continue;
    if (index > 0) await wait(env.nodeEnv === 'test' ? 0 : RETRY_DELAY_MS);
    let response;
    try {
      response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.gemini.apiKey,
        },
        body: JSON.stringify(buildBody(payload)),
        signal: AbortSignal.timeout(env.gemini.timeoutMs),
      });
    } catch (error) {
      throw new AppError(`Không kết nối được Gemini API: ${error.message}`, 502);
    }
    if (response.ok) return response;

    const detail = await response.text().catch(() => '');
    lastError = new AppError(`Gemini API trả lỗi ${response.status}: ${detail.slice(0, 300)}`, 502);
    if (response.status === 429) {
      cooldownUntil.set(model, Date.now() + QUOTA_COOLDOWN_MS);
    } else if (!OVERLOADED_STATUSES.has(response.status)) {
      throw lastError;
    }
  }
  throw lastError;
};

// Calls generateContent. The returned `content` is the model turn exactly as received
// (including thought signatures) so it can be echoed back during function calling.
const generate = async (payload) => {
  const response = await post('generateContent', payload);
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content || { role: 'model', parts: [] };
  return {
    content: { role: 'model', parts: content.parts || [] },
    finishReason: candidate?.finishReason || '',
    usage: data.usageMetadata || {},
  };
};

// Streams generateContent over SSE. Text is forwarded to onText as it arrives;
// the merged model turn (text + function calls) is returned like generate().
const stream = async (payload, onText = () => {}) => {
  const response = await post('streamGenerateContent?alt=sse', payload);
  if (!response.body) throw new AppError('Gemini API không trả về dữ liệu stream', 502);

  const parts = [];
  let text = '';
  let finishReason = '';
  const handleEvent = (raw) => {
    const data = raw.split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('');
    if (!data) return;
    const chunk = JSON.parse(data);
    const candidate = chunk.candidates?.[0];
    finishReason = candidate?.finishReason || finishReason;
    for (const part of candidate?.content?.parts || []) {
      if (typeof part.text === 'string' && !part.thought && !part.functionCall) {
        text += part.text;
        onText(part.text);
      } else {
        parts.push(part);
      }
    }
  };

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      handleEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) handleEvent(buffer);

  return {
    content: { role: 'model', parts: text ? [{ text }, ...parts] : parts },
    finishReason,
  };
};

module.exports = {
  generate,
  isConfigured,
  resetCooldowns,
  status,
  stream,
};
