const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const isConfigured = () => Boolean(env.gemini.apiKey);

// Calls the Gemini generateContent REST endpoint. The returned `content` is the
// model turn exactly as received so it can be echoed back during function calling.
const generate = async ({ systemInstruction, contents, tools = [] }) => {
  if (!isConfigured()) throw new AppError('Chatbot AI chưa được cấu hình GEMINI_API_KEY', 503);

  const body = buildBody({ systemInstruction, contents, tools });

  let response;
  try {
    response = await fetch(
      `${API_BASE}/models/${encodeURIComponent(env.gemini.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.gemini.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.gemini.timeoutMs),
      },
    );
  } catch (error) {
    throw new AppError(`Không kết nối được Gemini API: ${error.message}`, 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AppError(`Gemini API trả lỗi ${response.status}: ${detail.slice(0, 300)}`, 502);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content || { role: 'model', parts: [] };
  return {
    content: { role: 'model', parts: content.parts || [] },
    finishReason: candidate?.finishReason || '',
    usage: data.usageMetadata || {},
  };
};

const buildBody = ({ systemInstruction, contents, tools = [] }) => ({
  systemInstruction: { parts: [{ text: systemInstruction }] },
  contents,
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: env.gemini.maxOutputTokens,
  },
  ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
});

// Streams generateContent over SSE. Text is forwarded to onText as it arrives;
// the merged model turn (text + function calls) is returned like generate().
const stream = async ({ systemInstruction, contents, tools = [] }, onText = () => {}) => {
  if (!isConfigured()) throw new AppError('Chatbot AI chưa được cấu hình GEMINI_API_KEY', 503);

  let response;
  try {
    response = await fetch(
      `${API_BASE}/models/${encodeURIComponent(env.gemini.model)}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.gemini.apiKey,
        },
        body: JSON.stringify(buildBody({ systemInstruction, contents, tools })),
        signal: AbortSignal.timeout(env.gemini.timeoutMs),
      },
    );
  } catch (error) {
    throw new AppError(`Không kết nối được Gemini API: ${error.message}`, 502);
  }
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new AppError(`Gemini API trả lỗi ${response.status}: ${detail.slice(0, 300)}`, 502);
  }

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
