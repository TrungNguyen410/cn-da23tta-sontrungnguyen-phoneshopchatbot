const BaseRepository = require('./baseRepository');
const ChatSession = require('../models/ChatSession');
const { buildRegex } = require('../utils/query');

class ChatSessionRepository extends BaseRepository {
  constructor() {
    super(ChatSession);
  }

  async recordExchange(id, { title } = {}) {
    const doc = await ChatSession.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $inc: { messageCount: 2 },
        $set: { lastMessageAt: new Date(), ...(title ? { title } : {}) },
      },
      { returnDocument: 'after' },
    );
    return doc?.toJSON() || null;
  }

  async findAdminPage({ page, limit, search = '' }) {
    const filter = search ? { title: buildRegex(search) } : {};
    const [items, total] = await Promise.all([
      this.findAll(filter, { sort: { lastMessageAt: -1 }, skip: (page - 1) * limit, limit }),
      this.count(filter),
    ]);
    return { items, total };
  }

  async countSince(date) {
    return this.count({ createdAt: { $gte: date } });
  }
}

module.exports = new ChatSessionRepository();
