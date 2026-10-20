# System Architecture Diagram

## High-Level Architecture

```mermaid
flowchart TB
    User["👤 Users"]
    Browser["🌐 Web Browser"]
    CDN["📦 Static Assets"]
    FrontendApp["⚛️ React + Vite<br/>Frontend App"]
    Nginx["🔄 Nginx Reverse Proxy"]
    
    API["📡 Express REST API"]
    Auth["🔐 JWT Auth<br/>& RBAC"]
    Services["🔧 Business Logic<br/>Services"]
    Repos["📚 Data Access<br/>Repositories"]
    
    Cache["⚡ In-Memory Cache"]
    Mongo[("🗄️ MongoDB<br/>Database")]
    Files["📁 File Storage<br/>/uploads"]
    
    Swagger["📖 API Documentation<br/>Swagger UI"]
    
    User -->|Uses| Browser
    Browser -->|Fetches| CDN
    Browser -->|Displays| FrontendApp
    FrontendApp -->|HTTP/HTTPS| Nginx
    
    Nginx -->|Routes| API
    Nginx -->|Serves Static| CDN
    
    API -->|Uses| Auth
    API -->|Logs| Swagger
    Auth -->|Guard| Services
    Services -->|Query| Cache
    Services -->|Query| Repos
    Repos -->|Read/Write| Mongo
    API -->|Upload| Files
    
    style User fill:#e1f5ff
    style FrontendApp fill:#c8e6c9
    style API fill:#fff9c4
    style Auth fill:#ffccbc
    style Mongo fill:#f8bbd0
    style Nginx fill:#eeeeee
    style Swagger fill:#d1c4e9
```

## Frontend Architecture

```mermaid
flowchart LR
    subgraph Frontend["React + Vite Frontend"]
        Router["🔀 React Router<br/>Route Manager"]
        Pages["📄 Pages<br/>- Home<br/>- Products<br/>- Checkout<br/>- Admin Dashboard"]
        Components["🧩 Reusable<br/>Components"]
        Context["🎯 Context API<br/>- Auth Context<br/>- Cart Context<br/>- User Context"]
        Hooks["🎣 Custom Hooks"]
        Utils["🛠️ Utilities"]
        API["🌐 API Client<br/>- Axios Instance<br/>- Mock/Real Toggle"]
    end
    
    Router --> Pages
    Pages --> Components
    Pages --> Context
    Components --> Hooks
    Hooks --> Utils
    Hooks --> API
    Context --> API
    
    API -->|VITE_USE_MOCK=true| Mock["📦 Mock Database"]
    API -->|VITE_USE_MOCK=false| Backend["🔗 Backend API"]
    
    style Router fill:#81c784
    style Context fill:#64b5f6
    style API fill:#ffd54f
    style Mock fill:#ffab91
    style Backend fill:#ab47bc
```

## Backend Clean Architecture Layers

```mermaid
flowchart LR
    subgraph Request["1️⃣ REQUEST LAYER"]
        Routes["Routes<br/>- Validators<br/>- Route Handlers"]
    end
    
    subgraph Controller["2️⃣ CONTROLLER LAYER"]
        Ctrl["Controllers<br/>- Request Processing<br/>- Response Formatting"]
    end
    
    subgraph Service["3️⃣ SERVICE LAYER"]
        Auth["Auth Service<br/>- JWT & RBAC"]
        Business["Business Logic<br/>- Orders<br/>- Vouchers<br/>- Reviews"]
        Utils["Utilities<br/>- Email<br/>- Cache<br/>- Validation"]
    end
    
    subgraph Repository["4️⃣ REPOSITORY LAYER"]
        Base["Base Repository<br/>- CRUD Operations<br/>- Soft Delete"]
        Repos["Specialized Repos<br/>- User Repo<br/>- Product Repo<br/>- Order Repo"]
    end
    
    subgraph Database["5️⃣ DATA LAYER"]
        Models["Mongoose Models<br/>- Schemas<br/>- Validations"]
        Mongo[("MongoDB<br/>Collections")]
    end
    
    Request --> Controller
    Controller --> Service
    Service --> Repository
    Repository --> Database
    Models --> Mongo
    
    style Request fill:#bbdefb
    style Controller fill:#c8e6c9
    style Service fill:#fff9c4
    style Repository fill:#f8bbd0
    style Database fill:#d1c4e9
```

## Data Flow - Order Creation

```mermaid
sequenceDiagram
    participant Customer as Customer
    participant Frontend as React Frontend
    participant API as Express API
    participant Auth as JWT Middleware
    participant Service as Order Service
    participant Repo as Repository
    participant DB as MongoDB
    
    Customer->>Frontend: Click "Create Order"
    Frontend->>Frontend: Validate local data
    Frontend->>API: POST /api/orders<br/>(with Bearer token)
    API->>Auth: Verify JWT
    Auth-->>API: User context (role, id)
    API->>Service: createOrder(data, userId)
    Service->>Service: Validate order items
    Service->>Repo: findProducts(ids)
    Repo->>DB: Query products
    DB-->>Repo: Product data
    Repo-->>Service: Products found
    Service->>Service: Calculate totals
    Service->>Repo: createOrder(orderData)
    Repo->>DB: Save Order
    DB-->>Repo: Order created
    Service->>Repo: createOrderItems(items)
    Repo->>DB: Save OrderItems
    DB-->>Repo: Items created
    Service-->>API: { success, data: order }
    API-->>Frontend: 201 Created
    Frontend->>Frontend: Show success
    Frontend-->>Customer: Order confirmation
```

## Authentication & Authorization Flow

```mermaid
flowchart LR
    User["👤 User"]
    Register["POST /register"]
    Login["POST /login"]
    Access["🔑 Access Token<br/>(15 min)"]
    Refresh["🔄 Refresh Token<br/>(7 days)"]
    API["Protected API"]
    Middleware["JWT Middleware"]
    RBAC["Role Check<br/>- Customer<br/>- Admin"]
    Route["Route Handler"]
    
    User -->|New user| Register
    User -->|Existing user| Login
    Register -->|Create & return| Access
    Register -->|Create & store| Refresh
    Login -->|Verify credentials| Access
    Login -->|Create & store| Refresh
    
    User -->|Request| API
    Access -->|Attach header| API
    API -->|Extract JWT| Middleware
    Middleware -->|Validate| Middleware
    Middleware -->|Check role| RBAC
    RBAC -->|Allow/Deny| Route
    Route -->|Response| User
    
    style User fill:#e1f5ff
    style Access fill:#c8e6c9
    style Refresh fill:#ffe0b2
    style API fill:#fff9c4
    style Middleware fill:#ffccbc
    style RBAC fill:#f8bbd0
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ REFRESH_TOKENS : has
    
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ VOUCHERS : applies
    
    PRODUCTS ||--o{ ORDER_ITEMS : "in"
    PRODUCTS ||--o{ REVIEWS : receives
    PRODUCTS }o--|| CATEGORIES : "in"
    PRODUCTS }o--|| BRANDS : "of"
    
    ACCESSORIES ||--o{ ORDER_ITEMS : "in"
    
    CATEGORIES ||--o{ PRODUCTS : groups
    BRANDS ||--o{ PRODUCTS : makes
    
    BANNERS ||--o{ CATEGORIES : "promote"
    SETTINGS ||--o{ "VALUE" : stores
    CONTACTS ||--o{ MESSAGES : "holds"
    
    USERS {
        objectId id PK "MongoDB ObjectId"
        string fullName
        string email UK "Unique"
        string passwordHash
        string phone
        string address
        string role UK "customer or admin"
        timestamp createdAt
        timestamp updatedAt
        boolean isDeleted "Soft delete"
    }
    
    PRODUCTS {
        objectId id PK
        string name
        string slug UK
        string sku
        decimal price
        string description
        objectId categoryId FK
        objectId brandId FK
        array images "URLs"
        integer stock
        integer sold "Purchased count"
        integer ratingCount
        decimal ratingAverage
        boolean isDeleted
        timestamp createdAt
        timestamp updatedAt
    }
    
    ORDERS {
        objectId id PK
        string orderNumber UK "TP26061301"
        objectId userId FK
        string status "Pending, Confirmed, Shipping, Delivered, Cancelled"
        array items "Order Items array"
        decimal subtotal
        decimal shipping
        decimal tax
        decimal discount
        decimal total
        objectId voucherId FK
        string paymentMethod
        string paymentStatus
        string shippingAddress
        timestamp createdAt
        timestamp updatedAt
        boolean isDeleted
    }
    
    ORDER_ITEMS {
        objectId id PK
        objectId orderId FK
        objectId productId FK "Product or Accessory"
        integer quantity
        decimal unitPrice
        decimal totalPrice
        timestamp createdAt
    }
    
    VOUCHERS {
        objectId id PK
        string code UK
        string type "Percentage or Fixed"
        decimal value
        integer usageLimit
        integer usageCount
        decimal minOrderValue
        timestamp startDate
        timestamp endDate
        boolean isDeleted
        timestamp createdAt
    }
    
    REVIEWS {
        objectId id PK
        objectId productId FK
        objectId userId FK
        integer rating "1-5"
        string title
        string content
        string status "Pending or Approved"
        integer helpfulCount
        boolean isDeleted
        timestamp createdAt
        timestamp updatedAt
    }
    
    BANNERS {
        objectId id PK
        string title
        string imageUrl
        string link
        integer displayOrder
        boolean isActive
        boolean isDeleted
        timestamp createdAt
    }
    
    CATEGORIES {
        objectId id PK
        string name
        string slug UK
        string description
        string imageUrl
        integer displayOrder
        boolean isDeleted
        timestamp createdAt
    }
    
    BRANDS {
        objectId id PK
        string name
        string slug UK
        string logoUrl
        integer displayOrder
        boolean isDeleted
        timestamp createdAt
    }
    
    REFRESH_TOKENS {
        objectId id PK
        objectId userId FK
        string token
        timestamp expiresAt
        boolean isDeleted
        timestamp createdAt
    }
    
    CONTACTS {
        objectId id PK
        string name
        string email
        string phone
        string subject
        string message
        string status "New, Read, Closed"
        boolean isDeleted
        timestamp createdAt
        timestamp updatedAt
    }
    
    SETTINGS {
        objectId id PK
        string key UK
        string value
        string type "String, Number, Boolean"
        boolean isDeleted
        timestamp createdAt
        timestamp updatedAt
    }
```

## Deployment Architecture

```mermaid
flowchart TB
    Dev["💻 Development Environment"]
    Local["🐳 Docker Compose<br/>- Frontend<br/>- Backend<br/>- MongoDB"]
    
    Git["📦 Git Repository"]
    
    FrontendDeploy["🌐 Frontend Deployment"]
    Netlify["☁️ Netlify<br/>- Build: npm run build<br/>- Deploy: /dist"]
    CDN["🚀 CDN<br/>Edge Cache"]
    
    BackendDeploy["🔌 Backend Deployment"]
    Render["☁️ Render<br/>- Build: npm ci<br/>- Start: npm start<br/>- Health: /api/health"]
    
    DBDeploy["🗄️ Database Deployment"]
    Atlas["☁️ MongoDB Atlas<br/>- Managed MongoDB<br/>- Backups<br/>- Security"]
    
    Users["👥 Users"]
    
    Dev -->|git push| Git
    Git -->|Trigger| Local
    Local -->|Verify| Dev
    
    Git -->|Trigger| FrontendDeploy
    FrontendDeploy -->|Build| Netlify
    Netlify -->|Cache| CDN
    
    Git -->|Trigger| BackendDeploy
    BackendDeploy -->|Build| Render
    
    Git -->|Trigger| DBDeploy
    DBDeploy -->|Provision| Atlas
    
    CDN -->|Serve| Users
    Render -->|API| Users
    Render -->|Connect| Atlas
    
    style Dev fill:#81c784
    style Local fill:#64b5f6
    style Netlify fill:#ffb74d
    style Render fill:#ba68c8
    style Atlas fill:#f06292
    style Users fill:#4dd0e1
```

## API Gateway Pattern

```mermaid
flowchart TB
    Client["Client<br/>Frontend/Mobile"]
    Gateway["API Gateway"]
    
    subgraph Routes["Route Groups"]
        Auth["🔐 /api/auth<br/>- register<br/>- login<br/>- logout<br/>- me"]
        Products["📱 /api/products<br/>- GET /api/products<br/>- GET /api/products/:id<br/>- POST /api/products"]
        Orders["📦 /api/orders<br/>- POST /api/orders<br/>- GET /api/orders<br/>- GET /api/orders/:id"]
        Admin["⚙️ /api/admin<br/>- Dashboard<br/>- Management APIs"]
    end
    
    Middleware["Middleware Stack"]
    Logger["Morgan Logger"]
    CORS["CORS Handler"]
    Parser["JSON Parser"]
    Auth["JWT Verifier"]
    Validator["Request Validator"]
    
    Error["Error Handler"]
    
    Client -->|Request| Gateway
    Gateway -->|Route| Middleware
    Middleware -->|Log| Logger
    Middleware -->|CORS| CORS
    Middleware -->|Parse| Parser
    Middleware -->|Verify| Auth
    Middleware -->|Validate| Validator
    
    Validator -->|Success| Routes
    Routes -->|Response| Gateway
    Routes -->|Error| Error
    Error -->|Format| Gateway
    
    Gateway -->|Response| Client
    
    style Gateway fill:#fff9c4
    style Middleware fill:#e1f5ff
    style Error fill:#ffccbc
```
