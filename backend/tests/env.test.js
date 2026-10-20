const originalEnv = process.env;

const productionEnv = (overrides = {}) => ({
  ...originalEnv,
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'production-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-characters',
  FRONTEND_URL: 'https://shop.techphone.example/',
  PUBLIC_SITE_URL: 'https://shop.techphone.example///',
  API_PUBLIC_URL: 'https://api.techphone.example/',
  DEPLOYMENT_TARGET: 'render',
  UPLOAD_DIR: '/app/uploads',
  VNPAY_TMN_CODE: '',
  VNPAY_HASH_SECRET: '',
  VNPAY_RETURN_URL: '',
  VERCEL: '',
  NETLIFY: '',
  AWS_LAMBDA_FUNCTION_NAME: '',
  ...overrides,
});

const loadEnv = (environment = productionEnv()) => {
  process.env = environment;
  jest.resetModules();
  return require('../src/config/env');
};

describe('production environment configuration', () => {
  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('requires absolute public HTTP URLs and trims trailing slashes', () => {
    const env = loadEnv();

    expect(env.frontendUrl).toBe('https://shop.techphone.example');
    expect(env.publicSiteUrl).toBe('https://shop.techphone.example');
    expect(env.apiPublicUrl).toBe('https://api.techphone.example');
  });

  it.each(['FRONTEND_URL', 'PUBLIC_SITE_URL', 'API_PUBLIC_URL'])(
    'fails fast when %s is not an absolute HTTP URL',
    (name) => {
      expect(() => loadEnv(productionEnv({ [name]: '/relative-url' }))).toThrow(name);
    },
  );

  it.each([
    'https://api.techphone.example/api',
    'https://api.techphone.example?debug=true',
    'https://api.techphone.example#docs',
    'https://user:password@api.techphone.example',
  ])('rejects API_PUBLIC_URL values that are not an origin: %s', (apiPublicUrl) => {
    expect(() => loadEnv(productionEnv({ API_PUBLIC_URL: apiPublicUrl })))
      .toThrow(/API_PUBLIC_URL.*origin/i);
  });

  it.each([
    'http://localhost:5000',
    'http://localhost.:5000',
    'http://127.0.0.2:5000',
    'http://[::1]:5000',
    'http://[::ffff:127.0.0.1]:5000',
    'http://[::ffff:7f00:2]:5000',
  ])('rejects a loopback API_PUBLIC_URL on Render: %s', (apiPublicUrl) => {
    expect(() => loadEnv(productionEnv({ API_PUBLIC_URL: apiPublicUrl })))
      .toThrow(/API_PUBLIC_URL.*loopback/i);
  });

  it.each(['FRONTEND_URL', 'PUBLIC_SITE_URL'])(
    'requires %s to be an origin without a path',
    (name) => {
      expect(() => loadEnv(productionEnv({ [name]: 'https://shop.techphone.example/path' })))
        .toThrow(new RegExp(`${name}.*origin`, 'i'));
    },
  );

  it('requires VNPAY_RETURN_URL only when VNPay is enabled', () => {
    expect(() => loadEnv()).not.toThrow();
    expect(() => loadEnv(productionEnv({
      VNPAY_TMN_CODE: 'merchant-code',
      VNPAY_HASH_SECRET: 'merchant-secret',
    }))).toThrow('VNPAY_RETURN_URL');

    const env = loadEnv(productionEnv({
      VNPAY_TMN_CODE: 'merchant-code',
      VNPAY_HASH_SECRET: 'merchant-secret',
      VNPAY_RETURN_URL: 'https://api.techphone.example/api/payments/vnpay/return/',
    }));
    expect(env.vnpay.returnUrl)
      .toBe('https://api.techphone.example/api/payments/vnpay/return');
  });

  it('normalizes an allowlisted deployment target', () => {
    expect(loadEnv(productionEnv({ DEPLOYMENT_TARGET: '  RENDER  ' })).deploymentTarget)
      .toBe('render');
  });

  it('uses a trusted proxy only for the documented Render deployment', () => {
    expect(loadEnv(productionEnv({ DEPLOYMENT_TARGET: 'render' })).trustProxy).toBe(1);
    expect(loadEnv(productionEnv({ DEPLOYMENT_TARGET: 'docker' })).trustProxy).toBe(false);
  });

  it('rejects an unknown production deployment target', () => {
    expect(() => loadEnv(productionEnv({ DEPLOYMENT_TARGET: 'rendr' })))
      .toThrow(/DEPLOYMENT_TARGET.*rendr.*not supported/i);
  });

  it.each(['vercel', 'netlify', 'serverless', 'aws-lambda'])(
    'recognizes but rejects the %s serverless production target',
    (deploymentTarget) => {
      expect(() => loadEnv(productionEnv({
        DEPLOYMENT_TARGET: deploymentTarget,
        UPLOAD_DIR: '/tmp/uploads',
      }))).toThrow(/serverless.*local uploads/i);
    },
  );

  it.each([
    ['VERCEL', 'render', 'vercel'],
    ['VERCEL', 'docker', 'vercel'],
    ['NETLIFY', 'render', 'netlify'],
    ['NETLIFY', 'docker', 'netlify'],
    ['AWS_LAMBDA_FUNCTION_NAME', 'render', 'aws-lambda'],
    ['AWS_LAMBDA_FUNCTION_NAME', 'docker', 'aws-lambda'],
  ])(
    'does not let the %s marker be hidden by DEPLOYMENT_TARGET=%s',
    (marker, explicitTarget, platformTarget) => {
      expect(() => loadEnv(productionEnv({
        [marker]: 'active-platform-marker',
        DEPLOYMENT_TARGET: explicitTarget,
      }))).toThrow(new RegExp(`serverless.*${platformTarget}|${platformTarget}.*local uploads`, 'i'));
    },
  );

  it.each([
    ['', /UPLOAD_DIR.*required/i],
    ['uploads', /UPLOAD_DIR.*absolute/i],
    ['/var/uploads', /UPLOAD_DIR.*\/app\/uploads/i],
  ])('rejects an unsafe Render upload mount: %s', (uploadDir, expectedError) => {
    expect(() => loadEnv(productionEnv({ UPLOAD_DIR: uploadDir }))).toThrow(expectedError);
  });

  it('accepts the documented Render persistent mount', () => {
    expect(loadEnv(productionEnv({ UPLOAD_DIR: '/app/uploads' })).uploadDir)
      .toBe('/app/uploads');
  });

  it('keeps development, test, and local Docker targets valid', () => {
    const development = loadEnv({
      ...originalEnv,
      NODE_ENV: 'development',
      DEPLOYMENT_TARGET: 'local',
      UPLOAD_DIR: 'uploads',
    });
    expect(development.deploymentTarget).toBe('local');

    const test = loadEnv({
      ...originalEnv,
      NODE_ENV: 'test',
      DEPLOYMENT_TARGET: 'local',
      UPLOAD_DIR: 'uploads',
    });
    expect(test.deploymentTarget).toBe('local');

    const docker = loadEnv(productionEnv({
      DEPLOYMENT_TARGET: 'docker',
      FRONTEND_URL: 'http://localhost:3000',
      PUBLIC_SITE_URL: 'http://localhost:3000',
      API_PUBLIC_URL: 'http://localhost:5000',
      UPLOAD_DIR: '/app/uploads',
    }));
    expect(docker.deploymentTarget).toBe('docker');
  });
});
