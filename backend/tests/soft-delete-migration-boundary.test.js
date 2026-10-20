const { spawnSync } = require('child_process');

const mockConnectDB = jest.fn();
const mockDisconnectDB = jest.fn();
const mockMongoose = { connect: jest.fn() };
const mockModelLoads = [];
const mockCollectionCalls = [];

const modelDouble = (modelName) => ({
  modelName,
  collection: new Proxy({}, {
    get: (_target, method) => (...args) => {
      mockCollectionCalls.push({ modelName, method, args });
      return Promise.resolve([]);
    },
  }),
});

jest.mock('../src/config/database', () => ({
  connectDB: mockConnectDB,
  disconnectDB: mockDisconnectDB,
}));
jest.mock('mongoose', () => mockMongoose);
jest.mock('../src/models/Brand', () => {
  mockModelLoads.push('Brand');
  return modelDouble('Brand');
});
jest.mock('../src/models/Category', () => {
  mockModelLoads.push('Category');
  return modelDouble('Category');
});
jest.mock('../src/models/Voucher', () => {
  mockModelLoads.push('Voucher');
  return modelDouble('Voucher');
});
jest.mock('../src/models/Setting', () => {
  mockModelLoads.push('Setting');
  return modelDouble('Setting');
});
jest.mock('../src/models/User', () => {
  mockModelLoads.push('User');
  return modelDouble('User');
});

const { run } = require('../src/scripts/migrateSoftDeleteIndexes');

describe('soft-delete migration command boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionCalls.length = 0;
  });

  it('does not load models, connect, or touch collections in dry-run mode', async () => {
    const logs = [];

    await run({ write: false, log: (line) => logs.push(line) });

    expect(mockModelLoads).toEqual([]);
    expect(mockConnectDB).not.toHaveBeenCalled();
    expect(mockMongoose.connect).not.toHaveBeenCalled();
    expect(mockCollectionCalls).toEqual([]);
    expect(logs).toHaveLength(2);
  });

  it('the real CLI dry-run exits zero without a reachable MongoDB server', () => {
    const result = spawnSync(process.execPath, ['src/scripts/migrateSoftDeleteIndexes.js'], {
      cwd: `${__dirname}/..`,
      env: {
        ...process.env,
        MONGO_URI: 'mongodb://127.0.0.1:1/unreachable?serverSelectionTimeoutMS=50',
      },
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"mode": "dry-run"');
    expect(result.stdout).toContain('Dry run only.');
    expect(result.stderr).toBe('');
  });

  it('disables automatic index and collection creation when connecting in write mode', async () => {
    mockConnectDB.mockRejectedValueOnce(new Error('stop after connection attempt'));

    await expect(run({ write: true, log: () => {} })).rejects.toThrow('stop after connection attempt');

    expect(mockConnectDB).toHaveBeenCalledWith(
      undefined,
      mockMongoose,
      { autoIndex: false, autoCreate: false },
    );
  });
});
