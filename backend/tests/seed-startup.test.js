const mockConnectDB = jest.fn().mockResolvedValue();
const mockDisconnectDB = jest.fn().mockResolvedValue();
const mockHash = jest.fn().mockResolvedValue('hashed-password');
const mockModels = {
  accessory: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  banner: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  brand: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  category: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  contact: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  order: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  orderCounter: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  orderItem: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  product: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  refreshToken: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  review: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  setting: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  user: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  voucher: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
  verificationCode: { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() },
};

jest.mock('../src/config/database', () => ({ connectDB: mockConnectDB, disconnectDB: mockDisconnectDB }));
jest.mock('bcrypt', () => ({ hash: mockHash }));
jest.mock('../src/models/Accessory', () => mockModels.accessory);
jest.mock('../src/models/Banner', () => mockModels.banner);
jest.mock('../src/models/Brand', () => mockModels.brand);
jest.mock('../src/models/Category', () => mockModels.category);
jest.mock('../src/models/Contact', () => mockModels.contact);
jest.mock('../src/models/Order', () => mockModels.order);
jest.mock('../src/models/OrderCounter', () => mockModels.orderCounter);
jest.mock('../src/models/OrderItem', () => mockModels.orderItem);
jest.mock('../src/models/Product', () => mockModels.product);
jest.mock('../src/models/RefreshToken', () => mockModels.refreshToken);
jest.mock('../src/models/Review', () => mockModels.review);
jest.mock('../src/models/Setting', () => mockModels.setting);
jest.mock('../src/models/User', () => mockModels.user);
jest.mock('../src/models/Voucher', () => mockModels.voucher);
jest.mock('../src/models/VerificationCode', () => mockModels.verificationCode);

describe('seed startup safety', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedPassword = process.env.SEED_DEMO_PASSWORD;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_PASSWORD = '123456';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSeedPassword === undefined) delete process.env.SEED_DEMO_PASSWORD;
    else process.env.SEED_DEMO_PASSWORD = originalSeedPassword;
    jest.restoreAllMocks();
  });

  it('rejects invalid production credentials before connecting, deleting, or writing seed data', async () => {
    let resolveExit;
    const exited = new Promise((resolve) => { resolveExit = resolve; });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((code) => resolveExit(code));

    require('../src/seed/seed');
    await expect(exited).resolves.toBe(1);

    expect(mockConnectDB).not.toHaveBeenCalled();
    for (const model of Object.values(mockModels)) {
      expect(model.deleteMany).not.toHaveBeenCalled();
      expect(model.insertMany).not.toHaveBeenCalled();
    }
    expect(mockHash).not.toHaveBeenCalled();
  });
});
