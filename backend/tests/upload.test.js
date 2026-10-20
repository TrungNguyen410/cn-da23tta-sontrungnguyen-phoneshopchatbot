const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');
const env = require('../src/config/env');
const uploadService = require('../src/services/uploadService');
const { app, createUser, login } = require('./helpers');

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Admin image uploads', () => {
  test('writes local uploads directly inside an absolute persistent mount', async () => {
    const originalUploadDir = env.uploadDir;
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'techphone-uploads-'));
    env.uploadDir = uploadDir;

    try {
      const result = await uploadService.save({
        buffer: onePixelPng,
        detectedType: { ext: 'png', mime: 'image/png' },
        fieldname: 'adminImage',
      });
      const savedPath = path.join(uploadDir, 'adminImage', result.filename);

      await expect(fs.stat(savedPath)).resolves.toMatchObject({});
      expect(result.url).toMatch(/^http:\/\/localhost:5000\/uploads\/adminImage\//);
      expect(result.url).not.toContain('/api/uploads/');
    } finally {
      env.uploadDir = originalUploadDir;
      await fs.rm(uploadDir, { recursive: true, force: true });
    }
  });

  test('allows an admin to upload an image selected from their machine', async () => {
    await createUser({ email: 'upload-admin@test.com', phone: '0900000010', role: 'admin' });
    const token = await login('upload-admin@test.com');

    const response = await request(app)
      .post('/api/uploads/admin')
      .set('Authorization', `Bearer ${token}`)
      .attach('adminImage', onePixelPng, {
        filename: 'phone.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toContain('/uploads/adminImage/');
    expect(response.body.data.filename).toMatch(/\.png$/);
    expect(response.body.data.mimeType).toBe('image/png');
    expect(response.body.data.path).toBeUndefined();

    const uploadedPath = path.resolve(
      process.cwd(),
      'uploads',
      'adminImage',
      response.body.data.filename,
    );
    await fs.rm(uploadedPath, { force: true });
  });

  test('rejects non-image files', async () => {
    await createUser({ email: 'upload-admin-2@test.com', phone: '0900000011', role: 'admin' });
    const token = await login('upload-admin-2@test.com');

    const response = await request(app)
      .post('/api/uploads/admin')
      .set('Authorization', `Bearer ${token}`)
      .attach('adminImage', Buffer.from('plain text'), {
        filename: 'payload.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(422);
  });

  test('rejects a non-image payload even when the client spoofs an image MIME type', async () => {
    await createUser({ email: 'upload-admin-3@test.com', phone: '0900000012', role: 'admin' });
    const token = await login('upload-admin-3@test.com');

    const response = await request(app)
      .post('/api/uploads/admin')
      .set('Authorization', `Bearer ${token}`)
      .attach('adminImage', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'payload.html',
        contentType: 'image/png',
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Nội dung tệp tải lên không phải là ảnh được hỗ trợ');
  });
});
