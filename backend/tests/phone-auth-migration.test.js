const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Setting = require('../src/models/Setting');
const User = require('../src/models/User');
const Voucher = require('../src/models/Voucher');
const { migratePhoneAuth } = require('../src/scripts/migratePhoneAuth');
const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');

const activeUserIndexes = [
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
];

const legacyUserIndexes = [
  { key: { phone: 1 }, options: { name: 'phone_1', unique: true } },
  {
    key: { email: 1 },
    options: {
      name: 'email_optional_unique',
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    },
  },
];

const replaceUserIndexes = async (indexes) => {
  await User.createCollection().catch((error) => {
    if (error.codeName !== 'NamespaceExists') throw error;
  });
  await User.collection.dropIndexes();
  for (const { key, options } of indexes) await User.collection.createIndex(key, options);
};

const userIndexState = async () => (await User.collection.indexes())
  .filter((index) => index.key.phone === 1 || index.key.email === 1)
  .map(({ name, key, unique, partialFilterExpression }) => ({
    name,
    key,
    unique,
    partialFilterExpression,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const insertLegacyUser = (overrides = {}) => User.collection.insertOne({
  _id: 'phone-migration-user',
  fullName: 'Phone Migration User',
  email: 'phone-migration@example.com',
  phone: '+84 912 345 678',
  password: 'hashed-password',
  isDeleted: false,
  phoneVerified: false,
  phoneVerifiedAt: null,
  ...overrides,
});

describe('phone auth data migration', () => {
  afterEach(async () => {
    await replaceUserIndexes(activeUserIndexes);
  });

  it('normalizes phones without changing active-only phone or email indexes', async () => {
    await replaceUserIndexes(activeUserIndexes);
    await insertLegacyUser();
    const indexesBefore = await userIndexState();
    const userBefore = await User.collection.findOne({ _id: 'phone-migration-user' });

    await migratePhoneAuth({ write: false, log: () => {}, User });

    expect(await userIndexState()).toEqual(indexesBefore);
    expect(await User.collection.findOne({ _id: 'phone-migration-user' })).toEqual(userBefore);

    const verifiedAt = new Date('2026-08-06T00:00:00.000Z');
    await migratePhoneAuth({ write: true, log: () => {}, User, now: () => verifiedAt });

    expect(await userIndexState()).toEqual(indexesBefore);
    expect(await User.collection.findOne({ _id: 'phone-migration-user' })).toMatchObject({
      phone: '0912345678',
      phoneVerified: true,
      phoneVerifiedAt: verifiedAt,
    });

    await User.collection.updateOne(
      { _id: 'phone-migration-user' },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    await expect(User.create({
      fullName: 'Replacement User',
      email: 'phone-migration@example.com',
      phone: '0900000099',
      password: 'hashed-password',
    })).resolves.toBeDefined();
  });

  it('is safe and idempotent before and after the soft-delete index migration', async () => {
    await replaceUserIndexes(legacyUserIndexes);
    await insertLegacyUser();
    const legacyState = await userIndexState();

    await migratePhoneAuth({ write: true, log: () => {}, User });
    expect(await userIndexState()).toEqual(legacyState);

    const models = { Brand, Category, Setting, User, Voucher };
    await migrateSoftDeleteIndexes({ write: true, log: () => {}, models });
    const activeState = await userIndexState();
    expect(activeState.map((index) => index.name).sort()).toEqual([
      'user_email_active_unique',
      'user_phone_active_unique',
    ]);

    await migratePhoneAuth({ write: true, log: () => {}, User });
    await migrateSoftDeleteIndexes({ write: true, log: () => {}, models });
    expect(await userIndexState()).toEqual(activeState);
  });
});
