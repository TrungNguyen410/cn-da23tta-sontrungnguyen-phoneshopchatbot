const BaseRepository = require('./baseRepository');
const ChatMessage = require('../models/ChatMessage');

class ChatMessageRepository extends BaseRepository {
  constructor() {
    super(ChatMessage);
  }

  async findBySession(sessionId) {
    return this.findAll({ sessionId }, { sort: { createdAt: 1 } });
  }

  async findRecentBySession(sessionId, limit) {
    const recent = await this.findAll({ sessionId }, { sort: { createdAt: -1 }, limit });
    return recent.reverse();
  }

  async setFeedback(id, feedback) {
    const doc = await ChatMessage.findOneAndUpdate(
      { _id: id, isDeleted: false, role: 'assistant' },
      { $set: { feedback } },
      { returnDocument: 'after', runValidators: true },
    );
    return doc?.toJSON() || null;
  }

  async stats() {
    const [summary] = await ChatMessage.aggregate([
      { $match: { isDeleted: false, role: 'assistant' } },
      {
        $group: {
          _id: null,
          answers: { $sum: 1 },
          liked: { $sum: { $cond: [{ $eq: ['$feedback', 'up'] }, 1, 0] } },
          disliked: { $sum: { $cond: [{ $eq: ['$feedback', 'down'] }, 1, 0] } },
          fallback: { $sum: { $cond: [{ $in: ['$source', ['offline', 'fallback']] }, 1, 0] } },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
    ]);
    const tools = await ChatMessage.aggregate([
      { $match: { isDeleted: false, role: 'assistant' } },
      { $unwind: '$toolCalls' },
      { $group: { _id: '$toolCalls.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      answers: summary?.answers || 0,
      liked: summary?.liked || 0,
      disliked: summary?.disliked || 0,
      fallback: summary?.fallback || 0,
      avgLatencyMs: Math.round(summary?.avgLatencyMs || 0),
      tools: tools.map((tool) => ({ name: tool._id, count: tool.count })),
    };
  }

  async recentQuestions(limit = 10) {
    const docs = await ChatMessage.find({ isDeleted: false, role: 'user' })
      .sort({ createdAt: -1 })
      .limit(limit);
    return docs.map((doc) => ({ content: doc.content, sessionId: doc.sessionId, createdAt: doc.createdAt }));
  }
}

module.exports = new ChatMessageRepository();
