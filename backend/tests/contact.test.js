const request = require('supertest');
const Contact = require('../src/models/Contact');
const Setting = require('../src/models/Setting');
const User = require('../src/models/User');
const { app, createUser, login } = require('./helpers');

describe('Contact support workflow', () => {
  test('stores a customer request and lets an admin resolve it', async () => {
    const created = await request(app).post('/api/contacts').send({
      fullName: 'Customer A',
      email: 'customer@example.com',
      phone: '0912345678',
      subject: 'Need support',
      message: 'Please help me with my recent purchase.',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('new');

    await createUser({ email: 'contact-admin@test.com', phone: '0900000001', role: 'admin' });
    const token = await login('contact-admin@test.com');
    const listed = await request(app).get('/api/contacts').set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const resolved = await request(app)
      .put(`/api/contacts/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved', adminNote: 'Customer contacted.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('resolved');
    expect((await Contact.findById(created.body.data.id)).adminNote).toBe('Customer contacted.');
  });

  test('ignores server-owned fields on public contact creation', async () => {
    const response = await request(app).post('/api/contacts').send({
      fullName: 'Audit User',
      email: 'audit@example.com',
      phone: '0912345678',
      subject: 'Audit message',
      message: 'A valid contact message',
      status: 'resolved',
      adminNote: 'forged',
      isDeleted: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: 'new', adminNote: '', isDeleted: false });
  });

  test('preserves supported admin customer fields, blocks server fields, and rejects an empty DTO', async () => {
    const customer = await createUser({ email: 'customer-update@test.com', phone: '0922222222' });
    await createUser({ email: 'customer-admin@test.com', phone: '0900000002', role: 'admin' });
    const token = await login('customer-admin@test.com');

    const updated = await request(app)
      .put(`/api/admin/customers/${customer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Updated Customer',
        email: 'updated-customer@test.com',
        status: 'locked',
        role: 'admin',
        emailVerified: false,
        isDeleted: true,
      });

    expect(updated.status).toBe(200);
    const persisted = (await User.findById(customer.id)).toJSON();
    expect(persisted).toMatchObject({
      fullName: 'Updated Customer',
      email: 'updated-customer@test.com',
      status: 'locked',
      role: 'admin',
      emailVerified: true,
      isDeleted: false,
    });

    const empty = await request(app)
      .put(`/api/admin/customers/${customer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ emailVerified: false, isDeleted: true });
    expect(empty.status).toBe(422);
  });

  test('canonicalizes an admin-updated phone for OTP lookup and login', async () => {
    const customer = await createUser({ email: 'canonical-customer@test.com', phone: '0922222222' });
    await createUser({ email: 'canonical-admin@test.com', phone: '0900000004', role: 'admin' });
    const token = await login('canonical-admin@test.com');

    const updated = await request(app)
      .put(`/api/admin/customers/${customer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+84 912 345 678' });

    expect(updated.status).toBe(200);
    expect((await User.findById(customer.id)).phone).toBe('0912345678');
    expect((await request(app).post('/api/auth/forgot-password/request-otp').send({
      identifier: '+84 912 345 678',
    })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({
      identifier: '0912345678', password: '123456',
    })).status).toBe(200);
  });

  test('rejects invalid and canonically colliding admin customer phones', async () => {
    const first = await createUser({ email: 'phone-first@test.com', phone: '0912345678' });
    const second = await createUser({ email: 'phone-second@test.com', phone: '0922222222' });
    await createUser({ email: 'phone-admin@test.com', phone: '0900000005', role: 'admin' });
    const token = await login('phone-admin@test.com');

    await request(app)
      .put(`/api/admin/customers/${second.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0123456789' })
      .expect(422);

    await request(app)
      .put(`/api/admin/customers/${second.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+84 912 345 678' })
      .expect(409);

    expect((await User.findById(first.id)).phone).toBe('0912345678');
    expect((await User.findById(second.id)).phone).toBe('0922222222');
  });

  test('allows only supported setting update fields', async () => {
    const setting = await Setting.create({ key: 'store_name', value: 'TechPhone', group: 'general', label: 'Store name' });
    await createUser({ email: 'setting-admin@test.com', phone: '0900000003', role: 'admin' });
    const token = await login('setting-admin@test.com');

    const response = await request(app)
      .put(`/api/admin/settings/${setting.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'TechPhone Plus', key: 'forged_key', isDeleted: true });

    expect(response.status).toBe(200);
    const persisted = (await Setting.findById(setting.id)).toJSON();
    expect(persisted).toMatchObject({ key: 'store_name', value: 'TechPhone Plus', isDeleted: false });
  });
});
