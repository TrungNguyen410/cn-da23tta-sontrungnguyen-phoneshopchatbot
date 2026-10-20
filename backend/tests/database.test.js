const { assertTransactionTopology, connectDB } = require('../src/config/database');

describe('database transaction topology', () => {
  it('fails fast with a clear message for a standalone MongoDB server', () => {
    expect(() => assertTransactionTopology({ ok: 1 })).toThrow(
      /phải chạy ở chế độ replica set hoặc sharded cluster/i,
    );
  });

  it('accepts replica-set and sharded MongoDB topologies', () => {
    expect(() => assertTransactionTopology({ setName: 'rs0' })).not.toThrow();
    expect(() => assertTransactionTopology({ msg: 'isdbgrid' })).not.toThrow();
  });

  it('disconnects before propagating an unsupported topology error', async () => {
    const client = {
      set: jest.fn(),
      connect: jest.fn().mockResolvedValue(),
      disconnect: jest.fn().mockResolvedValue(),
      connection: {
        db: {
          admin: () => ({
            command: jest.fn().mockResolvedValue({ ok: 1 }),
          }),
        },
      },
    };

    await expect(connectDB('mongodb://standalone.test/store', client)).rejects.toThrow(
      /phải chạy ở chế độ replica set hoặc sharded cluster/i,
    );
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('passes connection safety options to the MongoDB client', async () => {
    const client = {
      set: jest.fn(),
      connect: jest.fn().mockResolvedValue(),
      disconnect: jest.fn().mockResolvedValue(),
      connection: {
        db: {
          admin: () => ({
            command: jest.fn().mockResolvedValue({ setName: 'rs0' }),
          }),
        },
      },
    };
    const options = { autoIndex: false, autoCreate: false };

    await connectDB('mongodb://replica.test/store', client, options);

    expect(client.connect).toHaveBeenCalledWith('mongodb://replica.test/store', options);
  });
});
