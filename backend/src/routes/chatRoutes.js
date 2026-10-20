const express = require('express');
const chatController = require('../controllers/chatController');
const chatValidators = require('../validators/chatValidators');
const validate = require('../middlewares/validate');
const rateLimit = require('../middlewares/rateLimit');
const { optionalProtect } = require('../middlewares/authMiddleware');

const router = express.Router();

const chatIpLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  namespace: 'chat-ip',
});

router.post('/messages', chatIpLimit, optionalProtect, chatValidators.sendMessage, validate, chatController.sendMessage);
router.get('/sessions/:id', optionalProtect, chatValidators.getSession, validate, chatController.getSession);
router.post('/messages/:id/feedback', optionalProtect, chatValidators.feedback, validate, chatController.feedback);

module.exports = router;
