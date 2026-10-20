const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Voucher = require('../src/models/Voucher');
const Setting = require('../src/models/Setting');
const User = require('../src/models/User');

const voucherPayload = (code) => ({
  code,
  type: 'percent',
  value: 10,
  quantity: 10,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2027-01-01T00:00:00.000Z'),
});

const userPayload = ({ email, phone }) => ({
  fullName: 'Index Test User',
  ...(email === undefined ? {} : { email }),
  phone,
  password: 'hashed-password',
});

const uniqueCases = [
  {
    label: 'Brand.name',
    Model: Brand,
    original: { name: 'Apple', slug: 'apple' },
    duplicate: { name: 'Apple', slug: 'apple-replacement' },
  },
  {
    label: 'Brand.slug',
    Model: Brand,
    original: { name: 'Apple', slug: 'apple' },
    duplicate: { name: 'Apple Replacement', slug: 'apple' },
  },
  {
    label: 'Category.name',
    Model: Category,
    original: { name: 'Phone', slug: 'phone' },
    duplicate: { name: 'Phone', slug: 'phone-replacement' },
  },
  {
    label: 'Category.slug',
    Model: Category,
    original: { name: 'Phone', slug: 'phone' },
    duplicate: { name: 'Phone Replacement', slug: 'phone' },
  },
  {
    label: 'Voucher.code',
    Model: Voucher,
    original: voucherPayload('REUSE10'),
    duplicate: voucherPayload('REUSE10'),
  },
  {
    label: 'Setting.key',
    Model: Setting,
    original: { key: 'hotline', value: '1900' },
    duplicate: { key: 'hotline', value: '1800' },
  },
  {
    label: 'User.phone',
    Model: User,
    original: userPayload({ email: 'phone-original@test.com', phone: '0900000001' }),
    duplicate: userPayload({ email: 'phone-replacement@test.com', phone: '0900000001' }),
  },
  {
    label: 'User.email',
    Model: User,
    original: userPayload({ email: 'reusable@test.com', phone: '0900000002' }),
    duplicate: userPayload({ email: 'reusable@test.com', phone: '0900000003' }),
  },
];

describe('soft-delete unique indexes', () => {
  beforeAll(async () => {
    await Promise.all([Brand.init(), Category.init(), Voucher.init(), Setting.init(), User.init()]);
  });

  it.each(uniqueCases)('allows recreating $label after soft delete', async ({ Model, original, duplicate }) => {
    const document = await Model.create(original);
    await document.softDelete();

    await expect(Model.create(duplicate)).resolves.toBeDefined();
  });

  it.each(uniqueCases)('rejects an active duplicate for $label', async ({ Model, original, duplicate }) => {
    await Model.create(original);

    await expect(Model.create(duplicate)).rejects.toMatchObject({ code: 11000 });
  });

  it('allows multiple active users without an email address', async () => {
    await User.create(userPayload({ phone: '0900000004' }));

    await expect(User.create(userPayload({ phone: '0900000005' }))).resolves.toBeDefined();
  });

  it('allows multiple active users with a null email address', async () => {
    await User.create(userPayload({ email: null, phone: '0900000006' }));

    await expect(User.create(userPayload({ email: null, phone: '0900000007' }))).resolves.toBeDefined();
  });
});

describe('soft-delete index migration', () => {
  const legacyIndexes = [
    { Model: Brand, indexes: [{ key: { name: 1 }, name: 'name_1' }, { key: { slug: 1 }, name: 'slug_1' }] },
    { Model: Category, indexes: [{ key: { name: 1 }, name: 'name_1' }, { key: { slug: 1 }, name: 'slug_1' }] },
    { Model: Voucher, indexes: [{ key: { code: 1 }, name: 'code_1' }] },
    { Model: Setting, indexes: [{ key: { key: 1 }, name: 'key_1' }] },
    {
      Model: User,
      indexes: [
        { key: { phone: 1 }, name: 'phone_1' },
        {
          key: { email: 1 },
          name: 'email_optional_unique',
          partialFilterExpression: { email: { $type: 'string' } },
        },
      ],
    },
  ];
  const expectedPlan = [
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

  const installLegacyIndexes = async () => {
    for (const { Model, indexes } of legacyIndexes) {
      await Model.collection.dropIndexes();
      for (const { key, ...options } of indexes) {
        await Model.collection.createIndex(key, { ...options, unique: true });
      }
      await Model.collection.createIndex(
        { deletedAt: 1 },
        { name: `${Model.modelName.toLowerCase()}_migration_sentinel` },
      );
    }
  };

  const indexState = async () => Promise.all(legacyIndexes.map(async ({ Model }) => ({
    model: Model.modelName,
    indexes: (await Model.collection.indexes())
      .map(({ name, key, unique, partialFilterExpression }) => ({ name, key, unique, partialFilterExpression }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  })));

  it('exports a callable migration', () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');

    expect(migrateSoftDeleteIndexes).toEqual(expect.any(Function));
  });

  it('provides the repeatable migration npm command', () => {
    const packageJson = require('../package.json');

    expect(packageJson.scripts['migrate:soft-delete-indexes'])
      .toBe('node src/scripts/migrateSoftDeleteIndexes.js');
  });

  it('prints a deterministic dry-run plan without changing indexes', async () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');
    await installLegacyIndexes();
    const before = await indexState();
    const logs = [];

    await migrateSoftDeleteIndexes({ write: false, log: (line) => logs.push(line) });

    expect(await indexState()).toEqual(before);
    expect(logs).toEqual([
      JSON.stringify({ mode: 'dry-run', migrations: expectedPlan }, null, 2),
      'Dry run only. Re-run with --write after reviewing this plan.',
    ]);
  });

  it('replaces legacy indexes and is repeatable when run twice', async () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');
    await installLegacyIndexes();

    await migrateSoftDeleteIndexes({ write: true, log: () => {} });
    await expect(migrateSoftDeleteIndexes({ write: true, log: () => {} })).resolves.toBeDefined();

    for (const { Model } of legacyIndexes) {
      const indexes = await Model.collection.indexes();
      const names = indexes.map((index) => index.name);
      const plan = expectedPlan.find(({ model }) => model === Model.modelName);
      expect(names).not.toEqual(expect.arrayContaining(plan.drop));
      expect(names).toContain(`${Model.modelName.toLowerCase()}_migration_sentinel`);
      for (const replacement of plan.create) {
        const index = indexes.find(({ name }) => name === replacement.options.name);
        expect(index).toMatchObject({
          key: replacement.key,
          unique: true,
          partialFilterExpression: replacement.options.partialFilterExpression,
        });
      }
    }
  });

  it('aborts before changing indexes when active duplicate values exist', async () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');
    await installLegacyIndexes();
    await Brand.collection.dropIndex('name_1');
    await Brand.collection.insertMany([
      { _id: 'dirty-brand-1', name: 'Dirty Brand', slug: 'dirty-brand-1', isDeleted: false },
      { _id: 'dirty-brand-2', name: 'Dirty Brand', slug: 'dirty-brand-2', isDeleted: false },
    ]);
    const before = await indexState();

    await expect(migrateSoftDeleteIndexes({ write: true, log: () => {} }))
      .rejects.toThrow(/Brand.*brand_name_active_unique.*no indexes changed/i);

    expect(await indexState()).toEqual(before);
  });

  it('keeps all legacy indexes when creating a replacement index fails', async () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');
    await installLegacyIndexes();
    await Brand.collection.createIndex(
      { deletedAt: -1 },
      { name: 'brand_name_active_unique' },
    );
    const before = await indexState();

    await expect(migrateSoftDeleteIndexes({ write: true, log: () => {} })).rejects.toBeDefined();

    expect(await indexState()).toEqual(before);
  });

  it('sanitizes duplicate errors raised while creating a replacement index', async () => {
    const { migrateSoftDeleteIndexes } = require('../src/scripts/migrateSoftDeleteIndexes');
    await installLegacyIndexes();
    const before = await indexState();
    const duplicateError = Object.assign(
      new Error('E11000 duplicate key: private-customer-value'),
      { code: 11000 },
    );
    const createIndex = jest.spyOn(Brand.collection, 'createIndex').mockRejectedValueOnce(duplicateError);
    let migrationError;

    try {
      await migrateSoftDeleteIndexes({ write: true, log: () => {} });
    } catch (error) {
      migrationError = error;
    } finally {
      createIndex.mockRestore();
    }

    expect(migrationError.message).toMatch(/Brand.*brand_name_active_unique.*legacy indexes were not dropped/i);
    expect(migrationError.message).not.toMatch(/private-customer-value/i);
    expect(await indexState()).toEqual(before);
  });
});
