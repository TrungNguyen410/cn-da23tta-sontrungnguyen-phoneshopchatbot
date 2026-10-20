const mongoose = require('mongoose');
const env = require('./env');

const assertTransactionTopology = (hello) => {
  if (!hello?.setName && hello?.msg !== 'isdbgrid') {
    throw new Error(
      'MongoDB phải chạy ở chế độ replica set hoặc sharded cluster để hỗ trợ giao dịch thanh toán nguyên tử.',
    );
  }
};

const connectDB = async (uri = env.mongoUri, client = mongoose, options) => {
  client.set('strictQuery', true);
  await client.connect(uri, options);
  try {
    const hello = await client.connection.db.admin().command({ hello: 1 });
    assertTransactionTopology(hello);
    return client.connection;
  } catch (error) {
    await client.disconnect().catch(() => {});
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { assertTransactionTopology, connectDB, disconnectDB };
