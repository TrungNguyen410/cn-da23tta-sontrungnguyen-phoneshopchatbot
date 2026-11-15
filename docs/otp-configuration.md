# Cấu hình OTP qua SMS

Mã OTP qua SMS hiện **chỉ dùng cho trang Quên mật khẩu**. Số điện thoại Việt Nam được chuẩn hóa về dạng `0xxxxxxxxx`.

Trang **Đăng ký** không gửi mã nữa (gửi SMS thật đều tốn phí): khách đăng ký bằng số điện thoại + mật khẩu và đăng nhập được ngay, hoặc dùng Google/Facebook. Xem [social-login.md](social-login.md).

Email vẫn là thông tin liên hệ cho đơn hàng và hỗ trợ, không phải kênh xác minh tài khoản.

## Phát triển và demo

Khi `NODE_ENV` khác `production`, backend tạo OTP, lưu bản băm và trả thêm `debugOtp` trong response. Đây chỉ là giả lập: không có SMS nào được gửi. Frontend mock (`VITE_USE_MOCK=true`) dùng mã cố định `123456` và cũng không gọi dịch vụ bên ngoài.

Không dùng hoặc bật `debugOtp` trong production. Production không tự chuyển sang email khi SMS gặp lỗi.

## Production với Twilio

> Lưu ý: theo hướng dẫn của Twilio cho Việt Nam, từ 25/08/2025 nhà mạng chặn hẳn tin nhắn từ Sender ID chưa đăng ký. Đăng ký Sender ID cần giấy phép kinh doanh, nên SMS Twilio tới số Việt Nam gần như không đến nơi.

Production gửi SMS qua Twilio khi và chỉ khi cả ba biến sau có giá trị:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

`TWILIO_FROM` là số gửi Twilio ở dạng E.164, ví dụ `+15005550006`. Không điền thông tin thật vào `.env.example`, không commit `.env`, và không ghi log OTP, token xác thực, số điện thoại đầy đủ hoặc bí mật của nhà cung cấp.

Nếu thiếu một trong các biến này, endpoint yêu cầu OTP ở production trả lỗi an toàn `503`. Nếu Twilio hết thời gian chờ hoặc trả lỗi, backend cũng trả `503`; OTP, token và nội dung phản hồi của Twilio không bị đưa vào lỗi. Số điện thoại Việt Nam được đổi sang E.164 (`0912345678` → `+84912345678`) trước khi gửi.

OTP vẫn được băm, giới hạn số lần thử và chỉ được tiêu thụ theo các quy tắc hiện có. Mật khẩu không đổi khi việc gửi OTP thất bại.

## Chuyển dữ liệu tài khoản cũ

Chạy dry-run trước:

```powershell
cd backend
npm run migrate:phone-auth
```

Nếu báo cáo không có số sai hoặc trùng sau chuẩn hóa, mới chạy ghi dữ liệu:

```powershell
npm run migrate:phone-auth -- --write
```

Migration này chỉ giữ nguyên email cũ, chuẩn hóa số điện thoại và đánh dấu tài khoản hiện tại đã xác minh số. Nó không tạo, xóa hoặc sửa index email/phone.

Sau khi ghi dữ liệu phone thành công, kiểm tra rồi chạy migration index dành cho soft delete:

```powershell
npm run migrate:soft-delete-indexes
npm run migrate:soft-delete-indexes -- --write
```

`migrate:soft-delete-indexes` là owner duy nhất của các unique index trên User, bao gồm `user_phone_set_active_unique`, `user_email_active_unique` và `user_firebase_uid_active_unique` (index phone cũ `user_phone_active_unique` được migration bỏ đi). Nếu migration index đã chạy trước đó, có thể chạy migration phone sau mà không làm đổi index; chạy lại migration index sau cùng vẫn an toàn và idempotent.

## Kiểm tra luồng phát triển

1. Chạy backend với `NODE_ENV=development`.
2. Gọi `POST /api/auth/forgot-password/request-otp` với `identifier` là số điện thoại của một tài khoản.
3. Lấy `debugOtp` từ response hoặc toast của frontend.
4. Gửi mã đó cùng mật khẩu mới tới `POST /api/auth/forgot-password/reset`.
5. Đăng nhập lại bằng mật khẩu mới.
