const migrationPlan = [
  {
    model: 'Brand',
    drop: ['name_1', 'slug_1'],
    create: [
      {
        key: { name: 1 },
        options: {
          name: 'brand_name_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
      {
        key: { slug: 1 },
        options: {
          name: 'brand_slug_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
    ],
  },
  {
    model: 'Category',
    drop: ['name_1', 'slug_1'],
    create: [
      {
        key: { name: 1 },
        options: {
          name: 'category_name_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
      {
        key: { slug: 1 },
        options: {
          name: 'category_slug_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
    ],
  },
  {
    model: 'Voucher',
    drop: ['code_1'],
    create: [
      {
        key: { code: 1 },
        options: {
          name: 'voucher_code_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
    ],
  },
  {
    model: 'Setting',
    drop: ['key_1'],
    create: [
      {
        key: { key: 1 },
        options: {
          name: 'setting_key_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
    ],
  },
  {
    model: 'User',
    drop: ['phone_1', 'email_optional_unique'],
    create: [
      {
        key: { phone: 1 },
        options: {
          name: 'user_phone_active_unique',
          unique: true,
          partialFilterExpression: { isDeleted: false },
        },
      },
      {
        key: { email: 1 },
        options: {
          name: 'user_email_active_unique',
          unique: true,
          partialFilterExpression: { email: { $type: 'string' }, isDeleted: false },
        },
      },
    ],
  },
];

const connectionOptions = { autoIndex: false, autoCreate: false };

const loadModels = () => ({
  Brand: require('../models/Brand'),
  Category: require('../models/Category'),
  Voucher: require('../models/Voucher'),
  Setting: require('../models/Setting'),
  User: require('../models/User'),
});

const loadWriteDependencies = () => {
  const { connectDB, disconnectDB } = require('../config/database');
  const mongoose = require('mongoose');
  return { connectDB, disconnectDB, mongoose, models: loadModels() };
};

const printPlan = (write, log) => {
  log(JSON.stringify({ mode: write ? 'write' : 'dry-run', migrations: migrationPlan }, null, 2));
  if (!write) log('Dry run only. Re-run with --write after reviewing this plan.');
};

const duplicateGroupId = (key) => Object.fromEntries(
  Object.keys(key).map((field) => [field, `$${field}`]),
);

const assertNoActiveDuplicates = async (models) => {
  for (const migration of migrationPlan) {
    const Model = models[migration.model];
    for (const replacement of migration.create) {
      const cursor = Model.collection.aggregate([
        { $match: replacement.options.partialFilterExpression },
        { $group: { _id: duplicateGroupId(replacement.key), count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ]);
      try {
        if (await cursor.hasNext()) {
          throw new Error(
            `Unsafe soft-delete index migration: ${migration.model} index `
            + `${replacement.options.name} has duplicate active records; no indexes changed.`,
          );
        }
      } finally {
        await cursor.close();
      }
    }
  }
};

const migrateSoftDeleteIndexes = async ({ write = false, log = console.log, models } = {}) => {
  printPlan(write, log);
  if (!write) return migrationPlan;

  const migrationModels = models || loadModels();
  await assertNoActiveDuplicates(migrationModels);

  for (const migration of migrationPlan) {
    const Model = migrationModels[migration.model];
    for (const replacement of migration.create) {
      try {
        await Model.collection.createIndex(replacement.key, replacement.options);
      } catch (error) {
        if (error.code === 11000) {
          throw new Error(
            `Unsafe soft-delete index migration: ${migration.model} index `
            + `${replacement.options.name} detected active duplicates during creation; `
            + 'legacy indexes were not dropped.',
          );
        }
        throw error;
      }
    }
  }

  for (const migration of migrationPlan) {
    const Model = migrationModels[migration.model];
    const existing = new Set((await Model.collection.indexes()).map((index) => index.name));
    for (const name of migration.drop) {
      if (existing.has(name)) await Model.collection.dropIndex(name);
    }
  }

  log('Soft-delete index migration completed.');
  return migrationPlan;
};

const run = async ({
  write = process.argv.includes('--write'),
  log = console.log,
  dependencies,
} = {}) => {
  if (!write) return migrateSoftDeleteIndexes({ write: false, log });

  const writeDependencies = dependencies || loadWriteDependencies();
  await writeDependencies.connectDB(undefined, writeDependencies.mongoose, connectionOptions);
  try {
    return await migrateSoftDeleteIndexes({
      write: true,
      log,
      models: writeDependencies.models,
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

module.exports = { migrateSoftDeleteIndexes, migrationPlan, run };
