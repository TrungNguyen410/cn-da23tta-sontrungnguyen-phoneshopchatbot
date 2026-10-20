const mockConnectDB = jest.fn();
const mockDisconnectDB = jest.fn();
const mockMongoose = {};
const mockLean = jest.fn().mockResolvedValue([]);
const mockSelect = jest.fn(() => ({ lean: mockLean }));
const mockFind = jest.fn(() => ({ select: mockSelect }));
const mockUser = {
  find: mockFind,
  bulkWrite: jest.fn(),
  collection: {
    indexes: jest.fn(() => {
      throw new Error('phone migration must not inspect indexes');
    }),
  },
};

jest.mock('../src/config/database', () => ({
  connectDB: mockConnectDB,
  disconnectDB: mockDisconnectDB,
}));
jest.mock('mongoose', () => mockMongoose);
jest.mock('../src/models/User', () => mockUser);

const { migratePhoneAuth, run } = require('../src/scripts/migratePhoneAuth');

describe('phone auth migration command boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockLean.mockResolvedValue([]);
  });

  it('exports an injectable runner and disables automatic index management', async () => {
    await run({ write: true, log: () => {} });

    expect(mockConnectDB).toHaveBeenCalledWith(
      undefined,
      mockMongoose,
      { autoIndex: false, autoCreate: false },
    );
    expect(mockFind).toHaveBeenCalledWith({ isDeleted: { $ne: true } });
    expect(mockUser.collection.indexes).not.toHaveBeenCalled();
    expect(mockDisconnectDB).toHaveBeenCalledTimes(1);
  });

  it('preflights invalid and duplicate phones without writing or logging phone values', async () => {
    mockLean.mockResolvedValue([
      { _id: 'invalid-user', phone: 'private-invalid-phone' },
      { _id: 'first-owner', phone: '+84 912 345 678' },
      { _id: 'duplicate-owner', phone: '0912345678' },
    ]);
    const logs = [];

    await expect(migratePhoneAuth({
      write: true,
      log: (line) => logs.push(line),
      User: mockUser,
    })).rejects.toThrow(/invalid or duplicate/i);

    expect(mockUser.bulkWrite).not.toHaveBeenCalled();
    expect(logs.join('\n')).not.toContain('private-invalid-phone');
    expect(logs.join('\n')).not.toContain('0912345678');
    expect(logs.join('\n')).toContain('invalid-user');
    expect(logs.join('\n')).toContain('duplicate-owner');
  });
});
