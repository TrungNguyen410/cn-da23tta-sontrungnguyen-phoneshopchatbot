# TechPhone Store - Developer Quick Reference

## 🚀 Quick Start Commands

### Local Development (with Docker)
```bash
# Start everything
cd "d:\TechPhone Store"
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## 🧪 Testing Commands

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Watch mode
npm test -- --watch
```

## 📦 Build Commands

```bash
# Backend - production build
cd backend
npm install --omit=dev

# Frontend - production build
cd frontend
npm run build
# Output: dist/ directory
```

## 📚 API Quick Reference

### Authentication
```
POST   /api/auth/register         # Register new user
POST   /api/auth/login            # Login user
POST   /api/auth/logout           # Logout user
GET    /api/auth/me               # Get current user
PUT    /api/auth/profile          # Update profile
PUT    /api/auth/change-password  # Change password
```

### Products
```
GET    /api/products              # List all products (paginated, filterable)
GET    /api/products/:id          # Get product details
POST   /api/products              # Create product (admin only)
PUT    /api/products/:id          # Update product (admin only)
DELETE /api/products/:id          # Delete product (admin only)
```

### Orders
```
GET    /api/orders                # List user's orders
GET    /api/orders/:id            # Get order details
POST   /api/orders                # Create new order
PUT    /api/orders/:id            # Update order (admin only)
DELETE /api/orders/:id            # Delete order (admin only)
GET    /api/orders/lookup?...     # Lookup order by number & phone
```

### Reviews
```
GET    /api/reviews               # List reviews
POST   /api/reviews               # Create review
GET    /api/reviews/:id           # Get review details
PUT    /api/reviews/:id           # Update review
DELETE /api/reviews/:id           # Delete review
```

### Vouchers
```
POST   /api/vouchers/check        # Validate voucher code
GET    /api/vouchers              # List vouchers (admin)
POST   /api/vouchers              # Create voucher (admin)
PUT    /api/vouchers/:id          # Update voucher (admin)
DELETE /api/vouchers/:id          # Delete voucher (admin)
```

### Categories
```
GET    /api/categories            # List all categories
GET    /api/categories/:id        # Get category
POST   /api/categories            # Create (admin)
PUT    /api/categories/:id        # Update (admin)
DELETE /api/categories/:id        # Delete (admin)
```

### Admin Dashboard
```
GET    /api/admin/dashboard       # Dashboard statistics (admin only)
GET    /api/admin/orders          # List all orders (admin)
GET    /api/admin/users           # List all users (admin)
GET    /api/admin/reviews         # List pending reviews (admin)
PUT    /api/admin/reviews/:id/approve  # Approve review (admin)
```

### System
```
GET    /api/health                # Health check
GET    /api/docs                  # Swagger UI
```

## 🔐 Authentication Headers

```bash
# Include JWT token in Authorization header
Authorization: Bearer <access_token>

# Example curl
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:5000/api/auth/me
```

## 📊 Demo Credentials

```
Admin User:
  Phone: 0900000000
  Password: 123456

Customer User:
  Phone: 0911111111
  Password: 123456
```

## 🗄️ Database Collections

| Collection | Purpose | Count |
| --- | --- | --- |
| users | User accounts | - |
| products | Product catalog | - |
| categories | Product categories | - |
| brands | Product brands | - |
| accessories | Additional items | - |
| orders | Customer orders | - |
| orderitems | Order line items | - |
| reviews | Product reviews | - |
| vouchers | Discount codes | - |
| banners | Promotional images | - |
| contacts | Contact inquiries | - |
| settings | Store settings | - |
| refreshtokens | JWT refresh tokens | - |

## 🛠️ Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/techphone_store
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=uploads
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK=true
```

## 📁 Project Structure

```
TechPhone Store/
├── backend/
│   ├── src/
│   │   ├── config/     # Configuration
│   │   ├── controllers/# HTTP handlers
│   │   ├── services/   # Business logic
│   │   ├── repositories/# DB access
│   │   ├── models/     # Schemas
│   │   ├── middlewares/# Middleware
│   │   ├── routes/     # API routes
│   │   ├── validators/ # Request validation
│   │   └── utils/      # Helper functions
│   ├── tests/          # Test files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── api/        # API clients
│   │   ├── context/    # Context API
│   │   ├── routes/     # Route definitions
│   │   └── utils/      # Helper functions
│   └── package.json
│
├── docs/
│   ├── report/         # Software engineering report
│   ├── diagrams/       # Architecture diagrams
│   ├── scrum/          # Scrum artifacts
│   └── jira/           # Jira planning
│
└── docker-compose.yml  # Docker orchestration
```

## 🐛 Common Issues & Fixes

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
Solution: Ensure MongoDB is running
- For Docker: Check docker compose services
- For local: Start MongoDB service
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
Solution: Change PORT in .env or kill process on port 5000
```

### JWT Validation Error
```
Error: jwt malformed
Solution: Check Authorization header format: "Bearer <token>"
```

### CORS Error
```
Error: Access to XMLHttpRequest has been blocked by CORS policy
Solution: Check FRONTEND_URL matches frontend URL
```

### Module Not Found
```
Error: Cannot find module
Solution: Run npm install in the directory
```

## 📈 Performance Tips

### Frontend Optimization
- Use React.memo for expensive components
- Code splitting with React.lazy
- Debounce search inputs
- Cache API responses when appropriate

### Backend Optimization
- Use database indexes for frequent queries
- Implement caching for expensive operations
- Use pagination for large datasets
- Connection pooling configured in Mongoose

### Database Optimization
- Indexes: unique phone + optional unique email (users), productId (orders), userId (reviews)
- Aggregation pipelines for statistics
- Lean queries when projection is possible
- Batch operations when available

## 🔍 Debugging

### Backend Debugging
```bash
# Enable debug logs
DEBUG=* npm run dev

# Check what's listening on port 5000
lsof -i :5000  # On Mac/Linux

# Test API directly
curl http://localhost:5000/api/health
```

### Frontend Debugging
```bash
# React DevTools browser extension
# Vue DevTools for debugging state

# Check network tab in browser DevTools
# Check console for errors and warnings
```

### Database Debugging
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/techphone_store

# Check collections
db.getCollectionNames()

# Sample query
db.products.findOne()

# Count documents
db.orders.countDocuments()
```

## 📝 Code Style Guide

### Backend (JavaScript)
```javascript
// Async/await pattern
const getProduct = async (id) => {
  const product = await ProductRepository.findById(id);
  return successResponse(product);
};

// Error handling
try {
  // code
} catch (error) {
  throw new AppError(error.message, 400);
}

// Use const by default
const user = { name: 'John' };
```

### Frontend (React)
```javascript
// Functional components with hooks
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  return <div>{/* JSX */}</div>;
};

// Use destructuring
const { name, email } = user;
```

## 🚢 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No console errors/warnings
- [ ] Build successful (npm run build)
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Environment variables configured
- [ ] Database migrations tested

### Deployment
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Netlify
- [ ] Database connected to MongoDB Atlas
- [ ] Health checks passing
- [ ] APIs responding correctly
- [ ] Frontend loading without errors
- [ ] Authentication working

### Post-deployment
- [ ] Smoke test user flow
- [ ] Check logs for errors
- [ ] Monitor performance metrics
- [ ] Verify all endpoints working
- [ ] Test admin dashboard
- [ ] Confirm SMS OTP notifications (or the free debug OTP flow for demos)
- [ ] Document any issues

## 📚 Additional Resources

### Documentation
- [Software Engineering Report](./docs/report/software-engineering-report.md)
- [Deployment Guide](./deployment.md)
- [Architecture Diagrams](./docs/diagrams/)
- [Jira Plan](./docs/jira/jira-plan.md)

### External Links
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [JWT Intro](https://jwt.io/introduction)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [MongoDB Compass](https://www.mongodb.com/products/compass) - DB visualization
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Browser debugging
- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) - API testing in VS Code

## 🤝 Team Communication

### Sprint Planning
- Time: Every 2 weeks
- Duration: 2 hours
- Output: Sprint backlog, story point estimates

### Daily Standup
- Time: 9:00 AM
- Duration: 15 minutes
- Topics: Progress, blockers, plans

### Sprint Review
- Time: End of sprint
- Duration: 1 hour
- Output: Demo of completed work, feedback

### Retrospective
- Time: After sprint review
- Duration: 1 hour
- Output: Improvement items, action plans

---

**Last Updated:** June 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
