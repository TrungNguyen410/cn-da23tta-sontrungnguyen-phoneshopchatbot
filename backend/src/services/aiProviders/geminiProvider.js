const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Overload / rate-limit statuses are retried (once on the primary model, then on the fallback model).
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAY_MS = 1200;

const isConfigured = () => Boolean(env.gemini.apiKey);

const buildBody = ({ systemInstruction, contents, tools = [] }) => ({
  systemInstruction: { parts: [{ text: systemInstruction }] },
  contents,
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: env.gemini.maxOutputTokens,
  },
  ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
});

const modelAttempts = () => {
  const primary = env.gemini.model;
  const fallback = env.gemini.fallbackModel;
  return [primary, primary, ...(fallback && fallback !== primary ? [fallback] : [])];
};

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// POSTs to models/<model>:<method>, retrying overloaded models. Returns the ok Response.
const post = async (method, payload) => {
  if (!isConfigured()) throw new AppError('Chatbot AI chưa được cấu hình GEMINI_API_KEY', 503);

  const attempts = modelAttempts();
  let lastError;
  for (let index = 0; index < attempts.length; index += 1) {
    if (index > 0) await wait(env.nodeEnv === 'test' ? 0 : RETRY_DELAY_MS);
    let response;
    try {
      response = await fetch(`${API_BASE}/models/${encodeURIComponent(attempts[index])}:${method}`, {
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
    if (!RETRYABLE_STATUSES.has(response.status)) throw lastError;
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

module.exports = { generate, isConfigured, stream };
