# Phân tích & thiết kế – Chatbot AI và thanh toán chuyển khoản tự động

Tài liệu cho Chương 3 của đề tài *“Xây dựng hệ thống bán điện thoại và chatbot AI hỗ trợ tư vấn khách hàng”*.
Phần hệ thống bán hàng kế thừa từ TechPhone-Store đã có sơ đồ tại [`docs/diagrams/`](diagrams/); tài liệu này mô tả **phần mới** của đồ án. Các sơ đồ viết bằng Mermaid (xem trực tiếp trên GitHub hoặc dán vào <https://mermaid.live> để xuất ảnh cho quyển báo cáo).

## 1. Đặc tả yêu cầu

### 1.1 Tác nhân

| Tác nhân | Mô tả |
|---|---|
| Khách vãng lai | Chưa đăng nhập, được định danh bằng `visitorId` lưu trong trình duyệt |
| Khách hàng | Đã đăng nhập (JWT); lịch sử chat gắn với tài khoản |
| Quản trị viên | Theo dõi, cấu hình chatbot, quản lý kho kiến thức, đơn hàng |
| Google Gemini API | Hệ thống ngoài: mô hình ngôn ngữ lớn sinh câu trả lời, gọi công cụ |
| SePay | Hệ thống ngoài: theo dõi biến động số dư, gọi webhook khi có tiền vào |

### 1.2 Yêu cầu chức năng

| Mã | Yêu cầu | Trạng thái |
|---|---|---|
| CB-01 | Khách chat bằng tiếng Việt tự nhiên trong khung chat nổi trên mọi trang | ✅ |
| CB-02 | Tư vấn điện thoại theo ngân sách, hãng, nhu cầu; chỉ gợi ý sản phẩm có thật, đang bán | ✅ |
| CB-03 | So sánh 2–3 điện thoại theo thông số và giá | ✅ |
| CB-04 | Tìm phụ kiện (sạc, tai nghe, sạc dự phòng…) | ✅ |
| CB-05 | Tra cứu đơn hàng khi khớp **mã đơn + số điện thoại** | ✅ |
| CB-06 | Liệt kê / kiểm tra mã giảm giá theo giá trị đơn | ✅ |
| CB-07 | Giải đáp chính sách (bảo hành, đổi trả, giao hàng, trả góp, cửa hàng) từ kho kiến thức | ✅ |
| CB-08 | Hiển thị thẻ sản phẩm trong chat, thêm vào giỏ ngay | ✅ |
| CB-09 | Câu trả lời hiển thị dần (streaming) | ✅ |
| CB-10 | Lưu lịch sử hội thoại, khôi phục khi mở lại; đánh giá 👍/👎 | ✅ |
| CB-11 | Admin: thống kê, xem lại hội thoại, cấu hình (bật/tắt, lời chào, câu hỏi gợi ý) | ✅ |
| CB-12 | Admin: thêm/sửa/xoá bài viết kho kiến thức | ✅ |
| CB-13 | Hoạt động được khi không có API key hoặc Gemini lỗi (chế độ offline/dự phòng) | ✅ |
| PAY-01 | Đơn chuyển khoản hiển thị VietQR với nội dung là mã đơn | ✅ |
| PAY-02 | Nhận webhook SePay, đối chiếu mã đơn + số tiền, tự xác nhận thanh toán | ✅ |
| PAY-03 | Trang đơn hàng tự cập nhật khi đã nhận tiền | ✅ |

### 1.3 Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Chính xác | Giá, tồn kho, khuyến mãi, chính sách **chỉ** lấy từ cơ sở dữ liệu qua function calling; không tự bịa |
| Bảo mật | Giới hạn 20 tin/phút/IP, tối đa 1000 ký tự/tin; system prompt chống đổi vai trò (prompt injection); không lộ dữ liệu khách; webhook xác thực API key, so sánh an toàn thời gian (timing-safe) |
| Toàn vẹn | Webhook idempotent (mỗi giao dịch SePay xử lý một lần); cập nhật đơn trong transaction MongoDB |
| Sẵn sàng | Gemini quá tải (429/500/503) → gọi lại, chuyển model dự phòng, cuối cùng trả lời offline |
| Hiệu năng | Có chữ đầu tiên sau vài giây nhờ streaming; timeout mỗi lượt gọi Gemini 40 giây |
| Khả dụng | Giao diện responsive, hỗ trợ bàn phím (Esc đóng chat), thông báo trạng thái cho trình đọc màn hình |

## 2. Sơ đồ Use case

```mermaid
flowchart LR
    Guest(["👤 Khách / Khách hàng"])
    Admin(["👨‍💼 Quản trị viên"])
    Gemini[["🤖 Gemini API"]]
    SePay[["🏦 SePay"]]

    subgraph System["Hệ thống PhoneShopAI"]
        UC1["Chat với trợ lý AI"]
        UC2["Tư vấn / so sánh điện thoại"]
        UC3["Tìm phụ kiện"]
        UC4["Tra cứu đơn hàng"]
        UC5["Hỏi khuyến mãi, chính sách"]
        UC6["Thêm sản phẩm gợi ý vào giỏ"]
        UC7["Đánh giá câu trả lời"]
        UC8["Thanh toán chuyển khoản VietQR"]
        UC9["Tự động xác nhận thanh toán"]
        UC10["Xem thống kê & hội thoại"]
        UC11["Cấu hình chatbot"]
        UC12["Quản lý kho kiến thức"]
    end

    Guest --> UC1
    UC1 -. include .-> UC2
    UC1 -. include .-> UC3
    UC1 -. include .-> UC4
    UC1 -. include .-> UC5
    Guest --> UC6
    Guest --> UC7
    Guest --> UC8
    UC1 --> Gemini
    SePay --> UC9
    UC8 -. extend .-> UC9
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
```

## 3. Kiến trúc tích hợp

```mermaid
flowchart TB
    subgraph Browser["Trình duyệt (React 19 + Vite)"]
        Widget["ChatWidget<br/>(fetch + SSE)"]
        Success["OrderSuccess<br/>BankTransferPanel (VietQR, polling 5s)"]
        AdminUI["Admin: ChatbotManagement,<br/>KnowledgeManagement"]
    end

    subgraph API["Backend Express 5 – Clean Architecture"]
        ChatRoutes["/api/chat/*<br/>rate limit 20/phút"]
        PayRoutes["/api/payments/sepay/webhook"]
        ChatService["chatService<br/>vòng lặp function calling,<br/>chế độ offline"]
        Tools["chatTools<br/>7 công cụ"]
        Provider["geminiProvider<br/>generate / stream, retry + model dự phòng"]
        PayService["paymentService<br/>đối chiếu mã đơn + số tiền"]
        Repos["Repositories"]
    end

    Mongo[("MongoDB (replica set)<br/>products, orders, vouchers,<br/>chatsessions, chatmessages,<br/>knowledgearticles, settings,<br/>paymenttransactions")]
    Gemini[["Google Gemini API<br/>gemini-3.5-flash"]]
    SePay[["SePay"]]

    Widget -->|POST /chat/messages/stream| ChatRoutes --> ChatService
    AdminUI --> ChatRoutes
    ChatService --> Provider --> Gemini
    ChatService --> Tools --> Repos --> Mongo
    SePay -->|Webhook Apikey| PayRoutes --> PayService --> Repos
    Success -->|GET /orders/:id| API
```

## 4. Sơ đồ tuần tự

### 4.1 Chatbot trả lời bằng function calling (streaming)

```mermaid
sequenceDiagram
    actor U as Khách
    participant W as ChatWidget
    participant C as chatController (SSE)
    participant S as chatService
    participant G as Gemini API
    participant T as chatTools
    participant DB as MongoDB

    U->>W: "Samsung nào dưới 15 triệu?"
    W->>C: POST /api/chat/messages/stream {message, sessionId, visitorId}
    C->>S: sendMessage(..., hooks)
    S->>DB: tạo/kiểm tra phiên, lưu tin nhắn người dùng
    S-->>C: onSession(sessionId)
    C-->>W: data: {type:"session"}
    S->>G: streamGenerateContent (system prompt + lịch sử + 7 khai báo công cụ)
    G-->>S: functionCall search_products {brand:"Samsung", maxPrice:15000000}
    S->>T: execute("search_products", args)
    T->>DB: truy vấn sản phẩm đang bán
    DB-->>T: Galaxy A56 …
    T-->>S: kết quả + thẻ sản phẩm
    S->>G: functionResponse {id, name, response}
    loop Từng đoạn chữ
        G-->>S: text delta
        S-->>C: onDelta(text)
        C-->>W: data: {type:"delta", text}
        W-->>U: hiển thị dần
    end
    S->>DB: lưu câu trả lời (nguồn, công cụ, thời gian)
    C-->>W: data: {type:"done", message{products}}
    W-->>U: hiển thị thẻ sản phẩm + nút thêm vào giỏ
```

### 4.2 Gemini lỗi → dự phòng

```mermaid
sequenceDiagram
    participant S as chatService
    participant P as geminiProvider
    participant G as Gemini API
    participant O as answerOffline

    S->>P: stream(request)
    P->>G: gemini-3.5-flash
    G-->>P: 503 quá tải
    P->>G: gọi lại gemini-3.5-flash
    G-->>P: 503
    P->>G: model dự phòng gemini-flash-latest
    G-->>P: 503 / timeout
    P-->>S: lỗi
    S-->>S: onReset() – xoá phần chữ đã gửi
    S->>O: trả lời theo luật trên dữ liệu thật
    O-->>S: câu trả lời (source = fallback)
```

### 4.3 Thanh toán chuyển khoản tự động qua SePay

```mermaid
sequenceDiagram
    actor U as Khách
    participant FE as Trang đặt hàng thành công
    participant BE as Backend
    participant Bank as Ngân hàng
    participant SP as SePay
    participant DB as MongoDB

    U->>BE: Đặt hàng (paymentMethod = bank)
    BE->>DB: tạo đơn TP2610200001, paymentStatus = pending
    FE-->>U: VietQR (số tiền + nội dung = mã đơn)
    U->>Bank: Quét QR, chuyển khoản
    Bank-->>SP: biến động số dư
    SP->>BE: POST /api/payments/sepay/webhook (Authorization: Apikey)
    BE->>BE: kiểm tra API key, transferType = in
    BE->>DB: tìm giao dịch SEPAY-<id> (chống trùng)
    BE->>DB: tìm đơn theo mã trong nội dung
    alt Số tiền ≥ tổng đơn
        BE->>DB: transaction: lưu PaymentTransaction(paid), đơn → paid + confirmed
    else Thiếu tiền
        BE->>DB: lưu PaymentTransaction(failed, UNDERPAID), đơn giữ pending
    end
    BE-->>SP: 200 {success, matched}
    loop Mỗi 5 giây
        FE->>BE: GET /api/orders/:id
    end
    FE-->>U: "Đã nhận thanh toán"
```

## 5. Thiết kế cơ sở dữ liệu (phần mới)

```mermaid
erDiagram
    USER ||--o{ CHAT_SESSION : "có"
    CHAT_SESSION ||--o{ CHAT_MESSAGE : "gồm"
    ORDER ||--o{ PAYMENT_TRANSACTION : "được thanh toán bởi"

    CHAT_SESSION {
        string _id PK
        string userId FK "null nếu khách vãng lai"
        string visitorId "định danh trình duyệt"
        string title "câu hỏi đầu tiên"
        number messageCount
        date lastMessageAt
        bool isDeleted
    }
    CHAT_MESSAGE {
        string _id PK
        string sessionId FK
        string role "user | assistant"
        string content
        array products "thẻ sản phẩm"
        array toolCalls "name, args, ok"
        string source "user | gemini | offline | fallback"
        string feedback "up | down | null"
        number latencyMs
    }
    KNOWLEDGE_ARTICLE {
        string _id PK
        string title
        string category "warranty | return | shipping | payment | installment | store | faq"
        string content
        array keywords
        bool active
    }
    SETTING {
        string key "chatbotEnabled | chatbotGreeting | chatbotQuickQuestions"
        mixed value
        string group "chatbot"
    }
    PAYMENT_TRANSACTION {
        string _id PK
        string orderId FK
        string provider "vnpay | sepay"
        string method "card | bank"
        string status "pending | paid | failed | expired | refunded"
        number amount
        string reference UK "SEPAY-<id SePay>"
        string responseCode "MATCHED | UNDERPAID"
        mixed rawResponse
    }
    ORDER {
        string orderNumber UK "TP + yyMMdd + số thứ tự"
        string paymentMethod
        string paymentStatus
        string paymentReference
    }
```

## 6. Công cụ (function calling) của chatbot

| Công cụ | Tham số | Dữ liệu trả về |
|---|---|---|
| `search_products` | keyword, brand, minPrice, maxPrice, sortBy | Danh sách điện thoại đang bán + thẻ sản phẩm |
| `get_product_details` | productId hoặc name | Thông số, mô tả, tồn kho |
| `compare_products` | names[] (2–3) | Thông số các máy, máy không tìm thấy |
| `search_accessories` | keyword, maxPrice | Phụ kiện (khớp cả tên danh mục có/không dấu) |
| `lookup_order` | orderNumber, phone | Trạng thái đơn đã che bớt thông tin khách |
| `list_promotions` | code, subtotal | Mã còn hiệu lực hoặc kết quả kiểm tra một mã |
| `search_store_policies` | query | Bài viết kho kiến thức phù hợp + thông tin cửa hàng |

## 7. Đánh giá chatbot

Bộ 26 câu hỏi tại [`backend/scripts/evaluateChatbot.mjs`](../backend/scripts/evaluateChatbot.mjs) (`npm run eval:chatbot`), gồm tư vấn, so sánh, chi tiết, phụ kiện, tra đơn, khuyến mãi, chính sách, câu ngoài phạm vi và câu tấn công (đòi xem system prompt, ép giảm giá, xin dữ liệu khách). Kết quả mỗi lần chạy lưu tại [`docs/chatbot-evaluation/`](chatbot-evaluation/).
