const env = require('./env');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TechPhone Store REST API',
    version: '1.0.0',
    description: 'Production-ready REST API for the TechPhone Store Software Engineering course project.',
  },
  servers: [
    {
      url: `${env.apiPublicUrl}/api`,
      description: env.nodeEnv === 'production' ? 'Production' : 'Current environment',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Products' },
    { name: 'Accessories' },
    { name: 'Categories' },
    { name: 'Brands' },
    { name: 'Orders' },
    { name: 'Reviews' },
    { name: 'Vouchers' },
    { name: 'Banners' },
    { name: 'Contacts' },
    { name: 'Settings' },
    { name: 'Admin' },
    { name: 'Uploads' },
    { name: 'Payments' },
    { name: 'SEO' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'phone', 'password'],
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string', example: '0912345678' },
          password: { type: 'string', minLength: 6 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', description: 'Vietnamese phone number' },
          password: { type: 'string' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      OtpVerificationRequest: {
        type: 'object',
        required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', example: '0912345678' },
          otp: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
      PasswordResetOtpRequest: {
        type: 'object',
        required: ['identifier'],
        properties: {
          identifier: { type: 'string', description: 'Vietnamese phone number', example: '0912345678' },
        },
      },
      PasswordResetRequest: {
        type: 'object',
        required: ['identifier', 'otp', 'newPassword'],
        properties: {
          identifier: { type: 'string' },
          otp: { type: 'string', pattern: '^\\d{6}$' },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
      CatalogItem: {
        type: 'object',
        required: ['name', 'brandId', 'categoryId', 'price'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          brandId: { type: 'string', description: 'ID of an active Brand record' },
          categoryId: { type: 'string', description: 'ID of an active Category record' },
          brand: { type: 'string', readOnly: true, description: 'Denormalized brand display name' },
          category: { type: 'string', readOnly: true, description: 'Denormalized category display name' },
          price: { type: 'number' },
          oldPrice: { type: 'number' },
          image: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          stock: { type: 'integer' },
          sold: { type: 'integer' },
          rating: { type: 'number' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      Taxonomy: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
      OrderRequest: {
        type: 'object',
        required: ['items', 'customer'],
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          customer: { type: 'object' },
          paymentMethod: { type: 'string', enum: ['cod', 'bank', 'momo', 'card'] },
          subtotal: { type: 'number' },
          shippingFee: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' },
          voucherCode: { type: 'string' },
        },
      },
      ReviewRequest: {
        type: 'object',
        required: ['rating', 'comment'],
        properties: {
          productId: { type: 'string' },
          accessoryId: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      },
      VoucherRequest: {
        type: 'object',
        required: ['code', 'type', 'value', 'startDate', 'endDate'],
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['percent', 'fixed', 'shipping'] },
          value: { type: 'number' },
          minOrder: { type: 'number' },
          maxDiscount: { type: 'number' },
          quantity: { type: 'integer' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          active: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Request registration OTP through SMS',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 202: { description: 'OTP sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
      },
    },
    '/auth/register/request-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Request registration OTP through SMS',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
      },
    },
    '/auth/register/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify SMS phone OTP and create customer account',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpVerificationRequest' } } } },
      },
    },
    '/auth/forgot-password/request-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset OTP through SMS',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetOtpRequest' } } } },
      },
    },
    '/auth/forgot-password/reset': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP and reset password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetRequest' } } } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with phone number',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { 200: { description: 'Authenticated' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } } },
        responses: { 200: { description: 'Session refreshed' }, 401: { description: 'Invalid refresh token' } },
      },
    },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout refresh token' } },
    '/auth/me': { get: { tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Get current user' } },
    '/auth/profile': { put: { tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Update profile' } },
    '/auth/change-password': { put: { tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Change password' } },
    '/products': {
      get: { tags: ['Products'], summary: 'List products with search, filter, sort, and pagination' },
      post: { tags: ['Products'], security: [{ bearerAuth: [] }], summary: 'Create product', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogItem' } } } } },
    },
    '/products/{id}': {
      get: { tags: ['Products'], summary: 'Get product by id', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] },
      put: { tags: ['Products'], security: [{ bearerAuth: [] }], summary: 'Update product' },
      delete: { tags: ['Products'], security: [{ bearerAuth: [] }], summary: 'Soft delete product' },
    },
    '/accessories': {
      get: { tags: ['Accessories'], summary: 'List accessories' },
      post: { tags: ['Accessories'], security: [{ bearerAuth: [] }], summary: 'Create accessory' },
    },
    '/accessories/{id}': {
      get: { tags: ['Accessories'], summary: 'Get accessory by id' },
      put: { tags: ['Accessories'], security: [{ bearerAuth: [] }], summary: 'Update accessory' },
      delete: { tags: ['Accessories'], security: [{ bearerAuth: [] }], summary: 'Soft delete accessory' },
    },
    '/categories': {
      get: { tags: ['Categories'], summary: 'List categories' },
      post: { tags: ['Categories'], security: [{ bearerAuth: [] }], summary: 'Create category', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Taxonomy' } } } } },
    },
    '/categories/{id}': {
      get: { tags: ['Categories'], summary: 'Get category by id' },
      put: { tags: ['Categories'], security: [{ bearerAuth: [] }], summary: 'Update category' },
      delete: { tags: ['Categories'], security: [{ bearerAuth: [] }], summary: 'Soft delete category' },
    },
    '/brands': {
      get: { tags: ['Brands'], summary: 'List brands' },
      post: { tags: ['Brands'], security: [{ bearerAuth: [] }], summary: 'Create brand', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Taxonomy' } } } } },
    },
    '/brands/{id}': {
      get: { tags: ['Brands'], summary: 'Get brand by id' },
      put: { tags: ['Brands'], security: [{ bearerAuth: [] }], summary: 'Update brand' },
      delete: { tags: ['Brands'], security: [{ bearerAuth: [] }], summary: 'Soft delete brand' },
    },
    '/orders': {
      post: { tags: ['Orders'], summary: 'Create an authenticated or guest order', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderRequest' } } } } },
      get: { tags: ['Orders'], security: [{ bearerAuth: [] }], summary: 'List orders for current user or all orders for admin' },
    },
    '/orders/my-orders': { get: { tags: ['Orders'], security: [{ bearerAuth: [] }], summary: 'List current customer orders' } },
    '/orders/lookup': { get: { tags: ['Orders'], summary: 'Lookup order by order number and phone' } },
    '/orders/{id}': {
      get: { tags: ['Orders'], security: [{ bearerAuth: [] }], summary: 'Get order by id' },
      put: { tags: ['Orders'], security: [{ bearerAuth: [] }], summary: 'Update order' },
      delete: { tags: ['Orders'], security: [{ bearerAuth: [] }], summary: 'Soft delete order' },
    },
    '/orders/{id}/cancel': {
      put: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Cancel an order before shipping',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order cancelled' }, 400: { description: 'Order cannot be cancelled' } },
      },
    },
    '/reviews': {
      get: { tags: ['Reviews'], summary: 'List approved reviews' },
      post: { tags: ['Reviews'], security: [{ bearerAuth: [] }], summary: 'Create review', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewRequest' } } } } },
    },
    '/reviews/product/{productId}': {
      get: {
        tags: ['Reviews'],
        summary: 'List approved reviews for product',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
      },
    },
    '/reviews/accessory/{accessoryId}': {
      get: {
        tags: ['Reviews'],
        summary: 'List approved reviews for accessory',
        parameters: [{ name: 'accessoryId', in: 'path', required: true, schema: { type: 'string' } }],
      },
    },
    '/vouchers/check': { post: { tags: ['Vouchers'], summary: 'Validate voucher for cart subtotal' } },
    '/vouchers': {
      get: { tags: ['Vouchers'], security: [{ bearerAuth: [] }], summary: 'List vouchers' },
      post: { tags: ['Vouchers'], security: [{ bearerAuth: [] }], summary: 'Create voucher', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/VoucherRequest' } } } } },
    },
    '/banners': {
      get: { tags: ['Banners'], summary: 'List banners' },
      post: { tags: ['Banners'], security: [{ bearerAuth: [] }], summary: 'Create banner' },
    },
    '/contacts': {
      post: { tags: ['Contacts'], summary: 'Create contact message' },
      get: { tags: ['Contacts'], security: [{ bearerAuth: [] }], summary: 'Admin list contacts' },
    },
    '/settings': {
      get: { tags: ['Settings'], summary: 'List settings' },
      post: { tags: ['Settings'], security: [{ bearerAuth: [] }], summary: 'Create setting' },
    },
    '/admin/dashboard': { get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Dashboard statistics' } },
    '/admin/customers': { get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'List customer analytics' } },
    '/admin/orders/{id}/status': { put: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Update order status' } },
    '/admin/reviews/{id}/approve': { put: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Approve review' } },
    '/admin/reviews/{id}/reject': { put: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Reject review' } },
    '/uploads/admin': {
      post: {
        tags: ['Uploads'],
        security: [{ bearerAuth: [] }],
        summary: 'Upload an image selected in the admin area',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['adminImage'],
                properties: {
                  adminImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
    },
    '/payments/config': {
      get: { tags: ['Payments'], summary: 'List enabled payment providers' },
    },
    '/payments/vnpay/checkout': {
      post: {
        tags: ['Payments'],
        summary: 'Create an authenticated or guest order and VNPay payment URL',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderRequest' } } } },
      },
    },
    '/payments/vnpay/ipn': {
      get: { tags: ['Payments'], summary: 'Receive and verify the server-to-server VNPay IPN' },
    },
    '/payments/vnpay/return': {
      get: { tags: ['Payments'], summary: 'Verify the browser return and redirect to the storefront' },
    },
    '/seo/sitemap.xml': {
      get: { tags: ['SEO'], summary: 'Generate a sitemap for active product detail routes' },
    },
    '/uploads/products': { post: { tags: ['Uploads'], security: [{ bearerAuth: [] }], summary: 'Upload product image' } },
    '/uploads/banners': { post: { tags: ['Uploads'], security: [{ bearerAuth: [] }], summary: 'Upload banner image' } },
    '/uploads/avatar': { post: { tags: ['Uploads'], security: [{ bearerAuth: [] }], summary: 'Upload user avatar' } },
    '/uploads/reviews': {
      post: {
        tags: ['Uploads'],
        security: [{ bearerAuth: [] }],
        summary: 'Upload review image',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  reviewImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

for (const [path, pathItem] of Object.entries(swaggerDocument.paths)) {
  const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method)) continue;

    operation.responses ??= { default: { description: 'Successful response' } };
    operation.parameters ??= [];

    for (const name of pathParameters) {
      if (!operation.parameters.some((parameter) => parameter.in === 'path' && parameter.name === name)) {
        operation.parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } });
      }
    }
  }
}

module.exports = swaggerDocument;
