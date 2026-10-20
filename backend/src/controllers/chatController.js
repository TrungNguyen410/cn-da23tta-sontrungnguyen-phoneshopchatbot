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
