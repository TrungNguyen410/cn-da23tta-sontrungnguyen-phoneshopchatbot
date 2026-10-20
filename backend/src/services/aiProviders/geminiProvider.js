const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const isConfigured = () => Boolean(env.gemini.apiKey);

// Calls the Gemini generateContent REST endpoint. The returned `content` is the
// model turn exactly as received so it can be echoed back during function calling.
const generate = async ({ systemInstruction, contents, tools = [] }) => {
  if (!isConfigured()) throw new AppError('Chatbot AI chưa được cấu hình GEMINI_API_KEY', 503);

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: env.gemini.maxOutputTokens,
    },
    ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
  };

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

module.exports = { generate, isConfigured };
