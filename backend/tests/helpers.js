const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

const createUser = async (overrides = {}) => {
  const password = await bcrypt.hash(overrides.password || '123456', 12);
  return User.create({
    fullName: overrides.fullName || 'Test User',
    email: overrides.email || 'user@test.com',
    phone: overrides.phone || '0911111111',
    password,
    role: overrides.role || 'customer',
    status: overrides.status || 'active',
    address: overrides.address || 'Test address',
    phoneVerified: overrides.phoneVerified ?? true,
    phoneVerifiedAt: overrides.phoneVerifiedAt || new Date(),
  });
};

const login = async (identifier, password = '123456') => {
  const response = await request(app).post('/api/auth/login').send({ identifier, password });
  return response.body.data.token;
};

module.exports = { app, createUser, login };
