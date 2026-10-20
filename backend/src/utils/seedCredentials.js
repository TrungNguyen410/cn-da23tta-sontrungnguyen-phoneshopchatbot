const isStrong = (value = '') => value.length >= 12 && !['123456', 'password'].includes(value);

const resolveSeedPassword = (env = process.env) => {
  if ((env.NODE_ENV || 'development') !== 'production') return env.SEED_DEMO_PASSWORD || '123456';
  if (!isStrong(env.SEED_DEMO_PASSWORD)) {
    throw new Error('SEED_DEMO_PASSWORD phải có ít nhất 12 ký tự trong môi trường production');
  }
  return env.SEED_DEMO_PASSWORD;
};

module.exports = { resolveSeedPassword };
