# Xây dựng hệ thống bán điện thoại và chatbot AI hỗ trợ tư vấn khách hàng

Đồ án chuyên ngành – Khoa Công nghệ Thông tin, Trường Kỹ thuật và Công nghệ (2026).

| | |
|---|---|
| **Sinh viên** | Sơn Trung Nguyên – MSSV 110123031 – Lớp DA23TTA |
| **Email / Điện thoại** | trungnguyen550811@gmail.com / 0918550811 |
| **Giảng viên hướng dẫn** | ThS. Phạm Minh Đương |
| **Thời gian thực hiện** | 19/10/2026 – 31/12/2026 |

## Giới thiệu

Website bán điện thoại và phụ kiện, tích hợp **Chatbot AI** (Google Gemini) tư vấn khách hàng bằng ngôn ngữ tự nhiên: gợi ý máy theo ngân sách và nhu cầu, so sánh sản phẩm, tra cứu đơn hàng, giải đáp khuyến mãi và chính sách cửa hàng. Chatbot luôn lấy dữ liệu thật từ cơ sở dữ liệu qua cơ chế **function calling**, không tự bịa giá hay tồn kho.

> **Nguồn gốc mã nguồn:** phần hệ thống bán hàng (sản phẩm, giỏ hàng, đặt hàng, voucher, đánh giá, quản trị, thống kê) được **kế thừa từ dự án cá nhân [TechPhone-Store](https://github.com/TrungNguyen410/TechPhone-Store)** của sinh viên và được hoàn thiện trong đồ án này. Phần đóng góp mới của đề tài là **Chatbot AI** và **thanh toán chuyển khoản tự động**.

## Chức năng

### Kế thừa & hoàn thiện (hệ thống bán hàng)
- Khách hàng: trang chủ, tìm kiếm/lọc/sắp xếp sản phẩm, chi tiết, so sánh, giỏ hàng, voucher, đặt hàng, tra cứu đơn, đánh giá, tài khoản (đăng ký/đăng nhập JWT, OTP).
- Thanh toán: COD, chuyển khoản VietQR, MoMo, VNPay (sandbox).
- Quản trị: dashboard doanh thu, sản phẩm, phụ kiện, đơn hàng, khách hàng, đánh giá, banner, voucher, danh mục, thương hiệu, cài đặt.

### Mới trong đồ án
- **Chatbot AI tư vấn** (khung chat nổi trên mọi trang):
  - Gemini API + function calling với 7 công cụ: tìm điện thoại, chi tiết sản phẩm, so sánh máy, tìm phụ kiện, tra cứu đơn hàng, khuyến mãi, chính sách cửa hàng.
  - Thẻ sản phẩm trong khung chat, thêm vào giỏ ngay; lưu lịch sử hội thoại; đánh giá 👍/👎 từng câu trả lời.
  - **Kho kiến thức** (bảo hành, đổi trả, giao hàng, trả góp…) do admin tự cập nhật – cách “dạy” chatbot mà không cần huấn luyện lại mô hình.
  - Chế độ **offline** (trả lời theo luật trên dữ liệu thật) khi chưa có API key hoặc Gemini lỗi.
  - Bảo vệ: giới hạn 20 tin/phút/IP, tối đa 1000 ký tự, system prompt chống prompt injection, chỉ tra đơn khi khớp mã đơn + số điện thoại.
  - Trang quản trị: thống kê (số phiên, tỉ lệ hài lòng, thời gian phản hồi, công cụ hay dùng), xem lại hội thoại.
- **Thanh toán chuyển khoản tự động** qua webhook **SePay**: đơn hiển thị mã VietQR theo mã đơn; khi tiền về, hệ thống tự đối chiếu mã đơn + số tiền và chuyển đơn sang “Đã thanh toán” (chống xử lý trùng, phát hiện chuyển thiếu, đơn đã hủy → cần hoàn tiền).

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, Vite 8, React Router, Bootstrap 5, Axios, Chart.js |
| Backend | Node.js 22, Express 5, Mongoose 9 (Clean Architecture: routes → controllers → services → repositories → models) |
| Cơ sở dữ liệu | MongoDB 7 (replica set) / MongoDB Atlas |
| AI | Google Gemini API (`gemini-2.5-flash`, function calling) |
| Thanh toán | VietQR, SePay webhook, VNPay sandbox |
| Kiểm thử | Jest + Supertest + mongodb-memory-server (backend), Vitest + Testing Library (frontend) |
| Triển khai | Docker Compose, Nginx |

## Cấu trúc thư mục

```text
├── backend/            # REST API (Express + MongoDB)
│   └── src/services/   # chatService.js, chatTools.js, aiProviders/geminiProvider.js, paymentService.js ...
├── frontend/           # Giao diện React (components/chat/ChatWidget.jsx, pages/admin/ChatbotManagement.jsx ...)
├── docs/               # Tài liệu phân tích thiết kế kế thừa từ TechPhone-Store
├── progress-report/    # Báo cáo tiến độ hằng tuần
├── thesis/             # Tài liệu đồ án: doc/, pdf/, html/, abs/ (slide, video), refs/
├── setup/              # Hướng dẫn cài đặt, dữ liệu thử
├── docker/             # Tệp triển khai Docker bổ sung
└── docker-compose.yml
```

## Cài đặt và chạy

Yêu cầu: **Node.js 22**, **Docker** (hoặc MongoDB replica set / MongoDB Atlas).

### Cách 1 – Docker Compose (nhanh nhất)

```bash
cp .env.example .env          # điền JWT secret, SEED_DEMO_PASSWORD, (tuỳ chọn) GEMINI_API_KEY
docker compose up -d --build
docker compose exec backend npm run seed
```

Truy cập: website <http://localhost:3000> · API <http://localhost:5000/api> · Swagger <http://localhost:5000/api/docs>

### Cách 2 – Chạy từng phần khi phát triển

```bash
# Backend
cd backend
cp .env.example .env          # MONGO_URI phải trỏ tới MongoDB replica set
npm install
npm run seed
npm run dev                   # http://localhost:5000

# Frontend (cửa sổ khác)
cd frontend
cp .env.example .env          # VITE_USE_MOCK=false để dùng backend thật
npm install
npm run dev                   # http://localhost:5173
```

### Cách 3 – Chỉ chạy frontend bằng Docker (dữ liệu mock)

```bash
cd frontend
docker build -t duanwebdidong-frontend .
docker run -p 8080:80 duanwebdidong-frontend   # http://localhost:8080
```

### Cấu hình Chatbot AI

1. Tạo API key miễn phí tại <https://aistudio.google.com/apikey>.
2. Thêm vào `backend/.env` (hoặc `.env` gốc khi dùng Docker): `GEMINI_API_KEY=...` (tuỳ chọn `GEMINI_MODEL`).
3. Khởi động lại backend. Trang **Admin → Chatbot AI** sẽ hiện “Gemini API đang hoạt động”.

Không có key, chatbot vẫn chạy ở chế độ offline.

### Cấu hình thanh toán chuyển khoản tự động (SePay)

1. Điền thông tin tài khoản nhận tiền: `BANK_NAME`, `BANK_BIN`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`.
2. Trên SePay, tạo webhook trỏ tới `<API_PUBLIC_URL>/api/payments/sepay/webhook`, kiểu xác thực **API Key**, rồi đặt cùng giá trị vào `SEPAY_WEBHOOK_API_KEY`.
3. Khách chọn “Chuyển khoản ngân hàng” → đặt hàng → quét VietQR với nội dung là mã đơn → trang đơn hàng tự cập nhật “Đã nhận thanh toán”.

Theo phạm vi đề cương, có thể demo bằng webhook giả lập:

```bash
curl -X POST http://localhost:5000/api/payments/sepay/webhook \
  -H "Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>" -H "Content-Type: application/json" \
  -d '{"id":1001,"gateway":"Vietcombank","content":"<MA_DON> thanh toan","transferType":"in","transferAmount":<TONG_TIEN>}'
```

## Tài khoản demo (sau khi seed)

| Vai trò | Số điện thoại | Mật khẩu |
|---|---|---|
| Admin | 0900000000 | giá trị `SEED_DEMO_PASSWORD` |
| Khách hàng | 0911111111 | giá trị `SEED_DEMO_PASSWORD` |

Đơn mẫu để tra cứu: `TP260601` – số điện thoại `0911111111`. Voucher: `TECH10`, `GIAM200K`, `FREESHIP`.

## Kiểm thử

```bash
cd backend && npm test        # 251 test, gồm chat.test.js, sepay-webhook.test.js, gemini-provider.test.js
cd frontend && npm run test:run && npm run lint
```

## Tiến độ

Báo cáo tiến độ hằng tuần nằm trong thư mục [`progress-report/`](progress-report/). Công việc được quản lý theo sprint tuần trên Jira.

## Liên hệ

Sơn Trung Nguyên – trungnguyen550811@gmail.com – 0918550811
