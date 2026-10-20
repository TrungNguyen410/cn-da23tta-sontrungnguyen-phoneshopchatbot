const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const env = require('./src/config/env');

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`TechPhone API running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start TechPhone API:', error);
  process.exit(1);
});
