const { body, param, query } = require('express-validator');

const visitorIdRule = (location) => location('visitorId')
  .optional({ checkFalsy: true })
  .isString()
  .matches(/^[A-Za-z0-9_-]{8,100}$/)
  .withMessage('Mã khách truy cập không hợp lệ');

const sendMessage = [
  body('message')
    .isString().withMessage('Nội dung tin nhắn là bắt buộc')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('Tin nhắn phải từ 1 đến 1000 ký tự'),
  body('sessionId').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
  visitorIdRule(body),
];

const getSession = [
  param('id').notEmpty(),
  visitorIdRule(query),
];

const feedback = [
  param('id').notEmpty(),
  body('value').isIn(['up', 'down', null]).withMessage('Đánh giá phải là up hoặc down'),
  visitorIdRule(body),
];

const knowledgeFields = (optional) => {
  const required = (chain) => (optional ? chain.optional() : chain);
  return [
    required(body('title')).isString().trim().isLength({ min: 3, max: 200 }).withMessage('Tiêu đề từ 3 đến 200 ký tự'),
    required(body('content')).isString().trim().isLength({ min: 10, max: 5000 }).withMessage('Nội dung từ 10 đến 5000 ký tự'),
    body('category').optional().isIn(['warranty', 'return', 'shipping', 'payment', 'installment', 'store', 'faq']),
    body('keywords').optional(),
    body('active').optional().isBoolean(),
  ];
};

const adminList = [
  query('page').optional().isInt({ min: 1, max: 1000000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
];

const updateConfig = [
  body('enabled').optional().isBoolean().withMessage('Trạng thái bật/tắt không hợp lệ'),
  body('greeting').optional().isString().isLength({ max: 500 }).withMessage('Lời chào tối đa 500 ký tự'),
  body('quickQuestions').optional().isArray({ max: 6 }).withMessage('Tối đa 6 câu hỏi gợi ý'),
  body('quickQuestions.*').optional().isString().isLength({ max: 120 }).withMessage('Mỗi câu hỏi tối đa 120 ký tự'),
];

module.exports = {
  sendMessage,
  updateConfig,
  getSession,
  feedback,
  createKnowledge: knowledgeFields(false),
  updateKnowledge: knowledgeFields(true),
  adminList,
};
