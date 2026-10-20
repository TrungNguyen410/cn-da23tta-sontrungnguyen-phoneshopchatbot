# Use Case Diagrams

## Customer Use Cases

```mermaid
graph LR
    Customer((👤 Customer))
    System((TechPhone<br/>Store System))
    
    Browse["🔍 Browse Products"]
    Search["🔎 Search & Filter"]
    ViewDetail["📱 View Product Details"]
    AddCart["🛒 Add to Cart"]
    ManageCart["📋 Manage Cart"]
    ApplyVoucher["🎟️ Apply Voucher"]
    Checkout["💳 Checkout"]
    CreateOrder["📦 Create Order"]
    Lookup["🔎 Lookup Order"]
    Reviews["⭐ Write Review"]
    Account["👤 Manage Account"]
    Contact["📧 Send Contact Message"]
    
    Customer -->|Browse catalog| Browse
    Customer -->|Find products| Search
    Customer -->|See details| ViewDetail
    Customer -->|Add item| AddCart
    Customer -->|Update cart| ManageCart
    Customer -->|Get discount| ApplyVoucher
    Customer -->|Go to payment| Checkout
    Customer -->|Finalize| CreateOrder
    Customer -->|Track delivery| Lookup
    Customer -->|Share feedback| Reviews
    Customer -->|Manage profile| Account
    Customer -->|Send inquiry| Contact
    
    Browse -.->|part of| System
    Search -.->|part of| System
    ViewDetail -.->|part of| System
    AddCart -.->|part of| System
    ManageCart -.->|part of| System
    ApplyVoucher -.->|part of| System
    Checkout -.->|part of| System
    CreateOrder -.->|part of| System
    Lookup -.->|part of| System
    Reviews -.->|part of| System
    Account -.->|part of| System
    Contact -.->|part of| System
```

## Admin Use Cases

```mermaid
graph LR
    Admin((👨‍💼 Admin))
    System((Admin<br/>Dashboard))
    
    Dashboard["📊 View Dashboard"]
    Stats["📈 View Statistics"]
    ManageProducts["📱 Manage Products"]
    ManageCategories["🏷️ Manage Categories"]
    ManageBrands["🏢 Manage Brands"]
    ManageOrders["📦 Manage Orders"]
    UpdateStatus["✅ Update Order Status"]
    ManageCustomers["👥 Manage Customers"]
    ManageReviews["⭐ Manage Reviews"]
    ApproveReview["👍 Approve Review"]
    ManageVouchers["🎟️ Manage Vouchers"]
    ManageBanners["🖼️ Manage Banners"]
    ManageSettings["⚙️ Manage Settings"]
    ViewContacts["📧 View Contacts"]
    
    Admin -->|See metrics| Dashboard
    Admin -->|Analyze data| Stats
    Admin -->|CRUD products| ManageProducts
    Admin -->|CRUD categories| ManageCategories
    Admin -->|CRUD brands| ManageBrands
    Admin -->|List orders| ManageOrders
    Admin -->|Change status| UpdateStatus
    Admin -->|View customers| ManageCustomers
    Admin -->|Moderate reviews| ManageReviews
    Admin -->|Approve/Reject| ApproveReview
    Admin -->|CRUD vouchers| ManageVouchers
    Admin -->|CRUD banners| ManageBanners
    Admin -->|Configure store| ManageSettings
    Admin -->|Respond to inquiries| ViewContacts
    
    Dashboard -.->|part of| System
    Stats -.->|part of| System
    ManageProducts -.->|part of| System
    ManageCategories -.->|part of| System
    ManageBrands -.->|part of| System
    ManageOrders -.->|part of| System
    UpdateStatus -.->|part of| System
    ManageCustomers -.->|part of| System
    ManageReviews -.->|part of| System
    ApproveReview -.->|part of| System
    ManageVouchers -.->|part of| System
    ManageBanners -.->|part of| System
    ManageSettings -.->|part of| System
    ViewContacts -.->|part of| System
```

## System Scenarios

### Scenario 1: Customer Product Purchase

```mermaid
graph LR
    Start["🏠 Start"] --> Search["🔍 Search iPhone"]
    Search --> Results["📱 View Results"]
    Results --> Select["Click iPhone 13"]
    Select --> Detail["📄 Product Details"]
    Detail --> AddCart["🛒 Add to Cart"]
    AddCart --> Cart["📋 View Cart"]
    Cart --> Checkout["💳 Checkout"]
    Checkout --> Voucher["🎟️ Apply Voucher"]
    Voucher --> Payment["💰 Payment Info"]
    Payment --> Submit["✅ Create Order"]
    Submit --> Success["✨ Order Created"]
    Success --> Confirm["📧 Email Confirmation"]
    Confirm --> Track["🔎 Track Order"]
    Track --> End["✓ Complete"]
    
    style Start fill:#c8e6c9
    style End fill:#ffccbc
    style Success fill:#fff9c4
    style Checkout fill:#ffe0b2
```

### Scenario 2: Admin Product Management

```mermaid
graph LR
    Start["⚙️ Admin Login"] --> Dashboard["📊 Dashboard"]
    Dashboard --> Products["📱 Products Menu"]
    Products --> List["📋 Product List"]
    List --> Action["🔘 Choose Action"]
    
    Action -->|Create| NewProduct["➕ New Product"]
    NewProduct --> FillForm["📝 Fill Details"]
    FillForm --> Upload["📸 Upload Image"]
    Upload --> Save["💾 Save"]
    
    Action -->|Update| EditProduct["✏️ Edit Product"]
    EditProduct --> FillForm
    
    Action -->|Delete| DeleteProduct["🗑️ Delete Product"]
    DeleteProduct --> Confirm["❓ Confirm"]
    Confirm --> Deleted["✓ Soft Deleted"]
    
    Save --> Success["✨ Success"]
    Deleted --> Success
    Success --> List
    List --> End["✓ Complete"]
    
    style Start fill:#c8e6c9
    style End fill:#ffccbc
    style Success fill:#fff9c4
```

### Scenario 3: Order Lookup

```mermaid
graph LR
    Start["🏠 Home"] --> Lookup["🔍 Order Lookup"]
    Lookup --> Form["📝 Enter Details"]
    Form --> Enter["Enter Order#<br/>& Phone"]
    Enter --> Query["🔎 Search"]
    Query --> Found{Found?}
    
    Found -->|Yes| Display["📦 Order Info"]
    Found -->|No| NotFound["❌ Not Found"]
    
    Display --> Status["Show Status"]
    Status --> Items["List Items"]
    Items --> End["✓ Complete"]
    
    NotFound --> TryAgain["🔄 Try Again"]
    TryAgain --> Form
    
    style Start fill:#c8e6c9
    style End fill:#ffccbc
    style Display fill:#fff9c4
    style NotFound fill:#ffccbc
```

## System Integration Points

```mermaid
graph TB
    subgraph External["External Systems"]
        PaymentGateway["💳 Payment Gateway<br/>Stripe/PayPal"]
        EmailService["📧 Email Service<br/>SendGrid/Mailgun"]
    end
    
    subgraph Frontend["Frontend Application"]
        Browser["React + Vite"]
    end
    
    subgraph Backend["Backend API"]
        AuthService["🔐 Auth Service"]
        OrderService["📦 Order Service"]
        NotificationService["🔔 Notification Service"]
    end
    
    subgraph Database["Data Layer"]
        MongoDB["🗄️ MongoDB"]
        FileStorage["📁 File Storage"]
    end
    
    Browser -->|API Calls| AuthService
    Browser -->|API Calls| OrderService
    
    OrderService -->|Process Payment| PaymentGateway
    PaymentGateway -->|Callback| OrderService
    
    OrderService -->|Send Email| NotificationService
    NotificationService -->|Send| EmailService
    
    AuthService -->|Store/Retrieve| MongoDB
    OrderService -->|Store/Retrieve| MongoDB
    NotificationService -->|Store/Retrieve| MongoDB
    
    Browser -->|Upload| FileStorage
    FileStorage -->|Retrieve| Browser
    
    style External fill:#ffccbc
    style Frontend fill:#c8e6c9
    style Backend fill:#fff9c4
    style Database fill:#f8bbd0
```
