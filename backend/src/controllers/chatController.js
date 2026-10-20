const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const pick = require('../utils/pick');
const chatService = require('../services/chatService');
const knowledgeService = require('../services/knowledgeService');

const knowledgeFields = ['title', 'category', 'content', 'keywords', 'active'];

const sendMessage = asyncHandler(async (req, res) => {
  const result = await chatService.sendMessage({
    message: req.body.message,
    sessionId: req.body.sessionId,
    visitorId: req.body.visitorId,
    user: req.user,
  });
  successResponse(res, result, 'Chat reply generated', 201);
});

// Server-Sent Events: session → delta* → done (or error). Errors raised before the
// first event still go through the normal JSON error handler.
const streamMessage = async (req, res, next) => {
  let started = false;
  const send = (event) => {
    if (!started) {
      res.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      started = true;
    }
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const result = await chatService.sendMessage(
      {
        message: req.body.message,
        sessionId: req.body.sessionId,
        visitorId: req.body.visitorId,
        user: req.user,
      },
      {
        onSession: (sessionId) => send({ type: 'session', sessionId }),
        onDelta: (text) => send({ type: 'delta', text }),
        onReset: () => send({ type: 'reset' }),
      },
    );
    send({ type: 'done', ...result });
    res.end();
  } catch (error) {
    if (!started) return next(error);
    send({ type: 'error', message: 'Xin lỗi, trợ lý đang gặp sự cố. Vui lòng thử lại.' });
    res.end();
  }
  return undefined;
};

const getConfig = asyncHandler(async (_req, res) => {
  successResponse(res, await chatService.getConfig(), 'Chatbot config retrieved');
});

const updateConfig = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['enabled', 'greeting', 'quickQuestions']);
  successResponse(res, await chatService.updateConfig(payload), 'Chatbot config updated');
});

const getSession = asyncHandler(async (req, res) => {
  const result = await chatService.getSession(req.params.id, {
    user: req.user,
    visitorId: req.query.visitorId,
  });
  successResponse(res, result, 'Chat session retrieved');
});

const feedback = asyncHandler(async (req, res) => {
  const result = await chatService.setFeedback(req.params.id, req.body.value, {
    user: req.user,
    visitorId: req.body.visitorId,
  });
  successResponse(res, result, 'Feedback saved');
});

const listSessionsAdmin = asyncHandler(async (req, res) => {
  successResponse(res, await chatService.listSessionsAdmin(req.query), 'Chat sessions retrieved');
});

const getSessionAdmin = asyncHandler(async (req, res) => {
  successResponse(res, await chatService.getSessionAdmin(req.params.id), 'Chat session retrieved');
});

const statsAdmin = asyncHandler(async (_req, res) => {
  successResponse(res, await chatService.statsAdmin(), 'Chat statistics retrieved');
});

const listKnowledge = asyncHandler(async (_req, res) => {
  successResponse(res, await knowledgeService.list(), 'Knowledge articles retrieved');
});

const createKnowledge = asyncHandler(async (req, res) => {
  successResponse(res, await knowledgeService.create(pick(req.body, knowledgeFields)), 'Knowledge article created', 201);
});

const updateKnowledge = asyncHandler(async (req, res) => {
  successResponse(res, await knowledgeService.update(req.params.id, pick(req.body, knowledgeFields)), 'Knowledge article updated');
});

const removeKnowledge = asyncHandler(async (req, res) => {
  successResponse(res, await knowledgeService.remove(req.params.id), 'Knowledge article deleted');
});

module.exports = {
  sendMessage,
  streamMessage,
  getConfig,
  updateConfig,
  getSession,
  feedback,
  listSessionsAdmin,
  getSessionAdmin,
  statsAdmin,
  listKnowledge,
  createKnowledge,
  updateKnowledge,
  removeKnowledge,
};
