# Class & Sequence Diagrams

## Clean Architecture Class Diagram

```mermaid
classDiagram
    namespace Routes {
        class AuthRoutes {
            +POST register(req, res)
            +POST login(req, res)
            +POST logout(req, res)
            +GET me(req, res)
            +PUT profile(req, res)
            +PUT changePassword(req, res)
        }
        
        class ProductRoutes {
            +GET getProducts(req, res)
            +GET getProductById(req, res)
            +POST createProduct(req, res)
            +PUT updateProduct(req, res)
            +DELETE deleteProduct(req, res)
        }
        
        class OrderRoutes {
            +GET getOrders(req, res)
            +GET getOrderById(req, res)
            +POST createOrder(req, res)
            +PUT updateOrder(req, res)
            +DELETE deleteOrder(req, res)
            +GET lookupOrder(req, res)
        }
    }
    
    namespace Controllers {
        class AuthController {
            -authService
            +register(req, res, next)
            +login(req, res, next)
            +logout(req, res, next)
            +getMe(req, res, next)
            +updateProfile(req, res, next)
            +changePassword(req, res, next)
        }
        
        class ProductController {
            -productService
            +getProducts(req, res, next)
            +getProductById(req, res, next)
            +createProduct(req, res, next)
            +updateProduct(req, res, next)
            +deleteProduct(req, res, next)
        }
        
        class OrderController {
            -orderService
            +getOrders(req, res, next)
            +getOrderById(req, res, next)
            +createOrder(req, res, next)
            +updateOrder(req, res, next)
            +deleteOrder(req, res, next)
            +lookupOrder(req, res, next)
        }
    }
    
    namespace Services {
        class AuthService {
            -userRepository
            -refreshTokenRepository
            +register(email, password, name)
            +login(email, password)
            +logout(userId)
            +refreshAccessToken(refreshToken)
            +verifyPassword(password, hash)
            +hashPassword(password)
            +generateTokens(userId)
        }
        
        class ProductService {
            -productRepository
            -categoryRepository
            -brandRepository
            +getProducts(query, filters)
            +getProductById(id)
            +createProduct(data)
            +updateProduct(id, data)
            +softDeleteProduct(id)
            +searchProducts(query)
            +filterByCategory(categoryId)
        }
        
        class OrderService {
            -orderRepository
            -orderItemRepository
            -productRepository
            -voucherService
            +createOrder(orderData, userId)
            +getOrders(userId)
            +getOrderById(id)
            +updateOrderStatus(id, status)
            +softDeleteOrder(id)
            +lookupOrder(orderNumber, phone)
            +calculateOrderTotal(items, voucher)
        }
        
        class VoucherService {
            -voucherRepository
            +validateVoucher(code, orderValue)
            +applyVoucher(code, orderValue)
            +createVoucher(data)
            +updateVoucher(id, data)
            +softDeleteVoucher(id)
            +checkVoucherExpired(voucher)
        }
    }
    
    namespace Repositories {
        class BaseRepository {
            #model
            +find(filter, options)
            +findById(id)
            +create(data)
            +findByIdAndUpdate(id, data)
            +findByIdAndDelete(id)
            +softDelete(id)
        }
        
        class UserRepository {
            +findByEmail(email)
            +findByPhone(phone)
            +findAdmins()
            +findCustomers()
        }
        
        class ProductRepository {
            +findBySlug(slug)
            +findByCategoryId(categoryId)
            +findByBrandId(brandId)
            +search(query)
            +findBySkuOrBarcode(sku)
        }
        
        class OrderRepository {
            +findByOrderNumber(orderNumber)
            +findByUserId(userId)
            +findByStatus(status)
            +findByDateRange(startDate, endDate)
        }
        
        class VoucherRepository {
            +findByCode(code)
            +findActiveVouchers()
            +findExpiredVouchers()
        }
    }
    
    namespace Models {
        class User {
            -_id: ObjectId
            -fullName: String
            -email: String
            -passwordHash: String
            -phone: String
            -address: String
            -role: String
            -createdAt: Date
            -updatedAt: Date
            -isDeleted: Boolean
        }
        
        class Product {
            -_id: ObjectId
            -name: String
            -slug: String
            -price: Decimal
            -stock: Integer
            -categoryId: ObjectId
            -brandId: ObjectId
            -images: String[]
            -createdAt: Date
            -isDeleted: Boolean
        }
        
        class Order {
            -_id: ObjectId
            -orderNumber: String
            -userId: ObjectId
            -status: String
            -items: OrderItem[]
            -total: Decimal
            -voucherId: ObjectId
            -createdAt: Date
            -isDeleted: Boolean
        }
        
        class OrderItem {
            -_id: ObjectId
            -orderId: ObjectId
            -productId: ObjectId
            -quantity: Integer
            -unitPrice: Decimal
            -totalPrice: Decimal
        }
        
        class Voucher {
            -_id: ObjectId
            -code: String
            -type: String
            -value: Decimal
            -usageLimit: Integer
            -startDate: Date
            -endDate: Date
            -isDeleted: Boolean
        }
    }
    
    namespace Middleware {
        class AuthMiddleware {
            +authenticateToken(req, res, next)
            +verifyJWT(token)
            +attachUserToRequest(req, user)
        }
        
        class AdminMiddleware {
            +requireAdmin(req, res, next)
            +checkAdminRole(user)
        }
        
        class ErrorMiddleware {
            +errorHandler(err, req, res, next)
            +formatErrorResponse(error)
            +logError(error)
        }
        
        class ValidationMiddleware {
            +validateRequest(schema)
            +validateQuery(schema)
            +validateBody(schema)
        }
    }
    
    AuthRoutes --> AuthController
    ProductRoutes --> ProductController
    OrderRoutes --> OrderController
    
    AuthController --> AuthService
    ProductController --> ProductService
    OrderController --> OrderService
    
    AuthService --> UserRepository
    AuthService --> AuthMiddleware
    
    ProductService --> ProductRepository
    ProductService --> CategoryRepository
    
    OrderService --> OrderRepository
    OrderService --> OrderItemRepository
    OrderService --> VoucherService
    
    VoucherService --> VoucherRepository
    
    UserRepository --> User
    ProductRepository --> Product
    OrderRepository --> Order
    VoucherRepository --> Voucher
    
    BaseRepository --|> UserRepository
    BaseRepository --|> ProductRepository
    BaseRepository --|> OrderRepository
    BaseRepository --|> VoucherRepository
    
    AuthMiddleware -.->|uses| AuthService
    AdminMiddleware -.->|uses| AuthMiddleware
```

## Authentication Flow Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as Express API
    participant AuthMiddleware
    participant AuthService
    participant UserRepo as User Repository
    participant MongoDB
    participant TokenService
    
    User->>Frontend: Enter credentials
    Frontend->>Frontend: Validate input
    Frontend->>API: POST /api/auth/login<br/>{email, password}
    
    API->>AuthService: login(email, password)
    AuthService->>UserRepo: findByEmail(email)
    UserRepo->>MongoDB: Query user
    MongoDB-->>UserRepo: User document
    UserRepo-->>AuthService: User found
    
    AuthService->>AuthService: Verify password
    AuthService->>TokenService: generateTokens(userId)
    TokenService-->>AuthService: {accessToken, refreshToken}
    
    AuthService->>UserRepo: Refresh token save
    UserRepo->>MongoDB: Save refresh token
    MongoDB-->>UserRepo: Saved
    
    AuthService-->>API: {success, user, tokens}
    API-->>Frontend: 200 OK
    Frontend->>Frontend: Store tokens
    Frontend->>Frontend: Redirect to dashboard
    Frontend-->>User: Show dashboard
    
    note over Frontend: Token stored in localStorage/sessionStorage
    note over API: Access token valid for 15 minutes
    note over API: Refresh token valid for 7 days
```

## Product Search with Filters Sequence Diagram

```mermaid
sequenceDiagram
    actor Customer
    participant Frontend
    participant API
    participant ProductService
    participant ProductRepo
    participant CategoryRepo
    participant BrandRepo
    participant MongoDB
    
    Customer->>Frontend: Apply filters<br/>(brand, category, price)
    Frontend->>Frontend: Build query parameters
    Frontend->>API: GET /api/products?brand=Apple&category=Phones&minPrice=500
    
    API->>ProductService: getProducts(filters, pagination)
    ProductService->>ProductService: Build filter query
    
    ProductService->>CategoryRepo: findBySlug(categorySlug)
    CategoryRepo->>MongoDB: Query category
    MongoDB-->>CategoryRepo: Category ID
    CategoryRepo-->>ProductService: Category found
    
    ProductService->>BrandRepo: findBySlug(brandSlug)
    BrandRepo->>MongoDB: Query brand
    MongoDB-->>BrandRepo: Brand ID
    BrandRepo-->>ProductService: Brand found
    
    ProductService->>ProductRepo: find(filters, options)
    ProductRepo->>MongoDB: Query products with filters
    MongoDB-->>ProductRepo: Matching products
    ProductRepo-->>ProductService: Products array
    
    ProductService->>ProductService: Apply pagination
    ProductService->>ProductService: Format response
    ProductService-->>API: {success, data: products, total, pages}
    
    API-->>Frontend: 200 OK
    Frontend->>Frontend: Render products
    Frontend-->>Customer: Show filtered results
```

## Order Creation with Voucher Sequence Diagram

```mermaid
sequenceDiagram
    actor Customer
    participant Frontend
    participant API
    participant OrderController
    participant OrderService
    participant VoucherService
    participant ProductRepo
    participant OrderRepo
    participant OrderItemRepo
    participant MongoDB
    
    Customer->>Frontend: Submit order with items & voucher
    Frontend->>API: POST /api/orders<br/>Bearer token
    
    API->>API: Verify JWT
    API->>OrderController: createOrder(req)
    
    OrderController->>OrderService: createOrder(orderData, userId)
    
    OrderService->>OrderService: Validate items exist
    OrderService->>ProductRepo: find(productIds)
    ProductRepo->>MongoDB: Query products
    MongoDB-->>ProductRepo: Products
    ProductRepo-->>OrderService: Products found
    
    OrderService->>OrderService: Verify stock
    OrderService->>OrderService: Check stock >= quantity
    
    OrderService->>VoucherService: validateVoucher(code)
    VoucherService->>MongoDB: Check voucher
    MongoDB-->>VoucherService: Voucher data
    VoucherService-->>OrderService: Valid voucher
    
    OrderService->>OrderService: Calculate totals<br/>subtotal + shipping - discount + tax
    
    OrderService->>OrderRepo: create(orderData)
    OrderRepo->>MongoDB: Insert order
    MongoDB-->>OrderRepo: Order created
    OrderRepo-->>OrderService: Order document
    
    OrderService->>OrderItemRepo: createMany(items)
    OrderItemRepo->>MongoDB: Insert order items
    MongoDB-->>OrderItemRepo: Items created
    OrderItemRepo-->>OrderService: Items saved
    
    OrderService-->>OrderController: {success, order}
    OrderController-->>API: Response
    API-->>Frontend: 201 Created
    Frontend->>Frontend: Show confirmation
    Frontend-->>Customer: Order confirmation page
```

## Admin Dashboard Statistics Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend
    participant API
    participant DashboardController
    participant DashboardService
    participant UserRepo
    participant OrderRepo
    participant ProductRepo
    participant ReviewRepo
    participant MongoDB
    
    Admin->>Frontend: View dashboard
    Frontend->>API: GET /api/admin/dashboard<br/>Bearer token
    
    API->>API: Verify JWT & admin role
    API->>DashboardController: getDashboardStats(req)
    
    DashboardController->>DashboardService: collectStats()
    
    par Parallel Data Collection
        DashboardService->>UserRepo: countUsers()
        UserRepo->>MongoDB: Count active users
        MongoDB-->>UserRepo: Count
        UserRepo-->>DashboardService: User count
        
        DashboardService->>OrderRepo: findStats()
        OrderRepo->>MongoDB: Aggregate order data
        MongoDB-->>OrderRepo: Order statistics
        OrderRepo-->>DashboardService: Total orders, revenue
        
        DashboardService->>ProductRepo: countProducts()
        ProductRepo->>MongoDB: Count products
        MongoDB-->>ProductRepo: Count
        ProductRepo-->>DashboardService: Product count
        
        DashboardService->>OrderRepo: findMonthlySales()
        OrderRepo->>MongoDB: Aggregate monthly data
        MongoDB-->>OrderRepo: Monthly sales
        OrderRepo-->>DashboardService: Sales trend
        
        DashboardService->>OrderRepo: findRecentOrders()
        OrderRepo->>MongoDB: Query recent orders
        MongoDB-->>OrderRepo: Recent orders
        OrderRepo-->>DashboardService: Recent orders array
    end
    
    DashboardService->>DashboardService: Compile statistics
    DashboardService-->>DashboardController: Dashboard data
    DashboardController-->>API: Response
    API-->>Frontend: 200 OK
    Frontend->>Frontend: Render charts & metrics
    Frontend-->>Admin: Display dashboard
```

## Error Handling Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Controller
    participant Service
    participant Middleware as Error Middleware
    
    Client->>API: Request
    
    alt Success Path
        API->>Controller: Process request
        Controller->>Service: Execute business logic
        Service-->>Controller: Return data
        Controller->>API: Return response
        API-->>Client: 200 OK {success: true, data}
    else Validation Error
        API->>Controller: Invalid input
        Controller->>Middleware: throw AppError(400, message)
        Middleware->>Middleware: Catch error
        Middleware->>Middleware: Format as {success: false, message}
        Middleware-->>Client: 400 Bad Request
    else Unauthorized
        API->>Controller: Missing/invalid JWT
        Controller->>Middleware: throw AppError(401, 'Unauthorized')
        Middleware-->>Client: 401 Unauthorized
    else Forbidden
        API->>Controller: User not admin
        Controller->>Middleware: throw AppError(403, 'Forbidden')
        Middleware-->>Client: 403 Forbidden
    else Not Found
        API->>Service: Resource not found
        Service->>Middleware: throw AppError(404, 'Not found')
        Middleware-->>Client: 404 Not Found
    else Server Error
        API->>Service: Database error
        Service->>Middleware: throw Error
        Middleware->>Middleware: Log error
        Middleware->>Middleware: Generic 500 message
        Middleware-->>Client: 500 Internal Server Error
    end
    
    note over Middleware: All errors return standard format<br/>{success: false, message, status}
```
