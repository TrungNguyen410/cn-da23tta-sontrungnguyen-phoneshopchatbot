const { normalizeVietnamesePhone } = require('../utils/phone');

const connectionOptions = { autoIndex: false, autoCreate: false };

const loadWriteDependencies = () => ({
  ...require('../config/database'),
  mongoose: require('mongoose'),
  User: require('../models/User'),
});

const migratePhoneAuth = async ({
  write = false,
  log = console.log,
  User,
  now = () => new Date(),
}) => {
  const users = await User.find({ isDeleted: { $ne: true } })
    .select('_id phone phoneVerified phoneVerifiedAt')
    .lean();
  const invalid = [];
  const owners = new Map();
  const duplicates = [];
  const updates = [];

  for (const user of users) {
    const phone = normalizeVietnamesePhone(user.phone);
    if (!phone) {
      invalid.push({ id: user._id });
      continue;
    }
    const owner = owners.get(phone);
    if (owner) duplicates.push({ ids: [owner, user._id] });
    else owners.set(phone, user._id);

    const update = {};
    if (phone !== user.phone) update.phone = phone;
    if (user.phoneVerified !== true) update.phoneVerified = true;
    if (!user.phoneVerifiedAt) update.phoneVerifiedAt = now();
    if (Object.keys(update).length) updates.push({
      updateOne: { filter: { _id: user._id }, update: { $set: update } },
    });
  }

  const report = { users: users.length, updates: updates.length, invalid, duplicates };
  log(JSON.stringify(report, null, 2));
  if (invalid.length || duplicates.length) {
    throw new Error('Migration stopped: resolve invalid or duplicate normalized phone numbers first.');
  }
  if (!write) {
    log('Dry run only. Re-run with --write after reviewing this report.');
    return report;
  }

  if (updates.length) await User.bulkWrite(updates, { ordered: true });
  log(`Phone auth migration completed for ${users.length} users.`);
  return report;
};

const run = async ({
  write = process.argv.includes('--write'),
  log = console.log,
  dependencies,
} = {}) => {
  const writeDependencies = dependencies || loadWriteDependencies();
  await writeDependencies.connectDB(undefined, writeDependencies.mongoose, connectionOptions);
  try {
    return await migratePhoneAuth({
      write,
      log,
      User: writeDependencies.User,
    });
  } finally {
    await writeDependencies.disconnectDB();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { connectionOptions, migratePhoneAuth, run };
