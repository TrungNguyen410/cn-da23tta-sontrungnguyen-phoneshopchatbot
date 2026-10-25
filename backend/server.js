const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const env = require('./src/config/env');

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`PhoneShopAI API running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start PhoneShopAI API:', error);
  process.exit(1);
});
