# Đăng nhập bằng Google và Facebook

Khách hàng có thể đăng ký hoặc đăng nhập bằng Google hoặc Facebook ở trang **Đăng nhập** và **Đăng ký**. Việc này chạy qua Firebase Authentication. Google và Facebook đều miễn phí trên gói Spark, không cần gắn thẻ.

Đăng ký bằng số điện thoại + mật khẩu vẫn còn, nhưng **không gửi mã OTP** nữa: số điện thoại chỉ là tên đăng nhập, chưa được xác minh (`phoneVerified=false`). Admin vẫn đăng nhập bằng số điện thoại + mật khẩu.

## Luồng

1. Trang Đăng nhập/Đăng ký tải trước Firebase JS SDK. Khi khách bấm nút, popup Google hoặc Facebook mở ra (`signInWithPopup`). Popup phải mở ngay trong lần bấm, nếu không trình duyệt sẽ chặn, nên SDK được tải trước.
2. Firebase trả về một **ID token**. Phiên Firebase chỉ giữ trong bộ nhớ và được đăng xuất ngay.
3. Trình duyệt gửi `POST /api/auth/social` với `{ idToken }`.
4. Backend (`src/services/firebaseTokenVerifier.js`) kiểm tra:
   - chữ ký RS256 bằng khóa công khai của Google (có cache theo `max-age`);
   - `aud` và `iss` khớp `FIREBASE_PROJECT_ID`;
   - phương thức đăng nhập là `google.com` hoặc `facebook.com`, cách đây tối đa 15 phút.
5. Backend tìm tài khoản theo **Firebase uid** (`firebaseUid`):
   - Có rồi: kiểm tra trạng thái (bị khóa → 403) và trả phiên đăng nhập.
   - Chưa có: tạo tài khoản khách hàng mới. Lấy họ tên, email, ảnh đại diện từ token. `authProvider` là `google` hoặc `facebook`. Tài khoản này **không có số điện thoại và mật khẩu**.
6. Nếu email của Google/Facebook đã thuộc một tài khoản khác (ví dụ tài khoản số điện thoại có email trùng), backend **không tự gộp** mà trả `409`. Tự gộp theo email có thể cho người khác chiếm tài khoản.

Tài khoản Google/Facebook:
- nhập số điện thoại nhận hàng ở trang thanh toán hoặc ở **Tài khoản → Địa chỉ nhận hàng mặc định**;
- không có mục **Đổi mật khẩu** và không dùng **Quên mật khẩu**;
- không đăng nhập được bằng form số điện thoại + mật khẩu.

## Biến môi trường

| Biến | Đặt ở đâu | Giá trị |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | `.env` gốc (Docker build) và `frontend/.env` (dev) | Lấy từ khối `firebaseConfig` (Project settings → Your apps). Đây là cấu hình web công khai, nhưng vẫn để trong `.env`, không commit. |
| `FIREBASE_PROJECT_ID` | `.env` gốc (Docker) và `backend/.env` (dev) | Trùng `VITE_FIREBASE_PROJECT_ID` |

Nút Google/Facebook chỉ hiện khi `VITE_USE_MOCK=false` và có đủ `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`. Sau khi đổi các biến này, phải build lại: `docker compose up -d --build`.

## Chuyển index dữ liệu (bắt buộc một lần)

Tài khoản Google/Facebook không có số điện thoại. Index cũ `user_phone_active_unique` coi số điện thoại trống là một giá trị, nên tài khoản thứ hai không có số sẽ bị báo trùng. Index mới `user_phone_set_active_unique` chỉ áp dụng khi có số, và có thêm `user_firebase_uid_active_unique`.

Trên mỗi database đang dùng (Docker, MongoDB Atlas), chạy dry-run trước rồi ghi:

```powershell
# Docker
docker compose exec backend npm run migrate:soft-delete-indexes
docker compose exec backend npm run migrate:soft-delete-indexes -- --write

# Atlas hoặc dev: trong thư mục backend, với MONGO_URI trỏ tới database đó
npm run migrate:soft-delete-indexes -- --write
```

Migration tạo index mới trước, rồi mới bỏ index cũ. Chạy lại nhiều lần vẫn an toàn.

## Việc làm trong Firebase console và Meta for Developers

### Google

1. Firebase console → project **phoneshopai** → **Authentication → Sign-in method → Add new provider → Google**.
2. Bật **Enable**, chọn **Project support email** (email của bạn) → **Save**.

### Facebook

1. Vào https://developers.facebook.com, đăng nhập Facebook → **My Apps → Create app**.
2. Đặt tên app (ví dụ PhoneShopAI), chọn use case **Authenticate and request data from users with Facebook Login**. Không cần gắn business portfolio.
3. Trong app vừa tạo:
   - **Use cases → Authentication and account creation → Customize → Permissions**: bấm **Add** cho quyền `email`.
   - **App settings → Basic**: chép **App ID** và **App secret** (bấm Show, có thể phải nhập lại mật khẩu Facebook).
4. Firebase console → **Authentication → Sign-in method → Add new provider → Facebook** → bật **Enable**, dán **App ID** và **App secret**. Firebase hiện một **OAuth redirect URI** dạng `https://phoneshopai.firebaseapp.com/__/auth/handler`: chép nó → **Save**.
5. Quay lại Meta for Developers → **Use cases → Authentication and account creation → Customize → Settings** (Facebook Login settings) → dán URI đó vào **Valid OAuth Redirect URIs** → **Save changes**.
6. Khi app ở chế độ **Development**, chỉ tài khoản Facebook có vai trò trong app (admin, developer, tester) đăng nhập được. Để demo cho người khác:
   - thêm họ ở **App roles → Roles → Add People** (tester); hoặc
   - chuyển app sang **Live**. Meta yêu cầu Privacy Policy URL, hướng dẫn xóa dữ liệu, danh mục và icon. Có thể dùng trang chính sách của web.

Tên mục trên Meta for Developers thay đổi khá thường xuyên. Nếu không thấy đúng tên, tìm mục **Facebook Login → Settings**.

### Chung

- **Authentication → Settings → Authorized domains**: `localhost` có sẵn (dùng cho mọi cổng: 3000, 5173…). Khi deploy, thêm tên miền thật.
- **Authentication → Settings → User account linking**: để mặc định (**Link accounts that use the same email**). Khi đó nếu khách đã vào bằng Google, lần sau bấm Facebook với cùng email, Firebase báo "Email này đã đăng nhập bằng cách khác…". Khách chọn lại Google là được.
- Không còn dùng Phone sign-in. Có thể tắt **Phone** trong Sign-in method và xóa các số thử nghiệm.

## Lỗi thường gặp

| Thông báo trên trang | Nguyên nhân / cách sửa |
|---|---|
| "Firebase chưa bật cách đăng nhập này…" (`auth/operation-not-allowed`) | Chưa bật Google hoặc Facebook trong Sign-in method |
| "Tên miền này chưa được thêm vào Authorized domains…" | Thêm tên miền đang mở web vào Authorized domains |
| "Trình duyệt đã chặn cửa sổ đăng nhập…" | Cho phép popup cho trang web rồi bấm lại |
| Popup Facebook báo "URL blocked" / "Can't load URL" | Chưa thêm `https://phoneshopai.firebaseapp.com/__/auth/handler` vào Valid OAuth Redirect URIs |
| Popup Facebook báo app chưa hoạt động | App đang Development và tài khoản Facebook đó chưa có vai trò trong app |
| "Email này đã đăng nhập bằng cách khác…" | Cùng email đã dùng Google/Facebook kia; chọn đúng cách đã dùng lần đầu |
| "Email này đã gắn với một tài khoản khác…" (409 từ backend) | Email trùng với tài khoản số điện thoại có sẵn; đăng nhập bằng số điện thoại + mật khẩu |
| "Đăng nhập bằng Google/Facebook chưa được cấu hình." (503 từ backend) | Backend thiếu `FIREBASE_PROJECT_ID` |
| "Đăng nhập Google/Facebook không hợp lệ hoặc đã hết hạn…" (401) | Token sai project, quá 15 phút, hoặc không phải Google/Facebook |
| Lỗi "Dữ liệu đã tồn tại" khi tài khoản Google/Facebook thứ hai đăng nhập lần đầu | Chưa chạy migration index ở trên |
