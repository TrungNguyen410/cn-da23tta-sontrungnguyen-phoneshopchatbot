const { resolveSeedPassword } = require('../src/utils/seedCredentials');

describe('resolveSeedPassword', () => {
  it('uses the local demo password outside production unless overridden', () => {
    expect(resolveSeedPassword({ NODE_ENV: 'development' })).toBe('123456');
    expect(resolveSeedPassword({ NODE_ENV: 'test', SEED_DEMO_PASSWORD: 'local-password' }))
      .toBe('local-password');
  });

  it('rejects weak production seed passwords', () => {
    expect(() => resolveSeedPassword({ NODE_ENV: 'production', SEED_DEMO_PASSWORD: '123456' }))
      .toThrow('ít nhất 12 ký tự');
  });

  it('requires a strong production seed password', () => {
    expect(resolveSeedPassword({ NODE_ENV: 'production', SEED_DEMO_PASSWORD: 'secure-demo-123' }))
      .toBe('secure-demo-123');
  });
});
